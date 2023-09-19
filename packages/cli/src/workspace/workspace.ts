/* eslint-disable max-lines */
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { getGitHead } from '../git/get-git-head.js';
import { getGitIsClean } from '../git/get-git-is-clean.js';
import { getGitIsRepo } from '../git/get-git-is-repo.js';
import { getGitIsShallow } from '../git/get-git-is-shallow.js';
import { getGitLastChangeCommit } from '../git/get-git-last-change-commit.js';
import { getNpmMetadata } from '../npm/get-npm-metadata.js';
import { type Log } from '../utils/log.js';
import { type PackageJson } from '../utils/package-json.js';
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
  readonly log: Log;
  readonly workspaces: ReadonlyMap<string, Workspace>;
  readonly spawn: Spawn;
}

export interface WorkspaceOptions
  extends Required<Omit<WorkspacePackage, 'werk' | 'types' | 'bin' | 'main' | 'module' | 'exports'>>,
    Pick<WorkspacePackage, 'types' | 'bin' | 'main' | 'module' | 'exports'> {
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

export interface EntryPoint {
  readonly type: 'types' | 'bin' | 'main' | 'module' | 'exports' | 'man';
  readonly filename: string;
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
   * Type from the workspace `package.json` file.
   */
  readonly type: 'module' | 'commonjs';

  /**
   * Types from the workspace `package.json` file.
   */
  readonly types: string | undefined;

  /**
   * Bin from the workspace `package.json` file.
   */
  readonly bin: string | Readonly<Record<string, string>> | undefined;

  /**
   * Main from the workspace `package.json` file.
   */
  readonly main: string | undefined;

  /**
   * Module from the workspace `package.json` file.
   */
  readonly module: string | undefined;

  /**
   * Exports from the workspace `package.json` file.
   */
  readonly exports: string | Readonly<Record<string, string | Readonly<Record<string, string>>>> | undefined;

  /**
   * Directories from the workspace `package.json` file.
   */
  readonly directories: { readonly bin?: string; readonly man?: string };

  /**
   * Man from the workspace `package.json` file.
   */
  readonly man: readonly string[];

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
   *     <command>: {
   *       "config": <value>
   *     }
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
    this.type = options.type === 'module' ? 'module' : 'commonjs';
    this.types = options.types;
    this.bin = options.bin;
    this.main = options.main;
    this.module = options.module;
    this.exports = options.exports;
    this.directories = options.directories;
    this.man = Array.isArray(options.man) ? options.man : [options.man];
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
    return await readJsonFile(resolve(this.dir, 'package.json'));
  };

  /**
   * Write the `package.json` file to the workspace directory.
   */
  readonly writePackageJson = async (json: PackageJson): Promise<void> => {
    await writeJsonFile(resolve(this.dir, 'package.json'), json);
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
    await patchJsonFile(resolve(this.dir, 'package.json'), ...jsonPatches.filter(Boolean));
  };

  /**
   * Get the local dependencies of the workspace (recursive).
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
   * Return true if the workspace directory is only a shallow Git checkout.
   */
  readonly getGitIsShallow = async (): Promise<boolean> => {
    return await getGitIsShallow(this.dir);
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
   * Get the hash of the most recent commit which modified the workspace
   * directory.
   */
  readonly getGitLastChangeCommit = async (): Promise<string | undefined> => {
    return await getGitLastChangeCommit(this.dir);
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
    const isClean = await Promise.all([
      ...this.getLocalDependencies({ scopes: includeDependencyScopes })
        .filter(({ name }) => !excludeDependencyNames.includes(name))
        .map((dependency) => dependency.getGitIsClean(options)),
      excludeDependencyNames.includes(this.name) || getGitIsClean(this.dir),
    ]).then((results) => results.every(Boolean));

    this.#context.log.debug(`Workspace "${this.name}" clean=${isClean}`);

    return isClean;
  };

  /**
   * Return true if the current version is not published, or if it is
   * published and there is no difference between the published and local
   * code.
   *
   * Uncommitted changes (ie. a dirty working tree) are not considered.
   */
  readonly getIsModified = async (): Promise<boolean> => {
    const isModified = await getWorkspaceIsModified(
      this.dir,
      this.name,
      this.version,
      this.#gitFromRevision,
      this.#gitHead,
    );

    this.#context.log.debug(`Workspace "${this.name}" modified=${isModified}`);

    return isModified;
  };

  /**
   * Returns the workspace local dependencies (recursive) that are
   * modified. See the `getIsModified()` method for more details.
   */
  readonly getModifiedLocalDependencies = async (options: ChangeDetectionOptions = {}): Promise<Workspace[]> => {
    const { includeDependencyScopes, excludeDependencyNames = [] } = options;

    const localDependencies = this.getLocalDependencies({ scopes: includeDependencyScopes }).filter(
      ({ name }) => !excludeDependencyNames.includes(name),
    );

    const modifiedDependencies = await Promise.all(
      localDependencies.map(async (dependency) => [dependency, await dependency.getIsModified()] as const),
    ).then((results) => results.flatMap(([dependency, isModified]) => (isModified ? [dependency] : [])));

    return modifiedDependencies;
  };

  /**
   * Return a list of all of the entry points in the workspace
   * `package.json` file. These are the files that should be built and
   * published with the package.
   */
  readonly getEntryPoints = (): EntryPoint[] => {
    const entryPoints: EntryPoint[] = [];
    const addEntryPoints = (type: EntryPoint['type'], value: unknown): void => {
      if (typeof value === 'string') {
        entryPoints.push({ type, filename: resolve(this.dir, value) });
      } else if (Array.isArray(value)) {
        value.forEach((subValue) => addEntryPoints(type, subValue));
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach((subValue) => addEntryPoints(type, subValue));
      }
    };

    addEntryPoints('types', this.types);
    addEntryPoints('bin', [this.bin, this.directories.bin]);
    addEntryPoints('main', this.main);
    addEntryPoints('module', this.module);
    addEntryPoints('exports', this.exports);
    addEntryPoints('man', [this.man, this.directories.man]);

    return entryPoints;
  };

  /**
   * Return a list of all the workspace entry points that are missing.
   */
  readonly getMissingEntryPoints = async (): Promise<EntryPoint[]> => {
    const values = this.getEntryPoints();
    const sparse = await Promise.all(
      values.map((value) =>
        stat(value.filename)
          .then(() => undefined)
          .catch(() => value),
      ),
    );

    return sparse.filter((value): value is EntryPoint => Boolean(value));
  };

  /**
   * Return true if all of the workspace entry points exist.
   */
  readonly getIsBuilt = async (): Promise<boolean> => {
    const missing = await this.getMissingEntryPoints();
    const isBuilt = missing.length === 0;

    this.#context.log.debug(`Workspace "${this.name}" built=${isBuilt}`);

    return isBuilt;
  };
}
