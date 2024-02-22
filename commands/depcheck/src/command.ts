import { createCommand } from 'wurk';

import { Dependencies } from './dependencies.js';
import { getSourcesGenerator } from './sources.js';

export default createCommand('depcheck', {
  config: (cli) => {
    return cli.option('--fix', 'remove unused dependencies');
  },

  run: async ({ workspaces, options }) => {
    await workspaces.forEachSequential(async (workspace) => {
      const { log, name, fs, spawn } = workspace;

      log.prefix = '';
      log.debug(`checking workspace "${name}":`);

      const filenames = await getSourcesGenerator(workspace);
      const dependencies = new Dependencies(workspace);

      for await (const filename of filenames) {
        if (!dependencies.size) break;

        log.debug(`  - ${fs.relative(filename)}`);

        if (/\.(?:jsx|tsx)$/u.test(filename)) {
          await dependencies.removeUsed('react');
        }

        const content = await fs.readText(filename);

        // File doesn't exist or is not accessible.
        if (!content) continue;

        const matches = content?.matchAll(
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
