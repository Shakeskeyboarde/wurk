import { spawn } from '@wurk/spawn';
import semver from 'semver';

import { PackageManager, type PackageManagerConfig, type PackageMetadata } from '../pm.js';

export class Npm extends PackageManager {
  constructor(config: PackageManagerConfig) {
    super('npm', config);
  }

  async getWorkspaces(): Promise<readonly string[]> {
    const { stdoutJson: results } = await spawn('npm', [
      'query',
      '--quiet',
      '--json',
      '.workspace',
    ], { cwd: this.rootDir });

    return (
      results.map((result): string => {
        return (
          result
            .at('realpath')
            .as('string')
            ?? result
              .at('path')
              .as('string')!
        );
      }) ?? []
    );
  }

  async getPublished(id: string, version: string): Promise<PackageMetadata | null> {
    const { stdoutJson, ok } = await spawn(
      'npm',
      [
        'show',
        '--quiet',
        '--json',
        `${id}@<=${version}`,
        'version',
        'gitHead',
      ],
      { cwd: this.rootDir, allowNonZeroExitCode: true },
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

    return {
      version: first.version,
      gitHead: typeof first.gitHead === 'string' ? first.gitHead : null,
    };
  }
}
