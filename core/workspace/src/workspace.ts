import nodeFsLegacy from 'node:fs';
import nodeFs from 'node:fs/promises';
import nodeOs from 'node:os';
import nodePath from 'node:path';

import { type JsonAccessor } from '@wurk/json';
import { Log } from '@wurk/log';
import { type Spawn, spawn } from '@wurk/spawn';

import { DEPENDENCY_TYPES, type WorkspaceDependency } from './dependency.js';
import { type Entrypoint, getEntrypoints } from './entrypoint.js';
import { type WorkspaceLink, type WorkspaceLinkOptions } from './link.js';
import { getDependencySpec } from './spec.js';

/**
 * Workspace configuration.
 */
export interface WorkspaceOptions {
  /**
   * Logger which should be used for messages related to the workspace.
   */
  readonly log?: Log;

  /**
   * Absolute path of the workspace directory.
   */
  readonly dir: string;

  /**
   * Workspace directory relative to the root workspace.
   */
  readonly relativeDir?: string;

  /**
   * Workspace configuration (package.json).
   */
  readonly config: JsonAccessor;

  /**
   * Initial selection state of the workspace.
   */
  readonly isSelected?: boolean;

  /**
   * Resolve links to local dependency workspaces.
   */
  readonly getDependencyLinks?: (options?: WorkspaceLinkOptions) => readonly WorkspaceLink[];

  /**
   * Resolve links to local dependent workspaces.
   */
  readonly getDependentLinks?: (options?: WorkspaceLinkOptions) => readonly WorkspaceLink[];

  /**
   * Get publication information for the workspace. This will check the
   * NPM registry for the closest version which is less than or equal to (<=)
   * the current version.
   *
   * Returns `null` if If the current version is less than all published
   * versions (or there are no published versions). Returns a metadata object
   * if the current version or a lesser version has been published. Compare
   * the returned metadata version to the workspace version to determine if
   * the exact current version has been published.
   */
  readonly getPublished?: () => Promise<WorkspacePublished | null>;
}

/**
 * Published workspace information.
 */
export interface WorkspacePublished {
  /**
   * The closest (lower) version of the workspace which has been published.
   */
  readonly version: string;
  /**
   * The git commit hash of the published version.
   */
  readonly gitHead: string | null;
}

/**
 * Workspace information and utilities.
 */
export class Workspace implements WorkspaceOptions {
  /**
   * Logger which should be used for messages related to workspace processing.
   */
  readonly log: Log;

  /**
   * Absolute path of the workspace directory.
   */
  readonly dir: string;

  /**
   * Workspace directory relative to the root workspace.
   */
  readonly relativeDir: string;

  /**
   * Workspace configuration (package.json).
   */
  readonly config: JsonAccessor;

  /**
   * Workspace package name.
   */
  readonly name: string;

  /**
   * Workspace package version.
   */
  readonly version: string | undefined;

  /**
   * All workspace dependencies (not just local).
   */
  readonly dependencies: readonly WorkspaceDependency[];

  /**
   * True if this workspace has the `private` field set to `true` in its
   * `package.json` file.
   */
  readonly isPrivate: boolean;

  /**
   * True if this workspace will be included in `forEach*` method iterations.
   *
   * **Note:** This property is intentionally mutable to allow for dynamic
   * selection of workspaces. Changes to this property will not hav
   */
  isSelected: boolean;

  /**
   * True if this workspace is a dependency of any selected workspace.
   */
  get isDependencyOfSelected(): boolean {
    return this.getDependentLinks({ recursive: true })
      .some((link) => link.dependent.isSelected);
  }

  /**
   * True if this workspace is a dependent of (ie. depends on) any selected
   * workspace.
   */
  get isDependentOfSelected(): boolean {
    return this.getDependencyLinks({ recursive: true })
      .some((link) => link.dependency.isSelected);
  }

  /**
   * This is generally intended for internal use only. Use workspace
   * collections instead, which create their own workspace instances.
   */
  constructor(options: WorkspaceOptions) {
    this.log = options.log ?? new Log();
    this.dir = options.dir;
    this.relativeDir = options.relativeDir ?? '.';
    this.config = options.config.copy({ immutable: true });
    this.name = this.config
      .at('name')
      .as('string', '');
    this.version = this.config
      .at('version')
      .as('string');
    this.dependencies = DEPENDENCY_TYPES
      .map((type) => [type, this.config.at(type)] as const)
      .flatMap(([type, dependencies]) => dependencies
        .entries('object')
        .flatMap(([id, spec]) => typeof spec === 'string' ? ({ type, id, spec: getDependencySpec(id, spec) }) : []));
    this.isPrivate = this.config
      .at('private')
      .as('boolean', false);
    this.isSelected = options.isSelected ?? false;
    this.getDependencyLinks = options.getDependencyLinks ?? (() => []);
    this.getDependentLinks = options.getDependentLinks ?? (() => []);
    this.getPublished = options.getPublished ?? (async () => null);
  }

  /**
   * Get links to local dependency workspaces.
   */
  readonly getDependencyLinks: (options?: WorkspaceLinkOptions) => readonly WorkspaceLink[];

  /**
   * Get links to local dependent workspaces.
   */
  readonly getDependentLinks: (options?: WorkspaceLinkOptions) => readonly WorkspaceLink[];

  /**
   * Get publication information for the workspace.
   */
  readonly getPublished: () => Promise<WorkspacePublished | null>;

  /**
   * Return a list of all of the entry points in the workspace
   * `package.json` file. These are the files that should be built and
   * published with the package.
   */
  readonly getEntrypoints = (): readonly Entrypoint[] => {
    return getEntrypoints(this);
  };

  /**
   * Spawn a child process.
   */
  readonly spawn: Spawn = (command, sparseArgs?, ...options) => spawn(command, sparseArgs, {
    log: this.log,
    cwd: this.dir,
  }, ...options);

  /**
   * Create a temporary directory which will be cleaned up when the process
   * exits.
   */
  readonly temp = async (prefix = 'wurk-', options?: { readonly local?: boolean }): Promise<string> => {
    if (options?.local) {
      prefix = nodePath.normalize(prefix);

      // If the prefix doesn't start with a dot and isn't an absolute path,
      // then add a leading dot to indicate it's hidden (POSIX).
      if (!prefix.startsWith('.') && !nodePath.isAbsolute(prefix)) {
        prefix = `.${prefix}`;
      }

      prefix = nodePath.resolve(this.dir, prefix);
    }
    else {
      prefix = nodePath.resolve(nodeOs.tmpdir(), prefix);
    }

    const tempDir = await nodeFs.mkdtemp(prefix);

    process.setMaxListeners(process.getMaxListeners() + 1);
    process.on('exit', () => {
      nodeFsLegacy.rmSync(tempDir, { force: true, recursive: true });
    });

    return tempDir;
  };
}
