import assert from 'node:assert';
import path from 'node:path';
import url from 'node:url';

import { fs } from '@wurk/fs';
import { JsonAccessor } from '@wurk/json';
import { spawn } from '@wurk/spawn';
import semver from 'semver';

export interface ImportOptions {
  readonly cwd?: string;
  readonly versionRange?: string;
}

export interface ImportResolved {
  readonly spec: string;
  readonly entry: string;
  readonly dir: string | null;
  readonly config: JsonAccessor;
}

export interface ImportResult<
  TExports extends Record<string, any> = Record<string, unknown>,
> extends ImportResolved {
  readonly exports: TExports;
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const EVAL_RESOLVE = await fs.readText(
  path.resolve(__dirname, 'eval', 'resolve.js'),
);

assert(EVAL_RESOLVE, 'failed to read "../eval/resolve.js"');

/**
 * Import non-built-in [bare specifiers](https://nodejs.org/api/esm.html#import-specifiers)
 * relative to an arbitrary directory, instead of to the file where import is
 * used.
 *
 * The `versionRange` option can be a semver range, just like a dependency
 * in your `package.json` file.
 */
export const importRelative = async <
  TExports extends Record<string, any> = Record<string, unknown>,
>(
  spec: string,
  options: ImportOptions = {},
): Promise<ImportResult<TExports> | null> => {
  const resolved = await importRelativeResolve(spec, options);

  if (resolved == null) {
    return null;
  }

  return { ...resolved, exports: await import(resolved.entry) };
};

/**
 * Resolve non-built-in [bare specifiers](https://nodejs.org/api/esm.html#import-specifiers)
 * relative to an arbitrary directory, instead of to the file where import is
 * used.
 */
export const importRelativeResolve = async (
  spec: string,
  options: ImportOptions = {},
): Promise<ImportResolved | null> => {
  const { cwd = process.cwd(), versionRange } = options;
  const entry = await spawn(
    process.execPath,
    ['--input-type=module', `--eval=${EVAL_RESOLVE}`, '--', spec],
    { cwd },
  ).stdoutText();

  if (!entry) return null;

  let dir: string | null = null;
  let config: JsonAccessor = new JsonAccessor();

  if (entry.startsWith('file:')) {
    const [packagePath] = await fs.findUp('package.json', {
      cwd: path.dirname(url.fileURLToPath(entry)),
      stopTraversingOnFound: true,
    });

    if (packagePath) {
      const packageFilename = packagePath.fullpath();
      const packageJson = await fs.readJson(packageFilename);
      const packageName = packageJson.at('name').as('string');

      if (
        packageName &&
        (spec === packageName || spec.startsWith(packageName + '/'))
      ) {
        dir = path.dirname(packageFilename);
        config = packageJson;
      }
    }
  }

  if (versionRange) {
    const version = config.at('version').as('string');

    if (!version || !semver.satisfies(version, versionRange)) {
      throw new Error(`package "${spec}" does not satisfy "${versionRange}"`);
    }
  }

  return { spec, entry, dir, config };
};
