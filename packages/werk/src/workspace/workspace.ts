import { join, resolve } from 'node:path';

import { type BaseAsyncContext } from '../context/base-async-context.js';
import { type PackageJson } from '../exports.js';
import { getGitHead } from '../git/get-git-head.js';
import { getGitIsClean } from '../git/get-git-is-clean.js';
import { getGitIsRepo } from '../git/get-git-is-repo.js';
import { getNpmMetadata } from '../npm/get-npm-metadata.js';
import { patchJsonFile } from '../utils/patch-json-file.js';
import { readJsonFile } from '../utils/read-json-file.js';
import { writeJsonFile } from '../utils/write-json-file.js';
import { getWorkspaceDependencyNames } from './get-workspace-dependency-names.js';
import { getWorkspaceIsModified } from './get-workspace-is-modified.js';
import {
  getWorkspaceLocalDependencies,
  type WorkspaceLocalDependenciesOptions,
} from './get-workspace-local-dependencies.js';

type PartialContext = Pick<BaseAsyncContext, 'workspaces' | 'spawn'>;

export type WorkspaceOptions = {
  readonly name: string;
  readonly version: string;
  readonly private?: boolean;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly keywords?: readonly string[];
  readonly dir: string;
  readonly selected?: boolean;
};

export class Workspace {
  readonly #context: PartialContext;
  readonly #gitHead: string | undefined;
  readonly #gitFromRevision: string | undefined;
  readonly #backupFile: (filename: string) => Promise<void>;

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
   * True if the workspace matches the
   * [Werk global options](https://www.npmjs.com/package/@werk/cli#command-line-options).
   */
  readonly selected: boolean;
  /**
   * Names of all dependencies from the workspace `package.json` file.
   */
  readonly dependencyNames: readonly string[];

  constructor(
    options: WorkspaceOptions & {
      readonly context: PartialContext;
      readonly gitHead: string | undefined;
      readonly gitFromRevision: string | undefined;
      readonly backupFile: (filename: string) => Promise<void>;
    },
  ) {
    this.#context = options.context;
    this.#gitHead = options.gitHead;
    this.#gitFromRevision = options.gitFromRevision;
    this.#backupFile = options.backupFile;
    this.dir = options.dir;
    this.name = options.name;
    this.version = options.version;
    this.private = options.private ?? false;
    this.dependencies = { ...options.dependencies } ?? {};
    this.peerDependencies = { ...options.peerDependencies } ?? {};
    this.optionalDependencies = { ...options.optionalDependencies } ?? {};
    this.devDependencies = { ...options.devDependencies } ?? {};
    this.keywords = options.keywords ? [...options.keywords] : [];
    this.selected = options.selected ?? false;
    this.dependencyNames = getWorkspaceDependencyNames(this);
  }

  /**
   * Backup a file and automatically restore it after the command
   * finishes.
   */
  readonly backupFile = async (filename: string): Promise<void> => {
    await this.#backupFile(resolve(this.dir, filename));
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
  readonly patchPackageJson = async <T extends Record<string, unknown>[]>(...jsonPatches: T): Promise<void> => {
    await patchJsonFile(join(this.dir, 'package.json'), ...jsonPatches);
  };

  /**
   * Get the local dependencies of the workspace.
   */
  readonly getLocalDependencies = (options?: WorkspaceLocalDependenciesOptions): Workspace[] => {
    return getWorkspaceLocalDependencies(this, this.#context.workspaces.values(), options);
  };

  /**
   * Return true if the current version exists in the registry.
   */
  readonly getNpmIsPublished = async (): Promise<boolean> => {
    return Boolean(await getNpmMetadata(this.name, this.version));
  };

  /**
   * Return true if the workspace directory is part of a Git repository.
   */
  readonly getGitIsRepo = async (): Promise<boolean> => {
    return await getGitIsRepo(this.dir);
  };

  /**
   * Return true if the Git working tree is clean.
   *
   * A workspace is considered clean if _ALL_ of the following
   * conditions are met.
   *
   * - The workspace is not part of a Git repository.
   * - The workspace directory has no uncommitted or untracked changes.
   */
  readonly getGitIsClean = async (): Promise<boolean> => {
    return await getGitIsClean(this.dir);
  };

  /**
   * Get the current Git HEAD commit hash.
   *
   * Can be overridden by the `--git-head` command line option.
   */
  readonly getGitHead = async (): Promise<string | undefined> => {
    return this.#gitHead ?? (await getGitHead(this.dir));
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
   * Return true if the current version is published, and there is no
   * difference between the published and local code.
   *
   * A workspace is always considered modified it is not published
   * (`gitNpmIsPublished`). Otherwise, it is modified if _ALL_ of the
   * following conditions are met:
   *
   * - The workspace is part of a Git repository (`getGitIsRepo`).
   * - The Git "from" revision and head commit can be determined
   *   (`getGitHead` and `getGitFromRevision`).
   * - The Git diff of the "from" revision and the head commit, in the
   *   workspace directory, returns an empty result
   *
   * Uncommitted changes (ie. a dirty working tree) are not considered.
   */
  readonly getIsModified = async (): Promise<boolean> => {
    return await getWorkspaceIsModified(this.dir, this.name, this.version, this.#gitFromRevision, this.#gitHead);
  };
}
