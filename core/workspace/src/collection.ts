/* eslint-disable max-lines */
import path from 'node:path';

import { type JsonAccessor } from '@wurk/json';
import { type Log, log as defaultLog } from '@wurk/log';
import { Sema } from 'async-sema';

import { AbortError } from './error.js';
import { GeneratorIterable, getDepthFirstGenerator } from './generator.js';
import { select, type SelectCondition } from './select.js';
import { printStatus, StatusValue } from './status.js';
import { Workspace, type WorkspaceLink, type WorkspaceLinkOptions } from './workspace.js';

export type WorkspaceCallback = (
  workspace: Workspace,
  signal: AbortSignal,
  abort: (reason?: any) => void,
) => Promise<void>;

export interface WorkspaceCollectionOptions {
  readonly log?: Log;
  readonly root: JsonAccessor;
  readonly rootDir: string;
  readonly workspaces?: readonly (readonly [dir: string, config: JsonAccessor])[];
  readonly includeRootWorkspace?: boolean;
  readonly concurrency?: number;
  readonly npmHead?: string;
}

export interface WorkspacePrintStatusOptions {
  readonly prefix?: string;
  readonly condition?: SelectCondition;
}

export class WorkspaceCollection {
  readonly #log: Log;
  readonly #workspaces: readonly Workspace[];
  readonly #dependencyLinks: ReadonlyMap<Workspace, readonly WorkspaceLink[]>;
  readonly #dependentLinks: ReadonlyMap<Workspace, readonly WorkspaceLink[]>;

  #includeUnselected = false;
  #includeDependencies = false;
  #includeDependents = false;

  readonly root: Workspace;
  readonly concurrency: number;
  readonly all: Iterable<Workspace>;

