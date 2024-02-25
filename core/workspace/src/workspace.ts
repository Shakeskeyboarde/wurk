import { Fs } from '@wurk/fs';
import {
  importRelative,
  importRelativeResolve,
  type ImportResolved,
  type ImportResult,
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

/**
 * Workspace configuration.
 */
export interface WorkspaceOptions {
  /**
   * Workspace configuration (package.json).
   */
  readonly config: JsonAccessor;

  /**
   * Absolute path of the workspace directory.
   */
  readonly dir: string;

  /**
   * Path of the workspace directory relative to the root workspace. If this
   * is omitted, blank, or `"."`, then the workspace is the root workspace.
   */
  readonly relativeDir?: string;

  /**
   * Override the Git head commit hash published to the NPM registry.
   */
  readonly gitHead?: string;

  /**
   * Resolve links to local dependency workspaces.
   */
  readonly getDependencyLinks?: (
    options?: WorkspaceLinkOptions,
  ) => readonly WorkspaceLink[];

  /**
   * Resolve links to local dependent workspaces.
   */
  readonly getDependentLinks?: (
    options?: WorkspaceLinkOptions,
  ) => readonly WorkspaceLink[];
}

/**
 * Options for filtering workspace links.
 */
export interface WorkspaceLinkOptions {
  /**
   * If true, include transitive links.
   */
  readonly recursive?: boolean;

  /**
   * If provided, filter the links. If a link is filtered, it will also stop
   * recursion from traversing the filtered link's transitive links.
   */
  readonly filter?: (link: WorkspaceLink) => boolean;
}

/**
 * Represents an edge in the workspace dependency graph.
 */
export interface WorkspaceLink {
  /**
   * The dependent workspace.
   */
  readonly dependent: Workspace;

  /**
   * The dependency workspace.
   */
  readonly dependency: Workspace;

  /**
   * The scope of the dependency in the dependent workspace's `package.json`
   * file.
   */
  readonly scope: (typeof WORKSPACE_LINK_SCOPES)[number];

  /**
   * The key of the dependency in the dependent workspace's `package.json`
   * file. This may not be the same as the dependency's package name if the
   * entry is an alias.
   */
  readonly id: string;

  /**
   * Version range of the dependency in the dependent workspace's
   * `package.json` file.
   */
  readonly versionRange: string;
}

const WORKSPACE_LINK_SCOPES = [
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'dependencies',
] as const;

/**
 * Workspace information and utilities.
 */
export class Workspace {
  /**
   * Logger which should be used for messages related to the workspace.
   */
  readonly log: Log;

  /**
   * Git utilities relative to this workspace's directory.
   */
  readonly git: Git;

  /**
   * NPM utilities for this workspace's name.
   */
  readonly npm: Npm;

  /**
   * File system utilities relative to this workspace's directory.
   */
  readonly fs: Fs;

  /**
   * Workspace status tracking, used to (optionally) print a collective
   * status message for multiple workspaces.
   */
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
   * True if the workspace is explicitly included by command line options,
   * false if it's explicitly _excluded_, and null if it is not explicitly
   * included or excluded.
   *
   * Null values should generally be treated as "not selected". Some commands
   * may choose to treat null as "selected-if-necessary". For example, the
   * [build](https://npmjs.com/package/@wurk/build) command will build
   * dependencies of selected (true) workspaces, as long as the dependency
   * is not explicitly excluded (false).
   *
   *
   * **Note:** This property is mutable so that command plugins can apply
   * their own selection logic.
   */
  isSelected: boolean | null = null;

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

  /**
   * This is generally intended for internal use only. Use workspace
   * collections instead, which create their own workspace instances.
   */
  constructor(options: WorkspaceOptions) {
    this.dir = options.dir;
    this.relativeDir = options.relativeDir || '.';
    this.config = options.config.copy();
    this.name = this.config.at('name').as('string', '');
    this.version = this.config.at('version').as('string');
    this.isPrivate = this.config.at('private').as('boolean', false);
    this.isRoot = this.relativeDir === '.';
    this.log = new Log();
    this.git = new Git({ log: this.log, dir: this.dir });
    this.npm = new Npm({
      log: this.log,
      name: this.name,
      version: this.version,
      gitHead: options.gitHead,
    });
    this.fs = new Fs({ cwd: this.dir });
    this.status = new Status(this.name);
    this.getDependencyLinks = options.getDependencyLinks ?? (() => []);
    this.getDependentLinks = options.getDependentLinks ?? (() => []);
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
   * However, TypeScript type imports are not emitted in compiled code,
   * so you can safely import the module type, and then use this method
   * to import the implementation.
   */
  readonly importRelative = async <
    TExports extends Record<string, any> = Record<string, unknown>,
  >(
    name: string,
    versionRange?: string,
  ): Promise<ImportResult<TExports>> => {
    return await importRelative(name, { dir: this.dir, versionRange });
  };

  /**
   *
   */
  readonly importRelativeResolve = async (
    name: string,
    versionRange?: string,
  ): Promise<ImportResolved> => {
    return await importRelativeResolve(name, { dir: this.dir, versionRange });
  };
}
