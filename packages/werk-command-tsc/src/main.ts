import { randomUUID } from 'node:crypto';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

import { createCommand } from '@werk/cli';

export default createCommand({
  each: async ({ log, root, workspace, spawn }) => {
    if (!workspace.selected) return;

    const configs = (Array.isArray(workspace.config) ? workspace.config : [workspace.config]).filter(
      (config) => typeof config === 'object' && config !== null,
    );

    const [packageJson, fromFiles, ...fromPackage] = await Promise.all([
      workspace.readPackageJson(),
      readdir(workspace.dir, { withFileTypes: true }).then((entries) => {
        return entries.flatMap((entry) =>
          (entry.isFile() || entry.isSymbolicLink()) && /^tsconfig\..*build.*\.json$/u.test(entry.name)
            ? { name: basename(entry.name), filename: resolve(workspace.dir, entry.name) }
            : [],
        );
      }),
      ...configs.map(async (config, i) => {
        const filename = resolve(workspace.dir, `tsconfig.build-${randomUUID()}.json`);
        const extendsFilename = await Promise.all(
          [workspace.dir, root.dir]
            .map((dir) => join(dir, 'tsconfig.json'))
            .map((extendFilename) =>
              stat(extendFilename)
                .then((stats): false | string => stats.isFile() && extendFilename)
                .catch((): false => false),
            ),
        ).then((values) => values.find((value): value is string => Boolean(value)));

        await workspace.saveAndRestoreFile(filename);
        await writeFile(filename, JSON.stringify({ extends: extendsFilename, ...config }, null, 2));

        return { name: `package.json[${i}]`, filename };
      }),
    ]);

    const isRootEsm = packageJson.type === 'module';

    for (const { name, filename } of [...fromFiles, ...fromPackage]) {
      log.notice(`Building workspace "${workspace.name}" configuration "${name}".`);
      await spawn('tsc', ['-p', filename], { cwd: workspace.dir, echo: true });

      const config = await spawn('tsc', ['-p', filename, '--showConfig'], {
        cwd: workspace.dir,
        capture: true,
      }).getJson<{
        compilerOptions?: {
          noEmit?: boolean;
          emitDeclarationOnly?: Boolean;
          outDir?: string;
          module?: string;
          target?: string;
        };
      }>();

      const configNoEmit = config.compilerOptions?.noEmit ?? false;
      const configEmitDeclarationOnly = config.compilerOptions?.emitDeclarationOnly ?? false;
      const configOutDir = resolve(workspace.dir, config.compilerOptions?.outDir ?? '.');
      const configTarget = config.compilerOptions?.target?.toLowerCase() ?? 'es3';
      const configModule =
        config.compilerOptions?.module?.toLowerCase() ??
        (configTarget === 'es3' || configTarget === 'es5' ? 'commonjs' : 'es6');
      const isEsm =
        configModule === 'commonjs'
          ? false
          : configModule.startsWith('es')
          ? true
          : configModule.startsWith('node')
          ? isRootEsm
          : null;

      if (isEsm === null || configNoEmit || configEmitDeclarationOnly || relative(configOutDir, workspace.dir) === '') {
        continue;
      }

      const outputPackageJsonFilename = join(configOutDir, 'package.json');

      // Write a package.json to the output directory which explicitly
      // sets the module type (CommonJS or ESM) to match the build output.
      await writeFile(outputPackageJsonFilename, `{ "type": "${isEsm ? 'module' : 'commonjs'}" }`).catch(() => {
        log.debug(`Failed to create "${outputPackageJsonFilename}".`);
      });
    }
  },
});