  constructor(options: WorkspaceCollectionOptions) {
    this.#log = options.log ?? defaultLog;

    const workspaces: Workspace[] = (this.#workspaces = []);
    const dependencyLinks = (this.#dependencyLinks = new Map<Workspace, WorkspaceLink[]>());
    const dependentLinks = (this.#dependentLinks = new Map<Workspace, WorkspaceLink[]>());
    const root: Workspace = new Workspace({
      dir: options.rootDir,
      relativeDir: '',
      config: options.root,
      isRoot: true,
      npmHead: options.npmHead,
      getDependencyLinks: (linkOptions) => this.getDependencyLinks(root, linkOptions),
      getDependentLinks: (linkOptions) => this.getDependentLinks(root, linkOptions),
    });

    if (options.includeRootWorkspace) {
      workspaces.push(root);
    }

    options.workspaces?.forEach(([dir, config]) => {
      const workspace: Workspace = new Workspace({
        dir,
        relativeDir: path.relative(root.dir, dir),
        config,
        isRoot: false,
        npmHead: options.npmHead,
        getDependencyLinks: (linkOptions) => this.getDependencyLinks(workspace, linkOptions),
        getDependentLinks: (linkOptions) => this.getDependentLinks(workspace, linkOptions),
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
      .flatMap(([dependent, scope]) => {
        return dependent.config
          .at(scope)
          .entries('object')
          .map(([id, spec]) => ({ dependent, scope, id, spec }))
          .filter((entry): entry is typeof entry & { spec: string } => typeof entry.spec === 'string');
      })
      .map(({ dependent, scope, id, spec }) => {
        const match = spec.match(/^npm:((?:@[^@]+\/)?[^@]+)(?:@(.+))?/u);

        return match
          ? { dependent, scope, id, name: match[1]!, versionRange: match[2] ?? '*' }
          : { dependent, scope, id: id, name: id, versionRange: spec };
      })
      .flatMap(({ dependent, scope, id, name, versionRange }) => {
        return workspaces
          .filter((workspace) => workspace.name === name)
          .map((dependency) => ({ dependent, dependency, scope, id, versionRange }));
      })
      .forEach(({ dependent, dependency, scope, id, versionRange }) => {
        dependencyLinks.set(dependent, [
          ...(dependencyLinks.get(dependent) ?? []),
          { dependent, dependency, scope, id, versionRange },
        ]);
        dependentLinks.set(dependency, [
          ...(dependentLinks.get(dependency) ?? []),
          { dependent, dependency, scope, id, versionRange },
        ]);
      });

    workspaces.sort((a, b) => a.name.localeCompare(b.name));
    dependencyLinks.forEach((links) => links.sort((a, b) => a.dependency.name.localeCompare(b.dependency.name)));
    dependentLinks.forEach((links) => links.sort((a, b) => a.dependent.name.localeCompare(b.dependent.name)));

    this.root = root;
    this.concurrency = getSafeConcurrency(options.concurrency);
    this.all = new GeneratorIterable(() =>
      getDepthFirstGenerator(this.#workspaces, (current) => {
        return this.#dependencyLinks.get(current)?.map((link) => link.dependency);
      }),
    );
  }

  *[Symbol.iterator](): Iterator<Workspace> {
    for (const workspace of this.all) {
      if (
        this.#includeUnselected ||
        workspace.isSelected ||
        (this.#includeDependencies && workspace.isDependencyOfSelected) ||
        (this.#includeDependents && workspace.isDependentOfSelected)
      ) {
        yield workspace;
      }
    }
  }

  get size(): number {
    return this.#workspaces.length;
  }

  get selectedSize(): number {
    return Array.from(this).length;
  }

  /**
   * Select workspaces by name or predicate function.
   *
   * Glob patterns are supported via the
   * [minimatch](https://www.npmjs.com/package/minimatch) package.
   *
   * Negative patterns (prefixed with `!`) will exclude workspaces, and the
   * order of positive and negative patterns is significant. For example,
   * `**,!foo` will include all packages except `foo`. A double bang (`!!`)
   * will _exclude_ all packages that _do not match_ the pattern. For example,
   * `!!foo*` will _exclude_ all packages that _do not match_ `foo*`.
   *
   * Recursive patterns (suffixed or prefixed with `...`) will include
   * dependencies (suffixed) and/or dependents (prefixed). For example `foo...`
   * will include the `foo` package and all of its dependencies.
   */
  select(condition: SelectCondition): void {
    select(this.all, condition).forEach((isSelected, workspace) => (workspace.isSelected = isSelected));
  }

  /**
   * Include workspaces in iteration that are not selected (ie.
   * include all workspaces).
   */
  includeUnselected(enabled = true): void {
    this.#includeUnselected = enabled;
  }

  /**
   * Include workspaces in iteration that are dependencies of selected
   * workspaces, even if the dependency itself is not selected.
   */
  includeDependencies(enabled = true): void {
    this.#includeDependencies = enabled;
  }

  /**
   * Include workspaces in iteration that are dependents of selected
   * workspaces, even if the dependent itself is not selected.
   */
  includeDependents(enabled = true): void {
    this.#includeDependents = enabled;
  }

  /**
   * Iterate over selected workspaces in parallel, ensuring that each
   * workspace's local (selected) dependencies are processed before the
   * workspace itself.
   */
  async forEach(callback: WorkspaceCallback, signal?: AbortSignal): Promise<void> {
    await this._forEachAsync(callback, { signal });
  }

  /**
   * Iterate over selected workspaces in parallel, without regard for
   * interdependency.
   */
  async forEachIndependent(callback: WorkspaceCallback, signal?: AbortSignal): Promise<void> {
    await this._forEachAsync(callback, { signal, independent: true });
  }

  /**
   * Iterate over selected workspaces sequentially (ie. one at a time,
   * serially, non-parallel).
   */
  async forEachSequential(callback: WorkspaceCallback, signal?: AbortSignal): Promise<void> {
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
   * which are not selected.
   */
  getDependencyLinks = (workspace: Workspace, options?: WorkspaceLinkOptions): readonly WorkspaceLink[] => {
    let links = this.#dependencyLinks.get(workspace) ?? [];

    if (options?.recursive) {
      links = Array.from(
        getDepthFirstGenerator(links, (current) => this.#dependencyLinks.get(current.dependency), options?.filter),
      );
    }

    return links;
  };

  /**
   * Get dependent links for a workspace. This includes links to workspaces
   * which are not selected.
   */
  getDependentLinks = (workspace: Workspace, options?: WorkspaceLinkOptions): readonly WorkspaceLink[] => {
    let links = this.#dependentLinks.get(workspace) ?? [];

    if (options?.recursive) {
      links = Array.from(
        getDepthFirstGenerator(links, (current) => this.#dependentLinks.get(current.dependent), options?.filter),
      );
    }

    return links;
  };

  /**
   * Print workspace statuses.
   */
  printStatus = (options?: WorkspacePrintStatusOptions): void => {
    let workspaces: Iterable<Workspace>;

    if (options?.condition) {
      const selected = select(this.all, options.condition);

      workspaces = Array.from(this.all).filter((workspace) => {
        return workspace.status.value !== StatusValue.skipped || selected.get(workspace);
      });
    } else {
      workspaces = this.all;
    }

    printStatus(this.#log, workspaces, options?.prefix);
  };

  protected async _forEachAsync(
    callback: WorkspaceCallback,
    options: { signal?: AbortSignal; concurrency?: number; independent?: boolean } = {},
  ): Promise<void> {
    const { signal: outerSignal, concurrency = this.concurrency, independent = false } = options;

    if (outerSignal?.aborted) return;

    const abortController = new AbortController();
    const { signal } = abortController;
    const promises = new Map<Workspace, Promise<void>>();
    const semaphore = new Sema(getSafeConcurrency(concurrency));

    outerSignal?.addEventListener('abort', () => abortController.abort(), { once: true });

    for (const workspace of this) {
      const { log, status } = workspace;

      const abort = (reason?: any): void => {
        if (reason) log.error(reason);
        abortController.abort(reason);
      };

      const promise = (async () => {
        if (!independent) {
          await Promise.all(this.getDependencyLinks(workspace).map((link) => promises.get(link.dependency)));
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
