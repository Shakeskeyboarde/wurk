import nodePath from 'node:path';

import { spawn } from '@wurk/spawn';
import semver from 'semver';

import {
  PackageManager,
  type PackageManagerConfig,
  type PackageMetadata,
} from '../pm.js';

export class Pnpm extends PackageManager {
  constructor(config: PackageManagerConfig) {
    super(config, 'pnpm');
  }

  async getWorkspaces(): Promise<readonly string[]> {
    const { ok, stdoutJson } = await spawn('pnpm', [
      'recursive',
      'list',
      '--json',
      '--depth=1',
    ], { cwd: this.rootDir, allowNonZeroExitCode: true });

    if (!ok) return [];

    return stdoutJson.map((result) => {
      return result.at('path')
        .as('string')!;
    })
      ?.map((path) => nodePath.resolve(this.rootDir, path))
      // Filters out the root package
      ?.filter((path) => Boolean(nodePath.relative(this.rootDir, path)))
      ?? [];
  }

  async getPublished(id: string, version: string): Promise<PackageMetadata | null> {
    const { stdoutJson, ok } = await spawn(
      'pnpm',
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
