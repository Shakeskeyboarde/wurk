import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

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

let promise = Promise.resolve();
let exitCode = 0;

export default createCommand({
  config: (commander) => {
    return commander.option('--fix', 'Remove unused dependencies.');
  },
  each: async ({ log, root, workspace, opts, spawn }) => {
    const filenames = await getFilenames(workspace.dir);
    const isReact = filenames.some((filename) => /\.(?:jsx|tsx)$/u.test(filename));
    const unused = new Set(
      Object.keys({
        ...workspace.dependencies,
        ...workspace.peerDependencies,
        ...workspace.optionalDependencies,
      }),
    );

    if (isReact) {
      unused.delete('react');
      unused.delete('@types/react');
    }

    /**
     * Remove all dependencies that appear to be used in a source file.
     */
    for (const filename of filenames) {
      const content = await readFile(filename, 'utf-8');

      for (const dependency of unused) {
        const pattern = new RegExp(
          `\\b(?:require|import)\\((['"\`])${dependency}(?:\\1|/)|\\bfrom\\s+(['"\`])${dependency}(?:\\2|/)`,
          'u',
        );

        if (pattern.test(content)) {
          unused.delete(dependency);

          if (!dependency.startsWith('@types/')) {
            unused.delete(getTypesName(dependency));
          }
        }
      }

      if (unused.size === 0) return;
    }

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
