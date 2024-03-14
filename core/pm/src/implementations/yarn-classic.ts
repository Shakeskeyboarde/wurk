import {
  PackageManager,
  type PackageManagerConfig,
  type PackageMetadata,
} from '../pm.js';

export class YarnClassic extends PackageManager {
  constructor(config: PackageManagerConfig) {
    super(config, 'yarn-classic', 'yarn');
  }

  getWorkspaces(): Promise<readonly string[]> {
    throw new Error('not implemented');
  }

  getPublished(id: string, version: string): Promise<PackageMetadata | null> {
    throw new Error('not implemented');
  }
}
