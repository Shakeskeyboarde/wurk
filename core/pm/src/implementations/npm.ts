import {
  type SpawnOptions,
  type SpawnResult,
  type SpawnSparseArgs,
} from '@wurk/spawn';
import semver from 'semver';

import {
  PackageManager,
  type PackageManagerConfig,
  type PackageMetadata,
} from '../pm.js';

export class Npm extends PackageManager {
  constructor(config: PackageManagerConfig) {
    super('npm', config);
  }

  async getWorkspaces(): Promise<readonly string[]> {
    const { stdoutJson: results } = await this._spawn('npm', [
      'query',
      '--quiet',
      '--json',
      '.workspace',
    ]);

    return (
      results.map((result): string => {
        return (
          result
            .at('realpath')
            .as('string')
            ?? result
              .at('path')
              .as('string')
        );
      }) ?? []
    );
  }

  async getMetadata(
    id: string,
    versionRange = 'latest',
  ): Promise<PackageMetadata | null> {
    const { stdoutJson, ok } = await this._spawn(
      'npm',
      [
        'show',
        '--quiet',
        '--json',
        `${id}@${versionRange}`,
        'version',
        'gitHead',
      ],
      { allowNonZeroExitCode: true },
    );

    if (!ok) return null;

    const value = stdoutJson.unwrap();
    const array = Array.isArray(value) ? value : [value];
    const metaArray = array
      .filter((entry): entry is { version: string; gitHead?: unknown } => {
        return (
          entry != null
          && typeof entry === 'object'
          && 'version' in entry
          && typeof entry.version === 'string'
        );
      })
      .sort((a, b) => semver.rcompare(a.version, b.version));

    const [first] = metaArray;

    if (!first) return null;

    const { version, gitHead } = first;

    return { version, gitHead: typeof gitHead === 'string' ? gitHead : null };
  }

  spawnPackageScript(
    script: string,
    args: SpawnSparseArgs = [],
    options?: SpawnOptions | undefined,
  ): Promise<SpawnResult> {
    return this._spawn('npm', ['run', '--', script, ...args], options);
  }

  spawnNode(
    args: readonly string[],
    options?: SpawnOptions | undefined,
  ): Promise<SpawnResult> {
    return this._spawn('node', args, options);
  }

  async restore(): Promise<void> {
    await this._spawn('npm', ['install']);
  }
}
