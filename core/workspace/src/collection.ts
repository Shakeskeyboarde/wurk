/* eslint-disable max-lines */
import path from 'node:path';

import { type JsonAccessor } from '@wurk/json';
import { type Log, log as defaultLog } from '@wurk/log';
import { Sema } from 'async-sema';

import { AbortError } from './error.js';
import { GeneratorIterable, getDepthFirstGenerator } from './generator.js';
import { select, type SelectCondition } from './select.js';
import { printStatus, StatusValue } from './status.js';
import {
  Workspace,
  type WorkspaceLink,
  type WorkspaceLinkOptions,
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
export interface WorkspaceCollectionOptions {
  readonly log?: Log;

  /**
   * The root workspace configuration (package.json).
   */
  readonly root: JsonAccessor;

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
   * Whether or not to include the root workspace in iteration.
   */
  readonly includeRootWorkspace?: boolean;

  /**
   * Maximum workspaces which may be processed in parallel using the
   * asynchronous `forEach*` methods.
   */
  readonly concurrency?: number;

  readonly gitHead?: string;
}

/**
 * Options for printing the status summary of the workspaces.
 */
export interface WorkspacePrintStatusOptions {
  /**
   * Prefix for status summary headers (eg. `${prefix} summary:`,
   * `${prefix} success`).
   */
  readonly prefix?: string;

  /**
   * Selection conditions for workspaces to include in the status summary.
   * If omitted, all workspaces will be included. If provided, selected
   * workspaces will be included, as well as any workspace with a non-skipped
   * status.
   */
  readonly condition?: SelectCondition;
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
export class WorkspaceCollection {
  readonly #log: Log;
  readonly #workspaces: readonly Workspace[];
  readonly #dependencyLinks: ReadonlyMap<Workspace, readonly WorkspaceLink[]>;
  readonly #dependentLinks: ReadonlyMap<Workspace, readonly WorkspaceLink[]>;

  #includeDependencies: boolean = false;
  #includeDependents: boolean = false;

  /**
   * The root workspace.
   */
  readonly root: Workspace;

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
  constructor(options: WorkspaceCollectionOptions) {
    this.#log = options.log ?? defaultLog;

    const workspaces: Workspace[] = (this.#workspaces = []);
    const dependencyLinks = (this.#dependencyLinks = new Map<
      Workspace,
      WorkspaceLink[]
    >());
    const dependentLinks = (this.#dependentLinks = new Map<
      Workspace,
      WorkspaceLink[]
    >());
    const root: Workspace = new Workspace({
      dir: options.rootDir,
      config: options.root,
      gitHead: options.gitHead,
      getDependencyLinks: (linkOptions) => {
        return this.getDependencyLinks(root, linkOptions);
      },
      getDependentLinks: (linkOptions) => {
        return this.getDependentLinks(root, linkOptions);
      },
    });

    if (options.includeRootWorkspace) {
      workspaces.push(root);
    }

    options.workspaces?.forEach(([dir, config]) => {
      const workspace: Workspace = new Workspace({
        dir,
        relativeDir: path.relative(root.dir, dir),
        config,
        gitHead: options.gitHead,
        getDependencyLinks: (linkOptions) => {
          return this.getDependencyLinks(workspace, linkOptions);
        },
        getDependentLinks: (linkOptions) => {
          return this.getDependentLinks(workspace, linkOptions);
        },
      });

      workspaces.push(workspace);
    });

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
          .map(([id, spec]) => ({ dependent, type, id, spec }))
          .filter(
            (entry): entry is typeof entry & { spec: string } =>
              typeof entry.spec === 'string',
          );
      })
      .map(({ dependent, type, id, spec }) => {
        const match = spec.match(/^npm:((?:@[^@]+\/)?[^@]+)(?:@(.+))?/u);

        return match
          ? {
              dependent,
              type,
              id,
              name: match[1]!,
              versionRange: match[2] ?? '*',
            }
          : {
              dependent,
              type,
              id: id,
              name: id,
              versionRange: spec,
            };
      })
      .flatMap(({ dependent, type, id, name, versionRange }) => {
        return workspaces
          .filter((workspace) => workspace.name === name)
          .map((dependency) => ({
            dependent,
            dependency,
            type,
            id,
            versionRange,
          }));
      })
      .forEach(({ dependent, dependency, type, id, versionRange }) => {
        dependencyLinks.set(dependent, [
          ...(dependencyLinks.get(dependent) ?? []),
          { dependent, dependency, type, id, versionRange },
        ]);
        dependentLinks.set(dependency, [
          ...(dependentLinks.get(dependency) ?? []),
          { dependent, dependency, type, id, versionRange },
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

    this.root = root;
    this.concurrency = getSafeConcurrency(options.concurrency);
    this.all = new GeneratorIterable(() =>
      getDepthFirstGenerator(this.#workspaces, (current) => {
        return this.#dependencyLinks
          .get(current)
          ?.map((link) => link.dependency);
      }),
    );
  }

  *[Symbol.iterator](): Iterator<Workspace> {
    for (const workspace of this.all) {
      if (
        workspace.isSelected !== false &&
        (workspace.isSelected ||
          (this.#includeDependencies && workspace.isDependencyOfSelected) ||
          (this.#includeDependents && workspace.isDependentOfSelected))
      ) {
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
   * Select workspaces by name, privacy, keyword, directory, or predicate
   * function.
   *
   * - Use `private:true` or `private:false` to select private or public workspaces.
   * - Use `keyword:<pattern>` to select workspaces by keyword (glob supported).
   * - Use `dir:<pattern>` to select workspaces by directory (glob supported).
   * - Use `name:<pattern>` or just `<pattern>` to select workspaces by name (glob supported).
   * - Prefix any query with `not:` to exclude instead of include.
   * - Use a leading ellipsis to (eg. `...<query>`) to also match dependencies.
   * - Use a trailing ellipsis to (eg. `<query>...`) to also match dependents.
   *
   * Glob patterns are supported via the
   * [minimatch](https://www.npmjs.com/package/minimatch) package.
   */
  select(condition: SelectCondition): void {
    select(this.all, condition).forEach((isSelected, workspace) => {
      workspace.isSelected = isSelected;
    });
  }

  /**
   * Include workspaces in iteration that are dependencies of selected
   * workspaces, as long as the dependency is not _explicitly_ excluded.
   */
  includeDependencies(enabled = true): void {
    this.#includeDependencies = enabled;
  }

  /**
   * Include workspaces in iteration that are dependents of selected
   * workspaces, as long as the dependency is not _explicitly_ excluded.
   */
  includeDependents(enabled = true): void {
    this.#includeDependents = enabled;
  }

  /**
   * Iterate over selected workspaces in parallel, ensuring that each
   * workspace's local (selected) dependencies are processed before the
   * workspace itself.
   */
  async forEach(
    callback: WorkspaceCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._forEachAsync(callback, { signal });
  }

  /**
   * Iterate over selected workspaces in parallel, without regard for
   * interdependency.
   */
  async forEachIndependent(
    callback: WorkspaceCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._forEachAsync(callback, { signal, independent: true });
  }

  /**
   * Iterate over selected workspaces sequentially (ie. one at a time,
   * serially, non-parallel).
   */
  async forEachSequential(
    callback: WorkspaceCallback,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._forEachAsync(callback, { signal, concurrency: 1 });
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
      links = Array.from(
        getDepthFirstGenerator(
          links,
          (current) => this.#dependencyLinks.get(current.dependency),
          options?.filter,
        ),
      );
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
      links = Array.from(
        getDepthFirstGenerator(
          links,
          (current) => this.#dependentLinks.get(current.dependent),
          options?.filter,
        ),
      );
    }

    return links;
  }

  /**
   * Print a status summary for the workspaces.
   */
  printStatus(options?: WorkspacePrintStatusOptions): void {
    let workspaces: Iterable<Workspace>;

    if (options?.condition) {
      const selected = select(this.all, options.condition);

      workspaces = Array.from(this.all).filter((workspace) => {
        return (
          workspace.status.value !== StatusValue.skipped ||
          selected.get(workspace)
        );
      });
    } else {
      workspaces = this.all;
    }

    printStatus(this.#log, workspaces, options?.prefix);
  }

  protected async _forEachAsync(
    callback: WorkspaceCallback,
    options: {
      signal?: AbortSignal;
      concurrency?: number;
      independent?: boolean;
    } = {},
  ): Promise<void> {
    const {
      signal: outerSignal,
      concurrency = this.concurrency,
      independent = false,
    } = options;

    if (outerSignal?.aborted) return;

    const abortController = new AbortController();
    const { signal } = abortController;
    const promises = new Map<Workspace, Promise<void>>();
    const semaphore = new Sema(getSafeConcurrency(concurrency));

    outerSignal?.addEventListener('abort', () => abortController.abort(), {
      once: true,
    });

    for (const workspace of this) {
      const { log, status } = workspace;

      const abort = (reason?: any): void => {
        if (reason) log.error(reason);
        abortController.abort(reason);
      };

      const promise = (async () => {
        if (!independent) {
          await Promise.all(
            this.getDependencyLinks(workspace).map((link) => {
              return promises.get(link.dependency);
            }),
          );
        }

        await semaphore.acquire();

        try {
          if (signal.aborted) return;
          await callback(workspace, signal, abort);
        } catch (error) {
          status.set(StatusValue.failure);
          abort(error);
        } finally {
          semaphore.release();
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

const getSafeConcurrency = (value: number | undefined): number => {
  return Math.min(Math.max(1, Math.trunc(Number(value) || 0)), 100);
};
