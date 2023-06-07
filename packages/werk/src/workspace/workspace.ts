import { join } from 'node:path';

import { type PackageJson } from 'type-fest';

import { type RootContext } from '../context/root-context.js';
import { getGitHead } from '../git/get-git-head.js';
import { getIsGitClean } from '../git/get-is-git-clean.js';
import { getIsGitUnmodified } from '../git/get-is-git-unmodified.js';
import { getNpmMetadata } from '../npm/get-npm-metadata.js';
import { patchJsonFile } from '../utils/patch-json-file.js';
import { readJsonFile } from '../utils/read-json-file.js';
import { writeJsonFile } from '../utils/write-json-file.js';
import { getWorkspaceDependencyNames } from './get-workspace-dependency-names.js';
import { getWorkspaceLocalDependencies } from './get-workspace-local-dependencies.js';

type Context = Pick<RootContext<[], {}>, 'workspaces' | 'spawn'>;

export type WorkspaceOptions = {
  readonly name: string;
  readonly version: string;
  readonly private?: boolean;
  readonly dependencies?: Readonly<Partial<Record<string, string>>>;
  readonly peerDependencies?: Readonly<Partial<Record<string, string>>>;
  readonly optionalDependencies?: Readonly<Partial<Record<string, string>>>;
  readonly devDependencies?: Readonly<Partial<Record<string, string>>>;
  readonly keywords?: readonly string[];
  readonly dir: string;
  readonly selected?: boolean;
};

export class Workspace implements WorkspaceOptions {
  readonly #context: Context;

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
  readonly dependencies: Readonly<Partial<Record<string, string>>>;
  /**
   * Peer dependencies from the workspace `package.json` file.
   */
  readonly peerDependencies: Readonly<Partial<Record<string, string>>>;
  /**
   * Optional dependencies from the workspace `package.json` file.
   */
  readonly optionalDependencies: Readonly<Partial<Record<string, string>>>;
  /**
   * Dev dependencies from the workspace `package.json` file.
   */
  readonly devDependencies: Readonly<Partial<Record<string, string>>>;
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

  constructor(options: WorkspaceOptions & { context: Context }) {
    this.#context = options.context;
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
   * Apply a deeply merged patch to the `package.json` file in the
   * workspace directory.
   *
   * **Note:** Changes to the `package.json` file do not change the
   * properties of this `Workspace` instance. The `Workspace` instance
   * always represents the initial state of the workspace when the
   * command was started.
   */
  readonly patchPackageJson = async (patch: (value: PackageJson) => PackageJson): Promise<void> => {
    await patchJsonFile(join(this.dir, 'package.json'), patch);
  };

  /**
   * Get the local dependencies of the workspace.
   */
  readonly getLocalDependencies = (
    options: { scopes?: ('dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies')[] } = {},
  ): Workspace[] => {
    return getWorkspaceLocalDependencies(this, this.#context.workspaces.values(), options);
  };

  /**
   * Read the package metadata for this package (name and version)
   * from an NPM registry. Undefined if the package is not published
   */
  readonly getNpmMetadata = async (
    version = this.version,
  ): Promise<(PackageJson & { gitHead?: string }) | undefined> => {
    return await getNpmMetadata(this.name, version);
  };

  /**
   * Get the current Git HEAD commit hash.
   */
  readonly getGitHead = async (): Promise<string | undefined> => {
    return await getGitHead(this.dir);
  };

  /**
   * Return true if the Git working tree is clean (ie. there are no
   * uncommitted changes).
   */
  readonly getIsGitClean = async (): Promise<boolean> => {
    return await getIsGitClean(this.dir);
  };

  /**
   * Return true if there is no difference between the commit and the
   * HEAD. If no commit is provided, then the commit will be read from
   * the NPM registry metadata of the current version.
   */
  readonly getIsGitUnmodified = async (commit?: string): Promise<boolean> => {
    if (commit == null) {
      commit = await this.getNpmMetadata().then((meta) => meta?.gitHead);
    }

    // If there's no commit to compare against, then assume there are no changes.
    if (commit == null) return true;

    return await getIsGitUnmodified(this.dir, commit);
  };
}
