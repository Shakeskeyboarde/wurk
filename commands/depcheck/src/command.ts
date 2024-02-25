import path from 'node:path';

import { createCommand, parseImport } from 'wurk';

const SOURCE_EXTENSIONS: readonly string[] = [
  'js',
  'cjs',
  'mjs',
  'jsx',
  'ts',
  'mts',
  'cts',
  'tsx',
];

export default createCommand('depcheck', {
  config: (cli) => {
    return cli.option('--fix', 'remove unused dependencies');
  },

  action: async ({ workspaces, options }) => {
    await workspaces.forEachSequential(async (workspace) => {
      const { log, name, config, git, fs, importRelativeResolve, spawn } =
        workspace;

      log.prefix = '';
      log.debug(`checking workspace "${name}":`);

      const ignored = await git.getIgnored();

      const unusedDependencies = new Set<string>([
        ...config.at('dependencies').keys('object'),
        ...config.at('peerDependencies').keys('object'),
        ...config.at('optionalDependencies').keys('object'),
      ]);

      const removeUsedDependency = async (initialId: string): Promise<void> => {
        const ids = initialId.startsWith('@types/')
          ? // The name is already a types package, so no other packages are used.
            [initialId]
          : // The name is an implementation package, so the types packages is also used.
            [
              `@types/${initialId.startsWith('@') ? initialId.slice(1).replace('/', '__') : initialId}`,
              initialId,
            ];

        for (const id of ids) {
          if (!unusedDependencies.delete(id)) continue;

          const imported = await importRelativeResolve(id).catch(
            () => undefined,
          );
          const peerIds =
            imported?.moduleConfig.at('peerDependencies').keys('object') ?? [];

          for (const peerId of peerIds) {
            await removeUsedDependency(peerId);
          }
        }
      };

      await fs.readDir('.', async (entry) => {
        // Abort if all dependencies are used.
        if (!unusedDependencies.size) return false;
        // Skip Git ignored files and directories.
        if (ignored.includes(entry.fullpath)) return;

        entry.recurse();

        const ext = path.extname(entry.name).slice(1);

        // Skip non-source files.
        if (!entry.isFile() || !SOURCE_EXTENSIONS.includes(ext)) return;

        if (ext === 'jsx' || ext === 'tsx') {
          unusedDependencies.delete('react');
          unusedDependencies.delete('@types/react');
        }

        const content = await fs.readText(entry.fullpath);

        // File doesn't exist or is not accessible.
        if (!content) return;

        log.debug(`- ${fs.relative(entry.fullpath)}`);

        const moduleIds = new Set(
          Array.from(
            content.matchAll(
              /\b(?:require|import)\(\s*(['"`])([^'"`]+)\1\s*\)|(?:\bfrom|^import)\s+(['"`])([^'"`]+)\3/gmu,
            ),
          )
            .map((match) => match[2] || match[4])
            .map((spec) => spec && parseImport(spec).moduleId)
            .filter((spec): spec is string => Boolean(spec)),
        );

        for (const moduleId of moduleIds) {
          log.debug(`- ${moduleId}`);
          await removeUsedDependency(moduleId);
        }
      });

      if (!unusedDependencies.size) {
        log.debug(`  all dependencies are used in "${name}"`);
        return;
      }

      if (options.fix) {
        await spawn('npm', ['remove', ...unusedDependencies]);
        return;
      }

      process.exitCode ||= 1;
      log.print(`unused dependencies in "${name}":`);
      Array.from(unusedDependencies).forEach((dependency) => {
        log.print(`- ${dependency}`);
      });
    });
  },
});
