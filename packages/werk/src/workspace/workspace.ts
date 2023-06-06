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
  readonly dir: string;
  readonly name: string;
  readonly version: string;
  readonly private: boolean;
  readonly dependencies: Readonly<Partial<Record<string, string>>>;
  readonly peerDependencies: Readonly<Partial<Record<string, string>>>;
  readonly optionalDependencies: Readonly<Partial<Record<string, string>>>;
  readonly devDependencies: Readonly<Partial<Record<string, string>>>;
  readonly keywords: readonly string[];
  readonly selected: boolean;
  readonly dependencyNames: ReadonlySet<string>;

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

  readonly readPackageJson = async (): Promise<PackageJson> => {
    return await readJsonFile(join(this.dir, 'package.json'));
  };

  readonly writePackageJson = async (json: PackageJson): Promise<void> => {
    await writeJsonFile(join(this.dir, 'package.json'), json);
  };

  readonly patchPackageJson = async (patch: (value: PackageJson) => PackageJson): Promise<void> => {
    await patchJsonFile(join(this.dir, 'package.json'), patch);
  };
}
