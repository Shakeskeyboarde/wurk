import { Fs } from '@wurk/fs';
import {
  importRelative,
  type ImportResolved,
  type ImportResult,
  resolveImport,
} from '@wurk/import';
import { type JsonAccessor } from '@wurk/json';
import { Log } from '@wurk/log';
import { type Spawn, spawn } from '@wurk/spawn';

import {
  type Entrypoint,
  getEntrypoints,
  getMissingEntrypoints,
} from './entrypoint.js';
import { Git } from './git.js';
import { Npm } from './npm.js';
import { Status } from './status.js';

export interface WorkspaceOptions {
  readonly config: JsonAccessor;
  readonly dir: string;
  readonly relativeDir: string;
  readonly isRoot: boolean;
  readonly npmHead: string | undefined;
  readonly getDependencyLinks: (
    options?: WorkspaceLinkOptions,
  ) => readonly WorkspaceLink[];
  readonly getDependentLinks: (
    options?: WorkspaceLinkOptions,
  ) => readonly WorkspaceLink[];
}

export interface WorkspaceLinkOptions {
  readonly recursive?: boolean;
  readonly filter?: (link: WorkspaceLink) => boolean;
}

export interface WorkspaceLink {
  dependent: Workspace;
  dependency: Workspace;
  scope: (typeof WORKSPACE_LINK_SCOPES)[number];
  id: string;
  versionRange: string;
}

const WORKSPACE_LINK_SCOPES = [
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'dependencies',
] as const;

export class Workspace {
  readonly log: Log;
  readonly git: Git;
  readonly npm: Npm;
  readonly fs: Fs;
  readonly status: Status;

  /**
   * Absolute path of the workspace directory.
   */
  readonly dir: string;

  /**
   * Workspace directory relative to the root workspace.
   */
  readonly relativeDir: string;

  /**
   * JSON decoded workspace `package.json` file.
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
   * True if this workspace has the `private` field set to `true` in its
   * `package.json` file.
   */
  readonly isPrivate: boolean;

  /**
   * True if this is the workspaces root package.
   */
  readonly isRoot: boolean = false;

  /**
   * True if the workspace matches the
   * [Wurk global selection options](https://github.com/Shakeskeyboarde/wurk/blob/main/core/wurk/README.md#global-selection-options).
   *
   * **Note:** This property is mutable so that command plugins can apply
   * their own selection logic.
   */
  isSelected = false;

  /**
   * True if this workspace is a dependency of any selected workspace.
   */
  get isDependencyOfSelected(): boolean {
    return this.getDependentLinks({ recursive: true }).some(
      (link) => link.dependent.isSelected,
    );
  }

  /**
   * True if this workspace is a dependent of (ie. depends on) any selected
   * workspace.
   */
  get isDependentOfSelected(): boolean {
    return this.getDependencyLinks({ recursive: true }).some(
      (link) => link.dependency.isSelected,
    );
  }

  constructor(options: WorkspaceOptions) {
    this.dir = options.dir;
    this.relativeDir = options.relativeDir;
    this.config = options.config.copy();
    this.name = this.config.at('name').as('string', '');
    this.version = this.config.at('version').as('string');
    this.isPrivate = this.config.at('private').as('boolean', false);
    this.isRoot = options.isRoot;
    this.log = new Log();
    this.git = new Git({ log: this.log, dir: this.dir });
    this.npm = new Npm({
      log: this.log,
      name: this.name,
      version: this.version,
      gitHead: options.npmHead,
    });
    this.fs = new Fs({ cwd: this.dir });
    this.status = new Status(this.name);
    this.getDependencyLinks = options.getDependencyLinks;
    this.getDependentLinks = options.getDependentLinks;
  }

  /**
   * Get all immediate local dependency workspaces.
   */
  readonly getDependencyLinks: (
    options?: WorkspaceLinkOptions,
  ) => readonly WorkspaceLink[];

  /**
   * Get all immediate local dependent workspaces.
   */
  readonly getDependentLinks: (
    options?: WorkspaceLinkOptions,
  ) => readonly WorkspaceLink[];

  /**
   * Try to detect changes using git commits, and fall back to assuming
   * modifications if that doesn't work.
   *
   * Return true if the NPM published head commit and the current Git
   * head commit do not match, or if the directory is not part of a Git
   * working tree, or if no published head commit is available.
   *
   * **Note:** This method will throw an error if the Git repository is
   * a shallow clone!
   */
  readonly getIsModified = async (): Promise<boolean> => {
    if (!(await this.git.getIsRepo())) {
      this.log.debug(`missing Git repository (assuming modified)`);
      return true;
    }

    if (await this.git.getIsShallow()) {
      throw new Error(
        `cannot detect modifications because the Git repository is shallow`,
      );
    }

    const [fromMeta, to] = await Promise.all([
      this.npm.getMetadata(),
      this.git.getHead(),
    ]);

    if (fromMeta?.gitHead == null) {
      this.log.debug(`missing published Git head (assuming modified)`);
      return true;
    }

    if (to == null) {
      this.log.debug(`missing current Git head (assuming modified)`);
      return true;
    }

    return fromMeta?.gitHead !== to;
  };

  /**
   * Return a list of all of the entry points in the workspace
   * `package.json` file. These are the files that should be built and
   * published with the package.
   */
  readonly getEntrypoints = (): readonly Entrypoint[] => {
    return getEntrypoints(this);
  };

  /**
   * Return a list of all the workspace entry points that are missing.
   *
   * **Note:** Entry points which include a wildcard are ignored.
   */
  readonly getMissingEntrypoints = async (): Promise<Entrypoint[]> => {
    return await getMissingEntrypoints(this);
  };

  /**
   * Remove files and directories from the workspace which are ignored by
   * Git, _except_ for `node_modules` and dot-files (eg. `.gitignore`,
   * `.vscode`, etc.).
   */
  readonly clean = async (): Promise<string[]> => {
    const filenames = (await this.git.getIgnored())
      // Don't clean node_modules and dot-files.
      .filter((filename) => {
        return !/(?:^|[\\/])node_modules(?:[\\/]|$)/u.test(filename);
      })
      .filter((filename) => {
        return !/(?:^|[\\/])\./u.test(filename);
      });

    const promises = filenames.map(async (filename) => {
      this.log.debug(`removing ignored file "${filename}"`);
      await this.fs.delete(filename, { recursive: true });
    });

    await Promise.all(promises);

    return filenames;
  };

  readonly spawn: Spawn = (command, args, options) => {
    return spawn(command, args, { log: this.log, cwd: this.dir, ...options });
  };

  /**
   * Import relative to the workspace directory, instead of relative to the
   * current file. This method should be used to import optional command
   * dependencies, because it allows per-workspace package installation.
   *
   * The `versionRange` option can be a semver range, just like a dependency
   * in your `package.json` file.
   *
   * **Note:** There's no way to infer the type of the imported module.
   * However, Typescript type imports are not emitted in compiled code,
   * so you can safely import the module type, and then use this method
   * to import the implementation.
   */
  async import<TExports extends Record<string, any> = Record<string, unknown>>(
    name: string,
    versionRange?: string,
  ): Promise<ImportResult<TExports>> {
    return await importRelative(name, { dir: this.dir, versionRange });
  }

  async resolveImport(
    name: string,
    versionRange?: string,
  ): Promise<ImportResolved> {
    return await resolveImport(name, { dir: this.dir, versionRange });
  }
}
