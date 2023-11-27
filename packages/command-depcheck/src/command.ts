import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { createCommand } from '@werk/cli';

const getFilenames = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const promises = entries.map(async (entry) => {
    if (entry.isFile() && /\.(?:js|cjs|mjs|jsx|ts|mts|cts|tsx)$/u.test(entry.name)) return `${dir}/${entry.name}`;
    if (entry.isDirectory() && entry.name !== 'node_modules') return await getFilenames(`${dir}/${entry.name}`);
    return [];
  });

  return await Promise.all(promises).then((results) => results.flatMap((result) => result));
};

const getTypesName = (name: string): string => {
  const parts = name.split('/', 2);
  return parts.length === 1 ? `@types/${parts[0]}` : `@types/${parts[0]}__${parts[1]}`;
};

const getPackageJson = async (dir: string, name: string): Promise<{ peerDependencies?: Record<string, string> }> => {
  return await readFile(resolve(dir, 'node_modules', name, 'package.json'), 'utf-8')
    .then<{ peerDependencies?: Record<string, string> }>(JSON.parse)
    .catch(() => {
      const parent = dirname(dir);
      if (parent !== dir) return getPackageJson(parent, name);
      return {};
    });
};

const peersCache = new Map<string, Promise<string[]>>();

const getPeers = async (dir: string, ...names: string[]): Promise<string[]> => {
  const promises = [...names].map((name) => {
    let promise = peersCache.get(name);

    if (!promise) {
      promise = getPackageJson(dir, name)
        .then((packageJson) => (packageJson.peerDependencies ? Object.keys(packageJson.peerDependencies) : []))
        .catch((): string[] => []);

      peersCache.set(name, promise);
    }

    return promise;
  });

  return await Promise.all(promises).then((results) => [...new Set(results.flatMap((result) => result))]);
};

let promise = Promise.resolve();
let exitCode = 0;

export default createCommand({
  config: (commander) => {
    return commander.option('--fix', 'Remove unused dependencies.');
  },
  each: async ({ log, root, workspace, opts, spawn }) => {
    const filenames = await getFilenames(workspace.dir);
    const isReact = filenames.some((filename) => /\.(?:jsx|tsx)$/u.test(filename));
    const dependencies = new Set(
      Object.keys({
        ...workspace.dependencies,
        ...workspace.peerDependencies,
        ...workspace.optionalDependencies,
      }),
    );
    const unused = new Set(dependencies);
    const used = new Set<string>();
    const add = (name: string): string[] => {
      const result: string[] = [];

      if (unused.delete(name)) {
        used.add(name);
        result.push(name);
      }

      if (!name.startsWith('@types/')) {
        const typesName = getTypesName(name);

        if (unused.delete(typesName)) {
          used.add(name);
          result.push(typesName);
        }
      }

      return result;
    };

    if (isReact) add('react');

    /**
     * Convert all "@types/*" dependencies to their non-types equivalent,
     * because "@types/*" will never be imported directly.
     */
    for (const dependency of unused) {
      if (dependency.startsWith('@types/')) {
        unused.delete(dependency);
        unused.add(dependency.replace(/^@types\//u, ''));
      }
    }

    /**
     * Remove all dependencies that appear to be used in a source file.
     */
    for (const filename of filenames) {
      const content = await readFile(filename, 'utf-8');

      for (const dependency of unused) {
        const pattern = new RegExp(
          `\\b(?:require|import)\\((['"\`])${dependency}(?:\\1|/)|(?:\\bfrom|^import)\\s+(['"\`])${dependency}(?:\\2|/)`,
          'mu',
        );

        if (pattern.test(content)) add(dependency);
      }

      if (unused.size === 0) return;
    }

    const addPeers = async (...names: string[]): Promise<void> => {
      if (names.length === 0) return;

      const peers = await getPeers(workspace.dir, ...names);

      if (peers.length === 0) return;

      await Promise.all(
        peers.map(async (peer) => {
          const added = add(peer);
          /*
           * Recursive because an unused dependency might actually be
           * the peer of an installed peer.
           */
          await addPeers(...added);
        }),
      );
    };

    await addPeers(...used);

    if (unused.size === 0) return;

    if (!opts.fix) {
      log.info(
        `Unused dependencies in "${join(relative(root.dir, workspace.dir), 'package.json')}":${[...unused].reduce(
          (result, dependency) => `${result}\n  - ${dependency}`,
          '',
        )}`,
      );
      exitCode ||= 1;
      return;
    }

    promise = promise.then(async () => {
      await spawn('npm', ['remove', ...unused], {
        cwd: workspace.dir,
        errorEcho: true,
        errorReturn: true,
        errorSetExitCode: true,
      });

      log.info(
        `Removed dependencies from "${join(relative(root.dir, workspace.dir), 'package.json')}":${[...unused].reduce(
          (result, dependency) => `${result}\n  - ${dependency}`,
          '',
        )}`,
      );
    });
  },
  after: async () => {
    process.exitCode ||= exitCode;
  },
});
