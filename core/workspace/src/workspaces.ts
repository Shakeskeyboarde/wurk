import nodeOs from 'node:os';
import nodePath from 'node:path';
import nodeProcess from 'node:process';

import { type JsonAccessor } from '@wurk/json';
import { Sema } from 'async-sema';

import { AbortError } from './error.js';
import { filter } from './filter.js';
import { GeneratorIterable, getDepthFirstGenerator } from './generator.js';
import { getLinks } from './link.js';
import { Workspace, type WorkspacePublished } from './workspace.js';

/**
 * Workspace collection `forEach*` asynchronous callback.
 */
export type WorkspaceCallback = (
  workspace: Workspace,
  signal: AbortSignal,
  abort: (reason?: any) => void,
) => Promise<void>;

/**
 * Workspace collection options.
 */
export interface WorkspacesOptions {
  /**
   * The directory of the root workspace.
   */
  readonly rootDir: string;

  /**
   * Array of workspaces as tuples of directory and configuration (package.json).
   */
  readonly workspaceEntries?: readonly (readonly [dir: string, config: JsonAccessor])[];

  /**
   * Maximum workspaces which may be processed simultaneously using the
   * asynchronous `forEachStream()` method. Also affects the `forEach()`
   * method if the `defaultIterationMethod` option is set to `forEachStream`.
   */
  readonly concurrency?: number;

  /**
   * Default iteration method.
   */
  readonly defaultIterationMethod?:
    | 'forEachParallel'
    | 'forEachStream'
    | 'forEachSequential';

  /**
   * Determine if a workspace version is published or not.
   */
  readonly getPublished?: (name: string, version: string) => Promise<WorkspacePublished | null>;
}

/**
 * An collection of workspaces with methods for selecting and iterating.
 *
 * the `forEach*` methods and collection iterator only iterate over selected
 * workspaces.
 *
 * The `all` property is an iterable which includes all workspaces, regardless
 * of selection status.
 */
export class Workspaces {
  /**
   * Number of workspaces in the collection.
   */
  readonly size: number;

  /**
   * Maximum workspaces which may be processed in parallel using the
   * asynchronous `forEach*` methods.
   */
  readonly concurrency: number;

  /**
   * All workspaces in the collection, regardless of selection status.
   */
  readonly all: Iterable<Workspace>;

