import { randomUUID } from 'node:crypto';
import { readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { createCommand } from '@werk/cli';

export default createCommand({
  each: async ({ log, workspace, spawn }) => {
    if (!workspace.selected) return;

    const configs = (Array.isArray(workspace.config) ? workspace.config : [workspace.config]).filter(
      (config) => typeof config === 'object' && config !== null,
    );

    const [fromFiles, ...fromPackage] = await Promise.all([
      readdir(workspace.dir, { withFileTypes: true }).then((entries) => {
        return entries.flatMap((entry) =>
          (entry.isFile() || entry.isSymbolicLink()) && /^tsconfig\..*build.*\.json$/u.test(entry.name)
            ? { name: basename(entry.name), filename: resolve(workspace.dir, entry.name) }
            : [],
        );
      }),
      ...configs.map(async (config, i) => {
        const filename = resolve(workspace.dir, `tsconfig.build-${randomUUID()}.json`);
        await workspace.saveAndRestoreFile(filename);
        await writeFile(filename, JSON.stringify({ extends: './tsconfig.json', ...config }, null, 2));
        return { name: `package.json[${i}]`, filename };
      }),
    ]);

    for (const { name, filename } of [...fromFiles, ...fromPackage]) {
      log.notice(`Building workspace "${workspace.name}" configuration "${name}".`);
      await spawn('tsc', ['-p', filename], { cwd: workspace.dir, echo: true });
    }
  },
});
