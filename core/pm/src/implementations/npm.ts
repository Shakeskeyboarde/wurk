import nodePath from 'node:path';

import { type JsonAccessor } from '@wurk/json';
import { spawn } from '@wurk/spawn';
import semver from 'semver';

import { PackageManager, type PackageMetadata } from '../pm.js';

export class Npm extends PackageManager {
  constructor(rootDir: string, rootConfig: JsonAccessor) {
    super(rootDir, rootConfig, 'npm');
  }

  async getWorkspaces(): Promise<readonly string[]> {
    const { ok, stdoutJson } = await spawn('npm', [
      'query',
      '--quiet',
      '--json',
      '.workspace',
    ], { cwd: this.rootDir, allowNonZeroExitCode: true });

    if (!ok) return [];

    return stdoutJson.map((result) => result
      .at('realpath')
      .as('string', () => result
        .at('path')
        .as('string')!))
      ?.map((path) => nodePath.resolve(this.rootDir, path))
      ?? [];
  }

  async getPublished(id: string, version: string): Promise<PackageMetadata | null> {
    const { stdoutJson, ok } = await spawn(
      'npm',
      [
        'info',
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

    const [info] = metaArray;

    if (!info) return null;

    return {
      version: info.version,
      gitHead: typeof info.gitHead === 'string' ? info.gitHead : null,
    };
  }
}