  /**
   * Create a new workspace collection.
   */
  constructor(options: WorkspacesOptions) {
    const { workspaceEntries = [], rootDir, concurrency, defaultIterationMethod, getPublished } = options;

    const workspaces = workspaceEntries
      .map(([workspaceDir, config]) => {
        const dir = nodePath.resolve(rootDir, workspaceDir);
        const relativeDir = nodePath.relative(rootDir, dir);
        const workspace: Workspace = new Workspace({
          dir,
          relativeDir,
          config,
          getDependencyLinks: (linkOptions) => {
            return links.getLinksFromDependentToDependencies(workspace, linkOptions);
          },
          getDependentLinks: (linkOptions) => {
            return links.getLinksFromDependencyToDependents(workspace, linkOptions);
          },
          getPublished: async () => {
            return workspace.version && getPublished
              ? await getPublished(workspace.name, workspace.version)
              : null;
          },
        });

        return workspace;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const links = getLinks(workspaces);

    this.size = workspaces.length;
    this.concurrency = concurrency ?? nodeOs.cpus().length + 1;
    this.all = new GeneratorIterable(() => getDepthFirstGenerator(workspaces, (dependent) => {
      return dependent
        .getDependencyLinks()
        .map((link) => link.dependency);
    }));

    if (defaultIterationMethod) {
      this.forEach = this[defaultIterationMethod];
    }
  }

  *[Symbol.iterator](): Iterator<Workspace> {
    for (const workspace of this.all) {
      if (workspace.isSelected) {
        yield workspace;
      }
    }
  }

  /**
   * Number of workspaces which will be included in iteration. This respects
   * workspace selection and the inclusion of dependencies and dependents.
   */
  get selectedSize(): number {
    return Array.from(this).length;
  }

  /**
   * Include workspaces by name, directory, keyword, or other characteristics.
   *
   * Expressions:
   * - `<name>`: Select workspaces by name (glob supported).
   * - `/path`: Select workspaces by path relative to the root workspace (glob supported).
   * - `#<keywords>`: Select workspaces which contain all keywords (csv).
   * - `@private`: Select private workspaces.
   * - `@public`: Select public (non-private) workspaces.
   * - `@published`: Select workspaces which are published to an NPM registry.
   * - `@unpublished`: Select workspaces which are not published to an NPM registry.
   * - `@dependency`: Select workspaces which are depended on by currently selected workspaces.
   * - `@dependent`: Select workspaces which depend on currently selected workspaces.
   *
   * Glob patterns are supported via the
   * [minimatch](https://www.npmjs.com/package/minimatch) package.
   */
  async include(expression: string): Promise<void> {
    const unselected = Array.from(this.all)
      .filter((workspace) => !workspace.isSelected);
    const matched = await filter(unselected, expression);

    matched.forEach((workspace) => workspace.isSelected = true);
  }

  /**
   * Exclude workspaces by name, directory, keyword, or other characteristics.
   *
   * See the {@link include} method for expression syntax.
   */
  async exclude(expression: string): Promise<void> {
    const selected = Array.from(this.all)
      .filter((workspace) => workspace.isSelected);
    const matched = await filter(selected, expression);

    matched.forEach((workspace) => workspace.isSelected = false);
  }

  /**
   * Iterate over selected workspaces. This method will behave like one of
   * the other `forEach*` methods, depending on the collection configuration.
   */
  async forEach(
    callback: WorkspaceCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.forEachSequential(callback, signal);
  }

  /**
   * Iterate over selected workspaces in parallel, without regard for
   * topology or concurrency limits.
   */
  async forEachParallel(
    callback: WorkspaceCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._forEachAsync({ signal, stream: false, concurrency: -1, callback });
  }

  /**
   * Iterate over selected workspaces in parallel, with topological awaiting
   * and concurrency limits.
   */
  async forEachStream(
    callback: WorkspaceCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._forEachAsync({ signal, stream: true, concurrency: this.concurrency, callback });
  }

  /**
   * Iterate over selected workspaces sequentially, without any concurrency.
   */
  async forEachSequential(
    callback: WorkspaceCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._forEachAsync({ signal, stream: false, concurrency: 1, callback });
  }

  /**
   * Synchronously iterate over selected workspaces.
   */
  forEachSync(callback: (workspace: Workspace) => void): void {
    for (const workspace of this) {
      callback(workspace);
    }
  }

  protected async _forEachAsync(options: {
    signal: AbortSignal | undefined;
    stream: boolean;
    concurrency: number;
    callback: WorkspaceCallback;
  }): Promise<void> {
    if (options.signal?.aborted) return;

    const abortController = new AbortController();
    const { signal } = abortController;
    const promises = new Map<Workspace, Promise<void>>();
    const semaphore = options.concurrency < 0 || Number.isNaN(options.concurrency)
      ? null
      : new Sema(options.concurrency);

    options.signal?.addEventListener('abort', () => abortController.abort(), {
      once: true,
    });

    for (const workspace of this) {
      const { log } = workspace;

      const abort = (reason?: unknown): void => {
        log.error({ message: reason });
        abortController.abort(reason);
      };

      await semaphore?.acquire();

      const promise = new Promise<void>((resolve) => nodeProcess.nextTick(resolve))
        .then(async () => {
          if (options.stream) {
            const links = workspace.getDependencyLinks({ recursive: true });
            const linkPromises = links.map((link) => promises.get(link.dependency));

            await Promise.all(linkPromises);
          }

          if (signal.aborted) return;

          await options.callback(workspace, signal, abort);
        })
        .finally(() => semaphore?.release())
        .catch(abort);

      promises.set(workspace, promise);
    }

    await Promise.all(promises.values());

    if (signal.aborted) {
      throw new AbortError(signal.reason);
    }
  }
}
