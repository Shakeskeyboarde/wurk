import { join, resolve } from 'node:path';

import { type PackageJson } from '../exports.js';
import { getGitHead } from '../git/get-git-head.js';
import { getGitIsClean } from '../git/get-git-is-clean.js';
import { getGitIsRepo } from '../git/get-git-is-repo.js';
import { getNpmMetadata } from '../npm/get-npm-metadata.js';
import { patchJsonFile } from '../utils/patch-json-file.js';
import { readJsonFile } from '../utils/read-json-file.js';
import { type Spawn } from '../utils/spawn.js';
import { writeJsonFile } from '../utils/write-json-file.js';
import { getWorkspaceDependencyNames } from './get-workspace-dependency-names.js';
import { getWorkspaceIsModified } from './get-workspace-is-modified.js';
import {
  getWorkspaceLocalDependencies,
  type WorkspaceLocalDependenciesOptions,
} from './get-workspace-local-dependencies.js';
import { type WorkspacePackage } from './workspace-package.js';

interface PartialContext {
  readonly command: { readonly name: string };
  readonly workspaces: ReadonlyMap<string, Workspace>;
  readonly spawn: Spawn;
}

export interface WorkspaceOptions extends Required<Omit<WorkspacePackage, 'werk'>> {
  readonly selected: boolean;
  readonly config: unknown;
  readonly context: PartialContext;
  readonly gitHead: string | undefined;
  readonly gitFromRevision: string | undefined;
  readonly saveAndRestoreFile: (filename: string) => Promise<void>;
}

export interface ChangeDetectionOptions {
  /**
   * Include dependencies from the specified scopes. Defaults to no
   * dependency scopes (`[]`), so no dependencies are checked by default.
   */
  readonly includeDependencyScopes?: (
    | 'dependencies'
    | 'peerDependencies'
    | 'optionalDependencies'
    | 'devDependencies'
  )[];

  /**
   * Don't check for changes in the specified dependency names.
   */
  readonly excludeDependencyNames?: string[];
}

export class Workspace {
  readonly #context: PartialContext;
  readonly #gitHead: string | undefined;
  readonly #gitFromRevision: string | undefined;
  readonly #saveAndRestoreFile: (filename: string) => Promise<void>;

  /**
   * Absolute path of the workspace directory.
   */
  readonly dir: string;

  /**
   * Name from the workspace `package.json` file.
   */
  readonly name: string;

  /**
   * Version from the workspace `package.json` file.
   */
  readonly version: string;

  /**
   * Private from the workspace `package.json` file.
   */
  readonly private: boolean;

  /**
   * Dependencies from the workspace `package.json` file.
   */
  readonly dependencies: Readonly<Record<string, string>>;

  /**
   * Peer dependencies from the workspace `package.json` file.
   */
  readonly peerDependencies: Readonly<Record<string, string>>;

  /**
   * Optional dependencies from the workspace `package.json` file.
   */
  readonly optionalDependencies: Readonly<Record<string, string>>;

  /**
   * Dev dependencies from the workspace `package.json` file.
   */
  readonly devDependencies: Readonly<Record<string, string>>;

  /**
   * Keywords from the workspace `package.json` file.
   */
  readonly keywords: readonly string[];

  /**
   * Scripts from the workspace `package.json` file.
   */
  readonly scripts: Readonly<Record<string, string>>;

  /**
   * True if the workspace matches the
   * [Werk global options](https://www.npmjs.com/package/@werk/cli#command-line-options).
   */
  readonly selected: boolean;

  /**
   * Names of all dependencies from the workspace `package.json` file.
   */
  readonly dependencyNames: readonly string[];

  /**
   * Command configuration from the workspace `package.json` file.
   *
   * ```json
   * {
   *   "werk": {
   *     <command>: <value>
   *   }
   * }
   * ```
   */
  readonly config: unknown;

  constructor(options: WorkspaceOptions) {
    this.#context = options.context;
    this.#gitHead = options.gitHead;
    this.#gitFromRevision = options.gitFromRevision;
    this.#saveAndRestoreFile = options.saveAndRestoreFile;
    this.dir = options.dir;
    this.name = options.name;
    this.version = options.version;
    this.private = options.private;
    this.dependencies = options.dependencies;
    this.peerDependencies = options.peerDependencies;
    this.optionalDependencies = options.optionalDependencies;
    this.devDependencies = options.devDependencies;
    this.keywords = options.keywords;
    this.scripts = options.scripts;
    this.selected = options.selected;
    this.config = options.config;
    this.dependencyNames = getWorkspaceDependencyNames(options);
  }

