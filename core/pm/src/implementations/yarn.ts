import { mergeSpawnOptions, spawn, type SpawnOptions, type SpawnResult } from '@wurk/spawn';

import {
  PackageManager,
  type PackageManagerConfig,
  type PackageMetadata,
} from '../pm.js';

export class Yarn extends PackageManager {
  constructor(config: PackageManagerConfig) {
    super(config, 'yarn');
  }

  getWorkspaces(): Promise<readonly string[]> {
    throw new Error('not implemented');
  }

  getPublished(id: string, version: string): Promise<PackageMetadata | null> {
    throw new Error('not implemented');
  }

  override async _spawnNode(args: readonly string[], options?: SpawnOptions): Promise<SpawnResult> {
    return await spawn('yarn', ['node', args], mergeSpawnOptions({ cwd: this.rootDir }, options));
  }
}
