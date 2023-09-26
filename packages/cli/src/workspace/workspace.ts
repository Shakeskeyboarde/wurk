import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { getGitHead } from '../git/get-git-head.js';
import { getGitIsDirty } from '../git/get-git-is-dirty.js';
import { getGitIsRepo } from '../git/get-git-is-repo.js';
import { getGitIsShallow } from '../git/get-git-is-shallow.js';
import { getNpmMetadata, type NpmMetadata } from '../npm/get-npm-metadata.js';
import { type ReadonlyEnhancedMap } from '../utils/enhanced-map.js';
import { memoize } from '../utils/memoize.js';
import { type PackageExportsMap, type PackageJson, type PackageJsonKnown } from '../utils/package-json.js';
import { patchJsonFile } from '../utils/patch-json-file.js';
import { readJsonFile } from '../utils/read-json-file.js';
import { writeJsonFile } from '../utils/write-json-file.js';

export enum WorkspaceDependencyScope {
  dev = 0,
  optional = 1,
  peer = 2,
  prod = 3,
}

export interface WorkspaceEntryPoint {
  readonly type: 'types' | 'bin' | 'main' | 'module' | 'exports' | 'man';
  readonly filename: string;
}

export interface WorkspaceReference {
  readonly workspace: Workspace;
  readonly scope: WorkspaceDependencyScope;
  readonly isDirect: boolean;
}

export interface WorkspaceOptions extends Omit<PackageJsonKnown, 'private'> {
  readonly name: string;
  readonly dir: string;
  readonly isPrivate: boolean | undefined;
  readonly isRoot: boolean;
  readonly isSelected: boolean;
  readonly localDependencies: ReadonlyEnhancedMap<string, WorkspaceReference>;
  readonly localDependents: ReadonlyEnhancedMap<string, WorkspaceReference>;
  readonly gitHead: string | undefined;
  readonly gitFromRevision: string | undefined;
}

export class Workspace {
  readonly #gitHead: string | undefined;
  readonly #gitFromRevision: string | undefined;

  /**
   * Name from the workspace `package.json` file.
   */
  readonly name: string;

  /**
   * Name from the workspace `package.json` file.
   */
  readonly description: string | undefined;

  /**
   * Version from the workspace `package.json` file.
   */
  readonly version: string;

  /**
   * Scripts from the workspace `package.json` file.
   */
  readonly scripts: Readonly<Record<string, string>>;

  /**
   * Keywords from the workspace `package.json` file.
   */
  readonly keywords: readonly string[];

  /**
   * Type from the workspace `package.json` file.
   */
  readonly type: 'module' | 'commonjs';

  /**
   * File patterns to be included in the package bundle.
   */
  readonly files: readonly string[];

  /**
   * Directories from the workspace `package.json` file.
   */
  readonly directories: { readonly bin?: string; readonly man?: string };

  /**
   * Man from the workspace `package.json` file.
   */
  readonly man: readonly string[];

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
  readonly exports: string | PackageExportsMap | undefined;

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
   * Absolute path of the workspace directory.
   */
  readonly dir: string;

  /**
   * True if the private flag is set in the workspace `package.json` file.
   */
  readonly isPrivate: boolean;

  /**
   * True if this is the workspaces root package.
   */
  readonly isRoot: boolean = false;

  /**
   * True if the workspace matches the
   * [Werk global options](https://www.npmjs.com/package/@werk/cli#command-line-options).
   *
   * **Note:** This property is mutable so that command plugins can apply
   * their own selection logic.
   */
  isSelected: boolean;

  /**
   * Local dependency workspace references. Dependencies are workspaces
   * that this workspace depends on.
   */
  readonly localDependencies: ReadonlyEnhancedMap<string, WorkspaceReference>;

  /**
   * Local dependent workspace references. Dependents are workspaces that
   * depend this workspace.
   */
  readonly localDependents: ReadonlyEnhancedMap<string, WorkspaceReference>;

