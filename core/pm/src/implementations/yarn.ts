import nodePath from 'node:path';

import { JsonAccessor } from '@wurk/json';
import { mergeSpawnOptions, spawn, type SpawnOptions, type SpawnResult } from '@wurk/spawn';
import semver from 'semver';

import {
  PackageManager,
  type PackageMetadata,
} from '../pm.js';

export class Yarn extends PackageManager {
  constructor(rootDir: string, rootConfig: JsonAccessor) {
    super(rootDir, rootConfig, 'yarn');
  }

  async getWorkspaces(): Promise<readonly string[]> {
    const { ok, stdoutText } = await spawn('yarn', [
      '--json',
      'workspaces',
      'info',
    ], { cwd: this.rootDir, allowNonZeroExitCode: true });

    if (!ok) return [];

    return stdoutText.split(/\n/u)
      .filter(Boolean)
      .map((line) => JsonAccessor.parse(line)
        .at('location')
        .as('string')!)
      .map((location) => nodePath.resolve(this.rootDir, location))
      // Filters out the root package.
      .filter((location) => Boolean(nodePath.relative(this.rootDir, location)));
  }

  async getPublished(id: string, version: string): Promise<PackageMetadata | null> {
    const { stdoutJson, ok } = await spawn(
      'yarn',
      [
        'npm',
        'info',
        '--json',
        `${id}@<=${version}`,
        ['-f', 'version,gitHead'],
      ],
      { cwd: this.rootDir, allowNonZeroExitCode: true },
    );

    if (!ok) return null;

    const info = stdoutJson.as((value): value is { version: string; gitHead?: unknown } => {
      return (
        value != null
        && typeof value === 'object'
        && 'version' in value
        && typeof value.version === 'string'
      );
    })!;

    if (!semver.satisfies(info.version, `<=${version}`)) {
      // XXX: Yarn is dumb. It returns the latest version if it can't satisfy
      // the version range. So we have to check it ourselves.
      return null;
    }

    return {
      version: info.version,
      gitHead: typeof info.gitHead === 'string' ? info.gitHead : null,
    };
  }

  override async _spawnNode(args: readonly string[], options?: SpawnOptions): Promise<SpawnResult> {
    return await spawn('yarn', ['node', args], mergeSpawnOptions({ cwd: this.rootDir }, options));
  }
}
