import { type Log, log as defaultLog } from '@wurk/log';
import { spawn } from '@wurk/spawn';
import { rcompare } from 'semver';

export interface NpmOptions {
  readonly log?: Log;
  readonly name: string;
  readonly version?: string;
  readonly gitHead?: string;
}

export interface NpmMetadata {
  readonly version: string;
  readonly gitHead: string | null;
}

export class Npm {
  readonly #log: Log;
  readonly #name: string;
  readonly #version: string | undefined;
  readonly #gitHead: string | undefined;

  constructor(options: NpmOptions) {
    this.#log = options.log ?? defaultLog;
    this.#name = options.name;
    this.#version = options.version;
    this.#gitHead = options.gitHead;
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
      const { stdoutJson, ok } = await spawn(
        'npm',
        ['show', '--silent', '--json', packageSpec, 'version', 'gitHead'],
        {
          log: this.#log,
          allowNonZeroExitCode: true,
        },
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
      const version = metaArray?.at(0)?.version;

      if (!version) return null;

      const gitHead =
        this.#gitHead ??
        metaArray.find(
          (entry): entry is { version: string; gitHead: string } => {
            return typeof entry.gitHead === 'string';
          },
        )?.gitHead ??
        null;

      return { version, gitHead };
    });

    return cache.value;
  }).bind(null, {});
}
