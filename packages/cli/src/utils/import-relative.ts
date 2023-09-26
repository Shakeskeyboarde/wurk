import { readFile } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { satisfies } from 'semver';

import { type PackageJson } from './package-json.js';

interface Options {
  /**
   * Starting directory for import resolution. Defaults to `process.cwd()`.
   */
  dir?: string;
  /**
   * Semver version range to match. Defaults to `*`.
   */
  version?: string;
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
  { dir = process.cwd(), version }: Options = {},
): Promise<ResolvedImport<TExports>> => {
  const match = name.match(/^((?:@[^/]*\/)?[^/]*)(\/.*)?$/u);

  if (!match) throw new Error(`Relatively importing non-bare specifier "${name}" is not supported.`);

  const id = match[1]!;

  if (isBuiltin(id)) throw new Error(`Relatively importing built-in module "${id}" is not supported.`);

  const pathPart = match[2] ? `./${match[2]}` : '.';
  const next = async (current: string): Promise<ResolvedImport<TExports>> => {
    const packageDir = resolve(current, 'node_modules', id);

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
          const parentDir = dirname(current);

          if (parentDir === current) throw new Error(`Package "${id}" not found.`);

          return await next(parentDir);
        }

        if (version) {
          if (!resolved.packageJson.version) {
            throw new Error(`Package "${id}" has no version.`);
          }

          if (!satisfies(resolved.packageJson.version, version)) {
            throw new Error(
              `Package ${id}" version "${resolved.packageJson.version}" does not satisfy range "${version}".`,
            );
          }
        }

        const entryPath = join(packageDir, resolved.entry);
        const exports = await import(entryPath);

        return { dir: packageDir, exports, ...resolved };
      });
  };

  return await next(dir);
};
