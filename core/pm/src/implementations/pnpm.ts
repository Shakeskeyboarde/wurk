import { type SpawnOptions, type SpawnPromise } from '@wurk/spawn';

import {
  PackageManager,
  type PackageManagerConfig,
  type PackageMetadata,
} from '../pm.js';

export class Pnpm extends PackageManager {
  constructor(config: PackageManagerConfig) {
    super('pnpm', config);
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
  ): SpawnPromise {
    throw new Error('not implemented');
  }

  spawnNode(
    args: readonly string[],
    options?: SpawnOptions | undefined,
  ): SpawnPromise {
    throw new Error('not implemented');
  }

  restore(): Promise<void> {
    throw new Error('not implemented');
  }
}
