import { type JsonAccessor } from '@wurk/json';
import { mergeSpawnOptions, spawn, type SpawnOptions, type SpawnResult, type SpawnSparseArgs } from '@wurk/spawn';
import semver from 'semver';

export interface PackageMetadata {
  readonly version: string;
  readonly gitHead: string | null;
}

export type PackageManagerCommand = 'npm' | 'pnpm' | 'yarn';

export abstract class PackageManager {
  readonly #resolveCache = new Map<string, Promise<string>>();

  /**
   * The root directory of the project where the package manager was detected.
   */
  readonly rootDir: string;

  /**
   * The root workspace configuration (package.json).
   */
  readonly rootConfig: JsonAccessor;

  /**
   * The identifier of the package manager in use. Currently it can be `npm`,
   * `pnpm`, or `yarn` (v2+). Other package managers may be possible in the
   * future.
   */
  readonly command: string;

  constructor(
    rootDir: string,
    rootConfig: JsonAccessor,
    command: PackageManagerCommand,
  ) {
    this.rootDir = rootDir;
    this.rootConfig = rootConfig;
    this.command = command;

    // Validate that the version is a valid semver version.
    this.getPublished = ((getPublished) => async (id, version) => {
      if (!semver.valid(version)) {
        throw new Error(`invalid version "${version}"`);
      }

      return await getPublished(id, version);
    })(this.getPublished.bind(this));

    // Memoize the result of `resolve` calls to avoid running any more extra
    // NodeJS processes than necessary.
    this.resolve = ((resolve) => (spec: string): Promise<string> => {
      let promise = this.#resolveCache.get(spec);

      if (!promise) {
        promise = resolve(spec);
        this.#resolveCache.set(spec, promise);
      }

      return promise;
    })(this.resolve.bind(this));
  }

  /**
   * Get all child (non-root) workspace directories.
   */
  abstract getWorkspaces(): Promise<readonly string[]>;

  /**
   * Get publication information for the workspace. This will check the
   * NPM registry for the closest version which is less than or equal to (<=)
   * the given version.
   *
   * Returns `null` if If the given version is less than all published
   * versions (or there are no published versions). Returns a metadata object
   * if the given version or a lesser version has been published. Compare
   * the returned metadata version to the workspace version to determine if
   * the exact given version has been published.
   */
  abstract getPublished(id: string, version: string): Promise<PackageMetadata | null>;

  /**
   * Spawn a new NodeJS process, making a best attempt to use the same NodeJS
   * binary that is running the current process.
   */
  async spawnNode(args: SpawnSparseArgs, options?: SpawnOptions): Promise<SpawnResult> {
    return await spawn('node', args, mergeSpawnOptions({ cwd: this.rootDir }, options));
  };

  /**
   * Resolve a package specifier from the root workspace directory.
   */
  async resolve(spec: string): Promise<string> {
    const { stdoutText: filename } = await this.spawnNode([
      '--input-type=module',
      `--eval=
        try {
          const spec = process.argv[1];
          const resolved = import.meta.resolve(spec);
          process.stdout.write(resolved);
        } catch {
          // noop
        }
      `,
      '--',
      spec,
    ]);

    if (!filename) {
      throw new Error(`could not resolve "${spec}"`);
    }

    return filename;
  }
}