  /**
   * Backup a file and automatically restore it after the command
   * finishes.
   */
  readonly saveAndRestoreFile = async (filename: string): Promise<void> => {
    await this.#saveAndRestoreFile(resolve(this.dir, filename));
  };

  /**
   * Read the `package.json` file from the workspace directory.
   */
  readonly readPackageJson = async (): Promise<PackageJson> => {
    return await readJsonFile(join(this.dir, 'package.json'));
  };

  /**
   * Write the `package.json` file to the workspace directory.
   */
  readonly writePackageJson = async (json: PackageJson): Promise<void> => {
    await writeJsonFile(join(this.dir, 'package.json'), json);
  };

  /**
   * Apply zero or more deeply merged patches to the `package.json` file
   * in the workspace directory.
   *
   * **Note:** Changes to the `package.json` file do not change the
   * properties of this `Workspace` instance. The `Workspace` instance
   * always represents the initial state of the workspace when the
   * command was started.
   */
  readonly patchPackageJson = async <T extends (Record<string, unknown> | null | undefined | false | 0 | '')[]>(
    ...jsonPatches: T
  ): Promise<void> => {
    await patchJsonFile(join(this.dir, 'package.json'), ...jsonPatches.filter(Boolean));
  };

  /**
   * Get the local dependencies of the workspace, including transitive.
   */
  readonly getLocalDependencies = (options?: WorkspaceLocalDependenciesOptions): Workspace[] => {
    return getWorkspaceLocalDependencies(this, this.#context.workspaces.values(), options);
  };

  /**
   * Return true if the current version exists in the registry.
   */
  readonly getNpmIsPublished = async (): Promise<boolean> => {
    return await getNpmMetadata(this.name, this.version).then((meta) => meta?.version === this.version);
  };

  /**
   * Return true if the workspace directory is part of a Git repository.
   */
  readonly getGitIsRepo = async (): Promise<boolean> => {
    return await getGitIsRepo(this.dir);
  };

  /**
   * Get the current Git HEAD commit hash.
   *
   * A default can be set for non-Git environments using the `--git-head`
   * command line option.
   */
  readonly getGitHead = async (): Promise<string | undefined> => {
    return (await getGitHead(this.dir)) ?? this.#gitHead;
  };

  /**
   * Get the "from" revision which should be used for detecting changes
   * in the workspace as compared to the current head (`this.getGitHead`).
   *
   * Can be overridden by the `--git-from-revision` command line option.
   */
  readonly getGitFromRevision = async (): Promise<string | undefined> => {
    return this.#gitFromRevision ?? (await getNpmMetadata(this.name, this.version).then((meta) => meta?.gitHead));
  };

  /**
   * Return true if the workspace is not part of a Git repository, or the
   * Git working tree is clean.
   *
   * This also checks the workspace local dependencies (recursive) if the
   * `includeDependencyScopes` option is set.
   */
  readonly getGitIsClean = async (options: ChangeDetectionOptions = {}): Promise<boolean> => {
    const { includeDependencyScopes = [], excludeDependencyNames = [] } = options;

    return await Promise.all([
      ...this.getLocalDependencies({ scopes: includeDependencyScopes })
        .filter(({ name }) => !excludeDependencyNames.includes(name))
        .map((dependency) => dependency.getGitIsClean(options)),
      excludeDependencyNames.includes(this.name) || getGitIsClean(this.dir),
    ]).then((results) => results.every(Boolean));
  };

  /**
   * Return true if the current version is not published, or if it is
   * published and there is no difference between the published and local
   * code.
   *
   * This also checks the workspace local dependencies (recursive) if the
   * `includeDependencyScopes` option is set.
   *
   * Uncommitted changes (ie. a dirty working tree) are not considered.
   */
  readonly getIsModified = async (options: ChangeDetectionOptions = {}): Promise<boolean> => {
    const { includeDependencyScopes = [], excludeDependencyNames = [] } = options;

    return await Promise.all([
      ...this.getLocalDependencies({ scopes: includeDependencyScopes })
        .filter(({ name }) => excludeDependencyNames.includes(name))
        .map((dependency) => dependency.getIsModified(options)),
      !excludeDependencyNames.includes(this.name) &&
        getWorkspaceIsModified(this.dir, this.name, this.version, this.#gitFromRevision, this.#gitHead),
    ]).then((results) => results.every(Boolean));
  };
}
