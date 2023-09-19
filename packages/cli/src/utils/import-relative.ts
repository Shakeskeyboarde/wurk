import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { type PackageJson } from './package-json.js';

interface Options {
  /**
   * Starting directory for import resolution. Defaults to `process.cwd()`.
   */
  dir?: string;
}

export interface ResolvedImport<TExports extends Record<string, any> = Record<string, unknown>> {
  dir: string;
  packageJson: PackageJson;
  entry: string;
  exports: TExports;
}

/**
 * Do a NodeJS ESM import relative to a directory, using the package.json
 * exports field, if available.
 */
export const importRelative = async <TExports extends Record<string, any> = Record<string, unknown>>(
  name: string,
  { dir = process.cwd() }: Options = {},
): Promise<ResolvedImport<TExports>> => {
  const match = name.match(/^((?:@[^/]*\/)?[^/]*)(\/.*)?$/u);

  if (!match) return await import(name);

  const id = match[1]!;
  const pathPart = match[2] ? `./${match[2]}` : '.';
  const packageDir = resolve(dir, 'node_modules', id);

  return await readFile(join(packageDir, 'package.json'), 'utf8')
    .then(JSON.parse)
    .then((packageJson): { entry: string; packageJson: PackageJson } | undefined => {
      const entry = [
        ...(pathPart === '.'
          ? [
              packageJson.exports,
              packageJson.exports?.import,
              packageJson.exports?.default,
              packageJson.exports?.node,
              packageJson.exports?.node?.import,
              packageJson.exports?.node?.default,
              packageJson.exports?.default,
              packageJson.exports?.default?.import,
              packageJson.exports?.default?.default,
            ]
          : []),
        packageJson.exports?.[pathPart],
        packageJson.exports?.[pathPart]?.import,
        packageJson.exports?.[pathPart]?.default,
        packageJson.exports?.node?.[pathPart],
        packageJson.exports?.node?.[pathPart]?.import,
        packageJson.exports?.node?.[pathPart]?.default,
        packageJson.exports?.default?.[pathPart],
        packageJson.exports?.default?.[pathPart]?.import,
        packageJson.exports?.default?.[pathPart]?.default,
        packageJson.module,
        packageJson.main,
      ].find((value): value is string => typeof value === 'string');

      return entry ? { entry, packageJson } : undefined;
    })
    .catch(() => undefined)
    .then(async (resolved) => {
      if (resolved == null) {
        const parentDir = dirname(dir);

        if (parentDir === dir) throw new Error('Module not found.');

        return await importRelative(name, { dir: parentDir });
      }

      const exports = await import(join(packageDir, resolved.entry));

      return { dir: packageDir, exports, ...resolved };
    });
};
