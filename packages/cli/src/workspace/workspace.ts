/* eslint-disable max-lines */
import { rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { getGitHead } from '../git/get-git-head.js';
import { getGitIgnored, type GitIgnoredOptions } from '../git/get-git-ignored.js';
import { getGitIsDirty } from '../git/get-git-is-dirty.js';
import { getGitIsRepo } from '../git/get-git-is-repo.js';
import { getGitIsShallow } from '../git/get-git-is-shallow.js';
import { getNpmMetadata, type NpmMetadata } from '../npm/get-npm-metadata.js';
import { type ReadonlyEnhancedMap } from '../utils/enhanced-map.js';
import { importRelative } from '../utils/import-relative.js';
import { log } from '../utils/log.js';
import { memoize } from '../utils/memoize.js';
import { type PackageExportsMap, type PackageJson, type PackageJsonKnown } from '../utils/package-json.js';
import { patchJsonFile } from '../utils/patch-json-file.js';
import { readJsonFile } from '../utils/read-json-file.js';
import { writeJsonFile } from '../utils/write-json-file.js';

export type WorkspaceStatusString = keyof typeof WorkspaceStatus;

export enum WorkspaceStatus {
  skipped = 0,
  success = 1,
  warning = 2,
  failure = 3,
  pending = 4,
}

export enum WorkspaceDependencyScope {
  dev = 0,
  optional = 1,
  peer = 2,
  prod = 3,
}

export interface WorkspaceEntryPoint {
  readonly type: 'license' | 'types' | 'bin' | 'main' | 'module' | 'exports' | 'man';
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
  readonly gitFromRevision: string | undefined;
  readonly onStatus: (name: string, status: WorkspaceStatus, detail?: string) => void;
}

export class Workspace {
  readonly #onStatus: (name: string, status: WorkspaceStatus, detail?: string) => void;
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
   * The SPDX license identifier from the workspace `package.json` file.
   */
  readonly license: string | undefined;

  /**
   * Scripts from the workspace `package.json` file.
   */
  readonly scripts: Readonly<Record<string, string>>;

  /**
   * Keywords from the workspace `package.json` file.
   */
  readonly keywords: readonly string[];

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
   * Local dependency workspace references. Dependencies are workspaces
   * that this workspace depends on.
   */
  readonly localDependencies: ReadonlyEnhancedMap<string, WorkspaceReference>;

  /**
   * Local dependent workspace references. Dependents are workspaces that
   * depend this workspace.
   */
  readonly localDependents: ReadonlyEnhancedMap<string, WorkspaceReference>;

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
   * [Werk global selection options](https://www.npmjs.com/package/@werk/cli#global-selection-options).
   *
   * **Note:** This property is mutable so that command plugins can apply
   * their own selection logic.
   */
  isSelected: boolean;

  constructor(options: WorkspaceOptions) {
    this.#onStatus = options.onStatus;
    this.#gitFromRevision = options.gitFromRevision;

    this.isSelected = options.isSelected;
    this.isRoot = options.isRoot;
    this.isPrivate = options.isPrivate ?? false;
    this.name = options.name;
    this.description = options.description;
    this.version = options.version ?? '0.0.0';
    this.license = options.license;
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
    this.localDependencies = options.localDependencies;
    this.localDependents = options.localDependents;
    this.dir = options.dir;
    this.isSelected = options.isSelected;
  }

  /**
   * Remove files and directories from the workspace which are ignored by
   * Git, _except_ for `node_modules` and dot-files (eg. `.gitignore`, `.vscode`, etc.).
   */
  readonly clean = async (): Promise<string[]> => {
    const ignored = await this.getGitIgnored();
    const promises = ignored.map(async (filename) => {
      const fullFilename = resolve(this.dir, filename);

      log.debug(`Removing ignored file: ${fullFilename}`);
      await rm(fullFilename, { force: true, recursive: true });
    });

    await Promise.all(promises);

    return ignored;
  };

  /**
   * Dynamic import relative to the workspace directory, instead of to
   * the current file. This method should be used to import optional
   * command dependencies, because it allows per-workspace package
   * installation. An `undefined` value is returned if the import cannot
   * be resolved.
   *
   * The `version` argument can be a semver range, just like a dependency
   * in your `package.json` file.
   *
   * **Note:** There's no way to infer the type of the imported module.
   * However, Typescript type imports are not emitted in compiled code,
   * so you can safely import the module type, and then use this method
   * to import the implementation.
   */
  readonly import = async <TExports extends Record<string, any> = Record<string, unknown>>(
    id: string,
    version?: string,
  ): Promise<TExports | undefined> => {
    return await importRelative<TExports>(id, { dir: this.dir, version })
      .then((value) => value.exports)
      .catch(() => undefined);
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
   * was not modified in the current HEAD commit.
   */
  readonly getGitHead = memoize(async (): Promise<string | undefined> => {
    return (await this.getGitIsRepo()) ? await getGitHead(this.dir) : undefined;
  });

  /**
   * Get a list of all the files in the workspace directory which are
   * ignored by Git (`.gitignore`). This method will return an empty
   * array if the workspace directory is not part of a Git repository.
   */
  readonly getGitIgnored = async (options?: GitIgnoredOptions): Promise<string[]> => {
    const ignored = (await this.getGitIsRepo()) ? await getGitIgnored(this.dir, options) : [];

    log.debug(`Git ignored files:`);
    ignored.forEach((file) => log.debug(`  - ${file}`));

    return ignored;
  };

  /**
   * Return true if the Git working tree is dirty.
   */
  readonly getGitIsDirty = memoize(async (): Promise<boolean> => {
    return (await this.getGitIsRepo()) ? await getGitIsDirty(this.dir) : false;
  });

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
  readonly getIsModified = memoize(async (): Promise<boolean> => {
    if (!(await this.getGitIsRepo())) {
      log.debug(`Couldn't detect Git repository for ${this.name}. Assuming modified.`);
      return true;
    }

    if (await this.getGitIsShallow()) {
      throw new Error(`Cannot detect modifications because the Git repository is shallow.`);
    }

    const [from, to] = await Promise.all([this.getNpmHead(), this.getGitHead()]);

    if (from == null) {
      log.debug(`Couldn't find the published head for ${this.name}. Assuming modified.`);
      return true;
    }
    if (to == null) {
      log.debug(`Couldn't find the current head for ${this.name}. Assuming modified.`);
      return true;
    }

    return from !== to;
  });

  /**
   * Return a list of all of the entry points in the workspace
   * `package.json` file. These are the files that should be built and
   * published with the package.
   */
  readonly getEntryPoints = (): readonly WorkspaceEntryPoint[] => {
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

    if (this.license) {
      addEntryPoints('license', 'LICENSE');
    }

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
   *
   * **Note:** Entry points which include a wildcard are ignored.
   */
  readonly getMissingEntryPoints = async (): Promise<WorkspaceEntryPoint[]> => {
    const values = this.getEntryPoints();
    const sparse = await Promise.all(
      values.map((value) =>
        value.filename.includes('*')
          ? undefined
          : stat(value.filename)
              .then(() => undefined)
              .catch(() => value),
      ),
    );

    return sparse.filter((value): value is WorkspaceEntryPoint => Boolean(value));
  };

  /**
   * Set the workspace status.
   *
   * Calling this method more than once on the same workspace will
   * replace the previous status. The status is only reported if the
   * `before` command hook enabled summary printing by calling the
   * `context.setPrintSummary()` method.
   */
  readonly setStatus = (status: WorkspaceStatusString, detail?: string): void => {
    this.#onStatus(this.name, WorkspaceStatus[status], detail);
  };
}
