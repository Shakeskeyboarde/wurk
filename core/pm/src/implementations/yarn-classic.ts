import { type SpawnOptions, type SpawnResult } from '@wurk/spawn';

import {
  PackageManager,
  type PackageManagerConfig,
  type PackageMetadata,
} from '../pm.js';

export class YarnClassic extends PackageManager {
  constructor(config: PackageManagerConfig) {
    super('yarn-classic', config);
  }

  getWorkspaces(): Promise<readonly string[]> {
    throw new Error('not implemented');
  }

  getMetadata(
    id: string,
    versionRange?: string | undefined,
  ): Promise<PackageMetadata | null> {
    throw new Error('not implemented');
  }

  spawnPackageScript(
    script: string,
    args?: readonly string[],
    options?: SpawnOptions | undefined,
  ): Promise<SpawnResult> {
    throw new Error('not implemented');
  }

  spawnNode(
    args: readonly string[],
    options?: SpawnOptions | undefined,
  ): Promise<SpawnResult> {
    throw new Error('not implemented');
  }

  restore(): Promise<void> {
    throw new Error('not implemented');
  }
}
