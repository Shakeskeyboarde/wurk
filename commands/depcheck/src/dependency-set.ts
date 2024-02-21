import { type Workspace } from 'wurk';

export class DependencySet {
  readonly #workspace: Workspace;
  readonly #dependencies = new Set<string>();

  get size(): number {
    return this.#dependencies.size;
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.#dependencies[Symbol.iterator]();
  }

  constructor(workspace: Workspace) {
    this.#workspace = workspace;
    this.#dependencies = new Set([
      ...workspace.config.at('dependencies').keys('object'),
      ...workspace.config.at('peerDependencies').keys('object'),
      ...workspace.config.at('optionalDependencies').keys('object'),
    ]);
  }

  readonly removedUsed = async (usedName: string): Promise<void> => {
    const names = usedName.startsWith('@types/')
      ? // The name is already a types package, so no other packages are used.
        [usedName]
      : // The name is an implementation package, so the types packages is also used.
        [`@types/${usedName.startsWith('@') ? usedName.slice(1).replace('/', '__') : usedName}`, usedName];

    await Promise.all(
      names.map(async (name) => {
        if (!this.#dependencies.delete(name)) return;

        const imported = await this.#workspace.fs.import(name).catch(() => undefined);
        const peers = imported?.moduleConfig.at('peerDependencies').keys('object') ?? [];

        await Promise.all(peers.map(this.removedUsed));
      }),
    );
  };
}
