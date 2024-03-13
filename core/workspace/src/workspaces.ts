/* eslint-disable max-lines */
import nodeOs from 'node:os';
import nodePath from 'node:path';

import { type JsonAccessor } from '@wurk/json';
import { Sema } from 'async-sema';

import { AbortError } from './error.js';
import { filter } from './filter.js';
import { GeneratorIterable, getDepthFirstGenerator } from './generator.js';
import { getSpec } from './spec.js';
import {
  Workspace,
  type WorkspaceLink,
  type WorkspaceLinkOptions,
  type WorkspacePublished,
} from './workspace.js';

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
   * Array of workspace directories and configurations (package.json files).
   */
  readonly workspaces?: readonly (readonly [
    dir: string,
    config: JsonAccessor,
  ])[];

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
 * workspaces by default. If the `includeDependencies` or `includeDependents`
 * options are set, then iteration will include dependency/dependent workspaces
 * that are not explicitly excluded.
 *
 * The root workspace may not be included in iteration if the
 * `includeRootWorkspace` was not set when the collection was constructed. But,
 * the root workspace can always be accessed via the `root` property.
 *
 * The `all` property is an iterable which includes all workspaces (may not
 * included the root workspace), regardless of selection status.
 */
export class Workspaces {
  readonly #workspaces: readonly Workspace[];
  readonly #dependencyLinks: ReadonlyMap<Workspace, readonly WorkspaceLink[]>;
  readonly #dependentLinks: ReadonlyMap<Workspace, readonly WorkspaceLink[]>;

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
    const workspaces: Workspace[] = (this.#workspaces = []);
    const dependencyLinks = (this.#dependencyLinks = new Map<
      Workspace,
      WorkspaceLink[]
    >());
    const dependentLinks = (this.#dependentLinks = new Map<
      Workspace,
      WorkspaceLink[]
    >());

    for (const [workspaceDir, config] of options.workspaces ?? []) {
      const dir = nodePath.resolve(options.rootDir, workspaceDir);
      const relativeDir = nodePath.relative(options.rootDir, dir);
      const workspace: Workspace = new Workspace({
        dir,
        relativeDir,
        config,
        getDependencyLinks: (linkOptions) => {
          return this.getDependencyLinks(workspace, linkOptions);
        },
        getDependentLinks: (linkOptions) => {
          return this.getDependentLinks(workspace, linkOptions);
        },
        getPublished: async () => {
          return workspace.version && options.getPublished
            ? await options.getPublished(workspace.name, workspace.version)
            : null;
        },
      });

      workspaces.push(workspace);
    }

    Array.from(workspaces.values())
      .flatMap((dependent) => {
        return [
          [dependent, 'devDependencies'],
          [dependent, 'dependencies'],
          [dependent, 'peerDependencies'],
          [dependent, 'optionalDependencies'],
        ] as const;
      })
      .flatMap(([dependent, type]) => {
        return dependent.config
          .at(type)
          .entries('object')
          .map(([id, specString]) => ({ dependent, type, id, specString }))
          .filter((entry): entry is typeof entry & { specString: string } => {
            return typeof entry.specString === 'string';
          });
      })
      .flatMap(({ dependent, type, id, specString }) => {
        const spec = getSpec(id, specString);
        const name = spec.type === 'npm' ? spec.name : id;

        return workspaces
          .filter((workspace) => workspace.name === name)
          .map((dependency) => ({
            dependent,
            dependency,
            type,
            id,
            spec: { ...spec },
          }));
      })
      .forEach(({ dependent, dependency, type, id, spec }) => {
        dependencyLinks.set(dependent, [
          ...(dependencyLinks.get(dependent) ?? []),
          { dependent, dependency, type, id, spec },
        ]);
        dependentLinks.set(dependency, [
          ...(dependentLinks.get(dependency) ?? []),
          { dependent, dependency, type, id, spec },
        ]);
      });

    workspaces.sort((a, b) => a.name.localeCompare(b.name));
    dependencyLinks.forEach((links) => {
      return links.sort((a, b) => {
        return a.dependency.name.localeCompare(b.dependency.name);
      });
    });
    dependentLinks.forEach((links) => {
      return links.sort((a, b) => {
        return a.dependent.name.localeCompare(b.dependent.name);
      });
    });

    this.concurrency = options.concurrency ?? nodeOs.cpus().length + 1;
    this.all = new GeneratorIterable(() => getDepthFirstGenerator(this.#workspaces, (current) => {
      return this.#dependencyLinks
        .get(current)
        ?.map((link) => link.dependency);
    }));

