import nodePath from 'node:path';

import { JsonAccessor } from '@wurk/json';
import { spawn, type SpawnOptions, type SpawnResult } from '@wurk/spawn';
import semver from 'semver';

import {
  PackageManager,
  type PackageMetadata,
} from '../pm.js';

/**
 * Package manager implementation for Yarn.
 */
export class Yarn extends PackageManager {
  /**
   * Create a new Yarn package manager instance.
   */
  constructor(rootDir: string, rootConfig: JsonAccessor) {
    super(rootDir, rootConfig, 'yarn');
  }

  /**
   * Get the workspaces in the current project.
   */
  async getWorkspaces(): Promise<readonly string[]> {
    const { ok, stdoutText } = await spawn('yarn', [
      '--json',
      'workspaces',
      'list',
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

  /**
   * Get publication information for the package.
   */
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

  /**
   * Spawn a Node.js process using Yarn so that PnP works.
   */
  override async spawnNode(args: readonly string[], ...options: SpawnOptions[]): Promise<SpawnResult> {
    return await spawn('yarn', ['node', args], { cwd: this.rootDir }, ...options);
  }
}
