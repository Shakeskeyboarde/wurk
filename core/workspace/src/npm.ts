import { type Log, log as defaultLog } from '@wurk/log';
import {
  spawn,
  type SpawnOptions,
  type SpawnPromise,
  type SpawnSparseArgs,
} from '@wurk/spawn';
import { rcompare } from 'semver';

export interface NpmOptions {
  readonly name: string;
  readonly version?: string;
  readonly log?: Log;
}

export interface NpmMetadata {
  readonly version: string;
  readonly gitHead: string | null;
}

/**
 * Readonly informational NPM API for a single package.
 */
export class Npm {
  readonly #log: Log;
  readonly #name: string;
  readonly #version: string | undefined;

  protected constructor(options: NpmOptions) {
    this.#name = options.name;
    this.#version = options.version;
    this.#log = options.log ?? defaultLog;
  }

  /**
   * Get NPM registry metadata for the current or closest previous version of
   * the package.
   *
   * NOTE: This method is memoized. It will return the same promise every time
   * it is invoked.
   */
  readonly getMetadata: () => Promise<NpmMetadata | null> = ((cache: {
    value?: Promise<NpmMetadata | null>;
  }) => {
    cache.value = Promise.resolve().then(async () => {
      const packageSpec = `${this.#name}${this.#version ? `@<=${this.#version}` : ''}`;
      const { stdoutJson, ok } = await this._exec(
        ['show', '--silent', '--json', packageSpec, 'version', 'gitHead'],
        { allowNonZeroExitCode: true },
      );

      if (!ok) return null;

      const metaArray = stdoutJson
        .as('array')
        ?.filter((entry): entry is { version: string; gitHead?: unknown } => {
          return (
            entry != null &&
            typeof entry === 'object' &&
            'version' in entry &&
            typeof entry.version === 'string'
          );
        })
        .sort((a, b) => rcompare(a.version, b.version));
      const meta = metaArray?.at(0);

      if (!meta) return null;

      return {
        version: meta.version,
        gitHead: typeof meta.gitHead === 'string' ? meta.gitHead : null,
      };
    });

    return cache.value;
  }).bind(null, {});

  protected readonly _exec = (
    args: SpawnSparseArgs,
    options?: Pick<SpawnOptions, 'allowNonZeroExitCode'>,
  ): SpawnPromise => {
    return spawn('npm', args, { ...options, log: this.#log, output: 'buffer' });
  };

  /**
   * Create a new NPM API instance.
   *
   * Throws:
   * - If NPM is not installed (ENOENT)
   * - If the name option does not match the package name (EPKGNAME)
   * - If the version option does not match the package version (EPKGVER)
   */
  static async create(options: NpmOptions): Promise<Npm> {
    const npm = new Npm(options);

    // Ensure NPM is installed
    await npm._exec(['--version']);

    return npm;
  }
}
