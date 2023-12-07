import fs from 'node:fs';
import path from 'node:path';

import { getUsedNames } from './get-used-names.js';

export class DependencySet {
  readonly #dir: string;
  readonly #dependencies = new Set<string>();

  get size(): number {
    return this.#dependencies.size;
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.#dependencies[Symbol.iterator]();
  }

  constructor(dir: string, dependencies: Iterable<string>) {
    this.#dir = dir;
    this.#dependencies = new Set(dependencies);
  }

  readonly removedUsed = async (name: string): Promise<void> => {
    await Promise.all(
      getUsedNames(name).map(async (used) => {
        if (!this.#dependencies.delete(used)) return;

        const peers = await this.#getPeers(this.#dir, used);

        await Promise.all(peers.map(this.removedUsed));
      }),
    );
  };

  readonly #getPeers = async (dir: string, name: string): Promise<string[]> => {
    const packageJson = await this.#getPackageJson(dir, name);

    return packageJson?.peerDependencies ? Object.keys(packageJson.peerDependencies) : [];
  };

  readonly #getPackageJson = async (
    dir: string,
    name: string,
  ): Promise<{ peerDependencies?: Record<string, string> } | null> => {
    try {
      const packageText = await fs.promises.readFile(path.resolve(dir, 'node_modules', name, 'package.json'), 'utf-8');

      return JSON.parse(packageText);
    } catch {
      const parent = path.dirname(dir);

      if (parent === dir) return null;

      return await this.#getPackageJson(parent, name);
    }
  };
}
