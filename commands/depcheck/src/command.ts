import path from 'node:path';

import { createCommand } from 'wurk';

import { DependencySet } from './dependency-set.js';
import { getSourcesIterator } from './get-sources-iterator.js';

export default createCommand('depcheck', {
  config: (cli) => {
    return cli.option('--fix', 'remove unused dependencies');
  },

  run: async ({ workspaces, options }) => {
    await workspaces.forEachSequential(async (workspace) => {
      const { log, name, fs, git, spawn } = workspace;

      log.prefix = '';
      log.debug(`checking workspace "${name}":`);

      const ignored = await git.getIgnored();
      const sourcesIterator = getSourcesIterator(fs);
      const dependencies = new DependencySet(workspace);

      while (dependencies.size) {
        const { value: filename } = await sourcesIterator.next();

        if (filename == null) break;
        if (ignored.some((ignore) => !path.relative(ignore, filename).startsWith('..'))) continue;

        log.debug(`  - ${filename}`);

        if (/\.(?:jsx|tsx)$/u.test(filename)) {
          await dependencies.removeUsed('react');
        }

        const content = await fs.readText(filename);
        const matches = content.matchAll(
          /\b(?:require|import)\(\s*(['"`])((?:@[\w.-]+\/)?\w[\w.-]*)(?:\/[\w.-]+)?\1|(?:\bfrom|^import)\s+(['"`])((?:@[\w.-]+\/)?\w[\w.-]*)(?:\/[\w.-]+)?\3/gmu,
        );

        await Promise.all(
          Array.from(matches)
            .map((match) => (match[2] || match[4])!)
            .map(async (dependency) => {
              await dependencies.removeUsed(dependency);
              log.debug(`    - ${dependency}`);
            }),
        );
      }

      if (!dependencies.size) {
        log.debug(`  all dependencies are used in "${name}"`);
        return;
      }

      if (options.fix) {
        await spawn('npm', ['remove', ...dependencies]);
        return;
      }

      process.exitCode ||= 1;
      log.print(`unused dependencies in "${name}":`);
      Array.from(dependencies).forEach((dependency) => log.print(`  - ${dependency}`));
    });
  },
});