    if (options.defaultIterationMethod) {
      this.forEach = this[options.defaultIterationMethod];
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
   * Number of workspaces in the collection. This may not include the root
   * workspace if the `includeRootWorkspace` option was not set. This is not
   * affected by workspace selection.
   */
  get size(): number {
    return this.#workspaces.length;
  }

  /**
   * Number of workspaces which will be included in iteration. This respects
   * workspace selection and the inclusion of dependencies and dependents.
   */
  get iterableSize(): number {
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
    await this._forEachAsync(callback, {
      signal,
      stream: false,
      concurrency: -1,
    });
  }

  /**
   * Iterate over selected workspaces in parallel, with topological awaiting
   * and concurrency limits.
   */
  async forEachStream(
    callback: WorkspaceCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._forEachAsync(callback, {
      signal,
      stream: true,
      concurrency: this.concurrency,
    });
  }

  /**
   * Iterate over selected workspaces sequentially, without any concurrency.
   */
  async forEachSequential(
    callback: WorkspaceCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._forEachAsync(callback, {
      signal,
      stream: false,
      concurrency: 1,
    });
  }

  /**
   * Synchronously iterate over selected workspaces.
   */
  forEachSync(callback: (workspace: Workspace) => void): void {
    for (const workspace of this) {
      callback(workspace);
    }
  }

  /**
   * Get dependency links for a workspace. This includes links to workspaces
   * which are not selected, even if they are explicitly excluded.
   */
  getDependencyLinks(
    workspace: Workspace,
    options?: WorkspaceLinkOptions,
  ): readonly WorkspaceLink[] {
    let links = this.#dependencyLinks.get(workspace) ?? [];

    if (options?.recursive) {
      links = Array.from(getDepthFirstGenerator(
        links,
        (current) => this.#dependencyLinks.get(current.dependency),
        options?.filter,
      ));
    }

    return links;
  }

  /**
   * Get dependent links for a workspace. This includes links to workspaces
   * which are not selected, even if they are explicitly excluded.
   */
  getDependentLinks(
    workspace: Workspace,
    options?: WorkspaceLinkOptions,
  ): readonly WorkspaceLink[] {
    let links = this.#dependentLinks.get(workspace) ?? [];

    if (options?.recursive) {
      links = Array.from(getDepthFirstGenerator(
        links,
        (current) => this.#dependentLinks.get(current.dependent),
        options?.filter,
      ));
    }

    return links;
  }

  protected async _forEachAsync(
    callback: WorkspaceCallback,
    options: {
      readonly signal: AbortSignal | undefined;
      readonly concurrency: number;
      readonly stream: boolean;
    },
  ): Promise<void> {
    const { signal: outerSignal, concurrency, stream } = options;

    if (outerSignal?.aborted) return;

    const abortController = new AbortController();
    const { signal } = abortController;
    const promises = new Map<Workspace, Promise<void>>();
    const semaphore = concurrency < 0 || Number.isNaN(concurrency)
      ? null
      : new Sema(concurrency);

    outerSignal?.addEventListener('abort', () => abortController.abort(), {
      once: true,
    });

    for (const workspace of this) {
      const { log } = workspace;

      const abort = (reason?: unknown): void => {
        log.error({ message: reason });
        abortController.abort(reason);
      };

      const promise = (async () => {
        await semaphore?.acquire();

        try {
          if (stream) {
            const links = this.getDependencyLinks(workspace, {
              recursive: true,
            });
            const linkPromises = links.map((link) => {
              return promises.get(link.dependency);
            });

            await Promise.all(linkPromises);
          }

          if (signal.aborted) return;

          await callback(workspace, signal, abort);
        }
        catch (error) {
          abort(error);
        }
        finally {
          semaphore?.release();
        }
      })();

      promises.set(workspace, promise);
    }

    await Promise.all(promises.values());

    if (signal.aborted) {
      throw new AbortError(signal.reason);
    }
  }
}
