import fs from 'node:fs';

import { createCommand } from 'wurk';

import { DependencySet } from './dependency-set.js';
import { getSourcesIterator } from './get-sources-iterator.js';

export default createCommand('depcheck', {
  config: (cli) => {
    return cli.option('--fix', 'remove unused dependencies');
  },

  run: async ({ workspaces, options }) => {
    await workspaces.forEachSequential(async (workspace) => {
      const { log, name, dir, spawn } = workspace;

      log.prefix = '';
      log.debug(`checking workspace "${name}":`);

      const sourcesIterator = getSourcesIterator(dir);
      const dependencies = new DependencySet(workspace);

      while (dependencies.size) {
        const { value: filename } = await sourcesIterator.next();

        if (filename == null) break;

        log.debug(`  - ${filename}`);

        const content = await fs.promises.readFile(filename, 'utf-8');
        const matches = content.matchAll(
          /\b(?:require|import)\(\s*(['"`])((?:@[\w.-]+\/)?\w[\w.-]*)(?:\/[\w.-]+)?\1|(?:\bfrom|^import)\s+(['"`])((?:@[\w.-]+\/)?\w[\w.-]*)(?:\/[\w.-]+)?\3/gmu,
        );

        await Promise.all(
          Array.from(matches)
            .map((match) => (match[2] || match[4])!)
            .map(async (dependency) => {
              await dependencies.removedUsed(dependency);
              log.debug(`    - ${dependency}`);
            }),
        );
      }

      if (!dependencies.size) {
        log.debug(`  all dependencies are used in "${name}"`);
        return;
      }

      if (!options.fix) {
        process.exitCode ||= 1;
        log.print(`unused dependencies in "${name}":`);
        Array.from(dependencies).forEach((dependency) => log.print(`  - ${dependency}`));
        return;
      }

      await spawn('npm', ['-w', name, 'remove', ...dependencies], { output: 'echo' });
    });
  },
});