  constructor(options: WorkspaceOptions) {
    this.#gitHead = options.gitHead;
    this.#gitFromRevision = options.gitFromRevision;

    this.isSelected = options.isSelected;
    this.isRoot = options.isRoot;
    this.isPrivate = options.isPrivate ?? false;
    this.name = options.name;
    this.version = options.version ?? '0.0.0';
    this.description = options.description;
    this.scripts = options.scripts ?? {};
    this.keywords = options.keywords ?? [];
    this.files = options.files ?? [];
    this.directories = options.directories ?? {};
    this.man = Array.isArray(options.man) ? options.man : options.man == null ? [] : [options.man];
    this.type = options.type === 'module' ? 'module' : 'commonjs';
    this.types = options.types;
    this.bin = options.bin;
    this.main = options.main;
    this.module = options.module;
    this.exports = options.exports;
    this.dependencies = options.dependencies ?? {};
    this.peerDependencies = options.peerDependencies ?? {};
    this.optionalDependencies = options.optionalDependencies ?? {};
    this.devDependencies = options.devDependencies ?? {};
    this.dir = options.dir;
    this.isSelected = options.isSelected;
    this.localDependencies = options.localDependencies;
    this.localDependents = options.localDependents;
  }

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
   * always represents the initial state of the workspace.
   */
  readonly patchPackageJson = async <T extends (Record<string, unknown> | null | undefined | false | 0 | '')[]>(
    ...jsonPatches: T
  ): Promise<void> => {
    await patchJsonFile(resolve(this.dir, 'package.json'), ...jsonPatches.filter(Boolean));
  };

  /**
   * Return NPM registry metadata for the current version of the
   * workspace. If the current version is not published, the closest
   * previous version will be returned.
   */
  readonly getNpmMetadata = memoize(async (): Promise<NpmMetadata | undefined> => {
    return this.version == null ? undefined : await getNpmMetadata(this.name, this.version);
  });

  /**
   * Return true if the current version exists in the registry.
   */
  readonly getNpmIsPublished = memoize(async (): Promise<boolean> => {
    return await this.getNpmMetadata().then((meta) => meta?.version === this.version);
  });

  /**
   * Get the "from" revision which should be used for detecting changes
   * in the workspace as compared to the current head (`this.getGitHead`).
   *
   * Can be overridden by the `--git-from-revision` command line option.
   */
  readonly getNpmHead = memoize(async (): Promise<string | undefined> => {
    return (
      this.#gitFromRevision ??
      (this.version != null ? await getNpmMetadata(this.name, this.version).then((meta) => meta?.gitHead) : undefined)
    );
  });

  /**
   * Return true if the workspace directory is part of a Git repository.
   */
  readonly getGitIsRepo = memoize(async (): Promise<boolean> => {
    return await getGitIsRepo(this.dir);
  });

  /**
   * Return true if the workspace directory is only a shallow Git checkout.
   */
  readonly getGitIsShallow = memoize(async (): Promise<boolean> => {
    return (await this.getGitIsRepo()) && (await getGitIsShallow(this.dir));
  });

  /**
   * Get the hash of the most recent commit which modified the workspace
   * directory. This may not actually be HEAD if the workspace directory
   * directory was not modified in the current HEAD commit.
   *
   * A default can be set for non-Git environments using the `--git-head`
   * command line option.
   */
  readonly getGitHead = memoize(async (): Promise<string | undefined> => {
    return ((await this.getGitIsRepo()) ? await getGitHead(this.dir) : undefined) ?? this.#gitHead;
  });

  /**
   * Return true if the Git working tree is dirty.
   */
  readonly getGitIsDirty = memoize(async (): Promise<boolean> => {
    return (await this.getGitIsRepo()) ? await getGitIsDirty(this.dir) : false;
  });

  /**
   * Return true if the NPM published head and the current Git head
   * commits are both resolved and do not match.
   *
   * **Note:** This method will throw an error if the Git repository is
   * a shallow clone!
   */
  readonly getIsModified = memoize(async (): Promise<boolean> => {
    if (!(await this.getGitIsRepo())) return false;

    if (await this.getGitIsShallow()) {
      throw new Error(`Cannot detect modifications because the Git repository is shallow.`);
    }

    const [from, to] = await Promise.all([this.getNpmHead(), this.getGitHead()]);

    if (from == null) return false; // Couldn't find the published head.
    if (to == null) return false; // Couldn't find the current head.

    return from !== to;
  });

  /**
   * Return a list of all of the entry points in the workspace
   * `package.json` file. These are the files that should be built and
   * published with the package.
   */
  readonly getEntryPoints = memoize((): readonly WorkspaceEntryPoint[] => {
    const entryPoints: WorkspaceEntryPoint[] = [];
    const addEntryPoints = (type: WorkspaceEntryPoint['type'], value: unknown): void => {
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
  });

  /**
   * Return a list of all the workspace entry points that are missing.
   */
  readonly getMissingEntryPoints = async (): Promise<WorkspaceEntryPoint[]> => {
    const values = this.getEntryPoints();
    const sparse = await Promise.all(
      values.map((value) =>
        stat(value.filename)
          .then(() => undefined)
          .catch(() => value),
      ),
    );

    return sparse.filter((value): value is WorkspaceEntryPoint => Boolean(value));
  };
}
