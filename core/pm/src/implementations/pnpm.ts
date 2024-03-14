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

  getPublished(id: string, version: string): Promise<PackageMetadata | null> {
    throw new Error('not implemented');
  }
}
