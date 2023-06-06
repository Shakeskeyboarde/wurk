import { join } from 'node:path';

import { type PackageJson } from 'type-fest';

import { patchJsonFile } from '../utils/patch-json-file.js';
import { readJsonFile } from '../utils/read-json-file.js';
import { writeJsonFile } from '../utils/write-json-file.js';
import { getWorkspaceDependencyNames } from './get-workspace-dependency-names.js';

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

  constructor(options: WorkspaceOptions) {
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
   */
  readonly patchPackageJson = async (patch: (value: PackageJson) => PackageJson): Promise<void> => {
    await patchJsonFile(join(this.dir, 'package.json'), patch);
  };
}
