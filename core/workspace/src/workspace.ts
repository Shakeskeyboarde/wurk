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

import { clean } from './clean.js';
import { type Entrypoint, getEntrypoints } from './entrypoint.js';
import { Git } from './git.js';
import { Npm } from './npm.js';
import { type DependencySpec } from './spec.js';
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
   * The type of the dependency in the dependent workspace's `package.json`
   * file (eg. `devDependencies`).
   */
  readonly type: (typeof WORKSPACE_LINK_SCOPES)[number];

  /**
   * The key of the dependency in the dependent workspace's `package.json`
   * file. This may not be the same as the dependency's package name if the
   * entry is an alias.
   */
  readonly id: string;

  /**
   * The dependency spec.
   */
  readonly spec: DependencySpec;
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
   * Return a list of all of the entry points in the workspace
   * `package.json` file. These are the files that should be built and
   * published with the package.
   */
  readonly getEntrypoints = (): readonly Entrypoint[] => {
    return getEntrypoints(this);
  };

  /**
   * Get an NPM API instance for the workspace directory.
   *
   * Throws:
   * - If NPM is not installed (ENOENT)
   */
  readonly getNpm = async (): Promise<Npm> => {
    return await Npm.create({
      name: this.name,
      version: this.version,
      log: this.log,
    });
  };

  /**
   * Get a Git API instance for the workspace directory.
   *
   * Throws:
   * - If Git is not installed (ENOENT)
   * - If the directory is not a repo (ENOGITREPO)
   */
  readonly getGit = async (): Promise<Git> => {
    return await Git.create({ dir: this.dir, log: this.log });
  };

  /**
   * Remove files and directories from the workspace which are ignored by
   * Git, _except_ for `node_modules` and dot-files (eg. `.gitignore`,
   * `.vscode`, etc.).
   */
  readonly clean = async (): Promise<void> => {
    await clean(this);
  };

  /**
   * Spawn a child process.
   */
  readonly spawn: Spawn = (command, args, options) => {
    return spawn(command, args, {
      log: this.log,
      ...options,
      cwd: this.fs.resolve(options?.cwd ?? '.'),
    });
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
   * Find a package relative to the workspace directory, and return all of
   * the package info except its exports.
   *
   * The `versionRange` option can be a semver range, just like a dependency
   * in your `package.json` file.
   */
  readonly importRelativeResolve = async (
    name: string,
    versionRange?: string,
  ): Promise<ImportResolved> => {
    return await importRelativeResolve(name, { dir: this.dir, versionRange });
  };
}
