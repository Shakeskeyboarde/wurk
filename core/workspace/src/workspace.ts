import { type JsonAccessor } from '@wurk/json';
import { Log } from '@wurk/log';
import { createSpawn } from '@wurk/spawn';

import { type Entrypoint, getEntrypoints } from './entrypoint.js';
import { type WorkspaceLink, type WorkspaceLinkOptions } from './link.js';

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

export interface WorkspacePublished {
  readonly version: string;
  readonly gitHead: string | null;
}

/**
 * Workspace information and utilities.
 */
export class Workspace implements WorkspaceOptions {
  readonly log: Log;
  readonly dir: string;
  readonly relativeDir: string;
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
    this.config = options.config.copy();
    this.name = this.config
      .at('name')
      .as('string', '');
    this.version = this.config
      .at('version')
      .as('string');
    this.isPrivate = this.config
      .at('private')
      .as('boolean', false);
    this.isSelected = options.isSelected ?? false;
    this.getDependencyLinks = options.getDependencyLinks ?? (() => []);
    this.getDependentLinks = options.getDependentLinks ?? (() => []);
    this.getPublished = options.getPublished ?? (async () => null);
  }

  readonly getDependencyLinks: (options?: WorkspaceLinkOptions) => readonly WorkspaceLink[];

  readonly getDependentLinks: (options?: WorkspaceLinkOptions) => readonly WorkspaceLink[];

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
  readonly spawn = createSpawn(() => ({
    log: this.log,
    cwd: this.dir,
  }));
}
