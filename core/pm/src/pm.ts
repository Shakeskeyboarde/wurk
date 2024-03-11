import { createSpawn, type SpawnOptions, type SpawnResult } from '@wurk/spawn';

export interface PackageMetadata {
  readonly version: string;
  readonly gitHead: string | null;
}

export interface PackageManagerConfig {
  readonly rootDir: string;
}

export abstract class PackageManager {
  /**
   * The identifier of the package manager in use. Currently it can be `npm`,
   * `pnpm`, `yarn` (v2+), or `yarn-classic` (v1). Other package managers may
   * be possible in the future.
   */
  readonly id: string;

  /**
   * The root directory of the project where the package manager was detected.
   */
  readonly rootDir: string;

  constructor(
    id: 'npm' | 'pnpm' | 'yarn' | 'yarn-classic',
    config: PackageManagerConfig,
  ) {
    this.id = id;
    this.rootDir = config.rootDir;
  }

  /**
   * Get all child (non-root) workspace directories.
   */
  abstract getWorkspaces(): Promise<readonly string[]>;

  /**
   * Limited equivalent of `npm view` command which only returns info about a
   * single version of a package. It should be the highest version that
   * matches the version range, or the latest version if no version range is
   * provided.
   */
  abstract getMetadata(
    id: string,
    versionRange?: string,
  ): Promise<PackageMetadata | null>;

  /**
   * Limited equivalent of the `npm run` command which is a no-op if the
   * script does not exist. All arguments should be passed to the script,
   * not to the package manager (eg. `npm run -- <script> <args...>`).
   */
  abstract spawnPackageScript(
    script: string,
    args?: readonly string[],
    options?: SpawnOptions,
  ): Promise<SpawnResult>;

  /**
   * Spawn a new NodeJS process, making a best attempt to use the same NodeJS
   * binary that is running the current process.
   */
  abstract spawnNode(
    args: readonly string[],
    options?: SpawnOptions,
  ): Promise<SpawnResult>;

  /**
   * Limited equivalent of `npm install` (no arguments) which restores
   * dependencies, sets up workspace symlinks (or equivalent), and updates the
   * lock file.
   */
  abstract restore(): Promise<void>;

  protected readonly _spawn = createSpawn(() => ({
    cwd: this.rootDir,
  }));
}
