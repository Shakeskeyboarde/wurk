import fs from 'node:fs';
import path from 'node:path';

import { JsonAccessor } from '@wurk/json';
import semver from 'semver';

export interface ImportOptions {
  readonly dir?: string;
  readonly versionRange?: string;
}

export interface ImportParsed {
  readonly moduleId: string | null;
  readonly modulePath: string;
}

export interface ImportResolved {
  readonly moduleId: string;
  readonly modulePath: string;
  readonly moduleConfig: JsonAccessor;
  readonly moduleDir: string;
  readonly moduleEntry: string | null;
}

export interface ImportResult<TExports extends Record<string, any> = Record<string, unknown>> extends ImportResolved {
  readonly moduleExports: TExports;
}

/**
 * Import non-built-in [bare specifiers](https://nodejs.org/api/esm.html#import-specifiers)
 * relative to an arbitrary directory, instead of to the file where import is
 * used.
 *
 * The `versionRange` option can be a semver range, just like a dependency
 * in your `package.json` file.
 */
export const importRelative = async <TExports extends Record<string, any> = Record<string, unknown>>(
  spec: string,
  { dir = process.cwd(), versionRange }: ImportOptions = {},
): Promise<ImportResult<TExports>> => {
  const resolved = await resolveImport(spec, { dir });
  const { moduleId, moduleConfig, moduleDir, moduleEntry } = resolved;

  if (moduleEntry == null) {
    throw new Error(`package "${moduleId}" has no acceptable entry points`);
  }

  if (versionRange) {
    const version = moduleConfig.at('version').as('string');

    if (!version || !semver.satisfies(version, versionRange)) {
      throw new Error(`package "${moduleId}" does not satisfy "${versionRange}"`);
    }
  }

  return {
    ...resolved,
    moduleExports: await import(path.resolve(moduleDir, moduleEntry)),
  };
};

/**
 * Resolve non-built-in [bare specifiers](https://nodejs.org/api/esm.html#import-specifiers)
 * relative to an arbitrary directory, instead of to the file where import is
 * used.
 */
export const resolveImport = async (
  spec: string,
  { dir = process.cwd() }: Pick<ImportOptions, 'dir'> = {},
): Promise<ImportResolved> => {
  const { moduleId, modulePath } = parseImport(spec);

  if (moduleId == null) {
    throw new Error(`relative import only supports non-builtin bare specifiers`);
  }

  const configFilename = await findPackage(dir, moduleId);

  if (!configFilename) {
    throw new Error(`package "${moduleId}" not found`);
  }

  const moduleConfig = await fs.promises.readFile(configFilename, 'utf8').then(JsonAccessor.parse);
  const entries = moduleConfig.compose((root) => {
    return {
      exports: root.at('exports').as(['string', 'object']),
      module: root.at('module').as('string'),
      main: root.at('main').as('string'),
    };
  });

  const moduleDir = path.dirname(configFilename);

  if (entries.exports != null) {
    for (const { entry: moduleEntry, conditions } of exportsIterator(entries.exports)) {
      if (modulePath !== '.' && !conditions.includes(modulePath)) {
        continue;
      }

      if (!conditions.every((condition) => ['node', 'import', 'default', modulePath].includes(condition))) {
        continue;
      }

      return { moduleId, modulePath, moduleConfig, moduleDir, moduleEntry };
    }
  } else if (modulePath !== '.') {
    return { moduleId, modulePath, moduleConfig, moduleDir, moduleEntry: modulePath };
  } else if (entries.module != null) {
    return { moduleId, modulePath, moduleConfig, moduleDir, moduleEntry: entries.module };
  } else if (entries.main != null) {
    return { moduleId, modulePath, moduleConfig, moduleDir, moduleEntry: entries.main };
  }

  return { moduleId, modulePath, moduleConfig, moduleDir, moduleEntry: null };
};

/**
 * Parse in import specifier into module ID and module path. The ID may be
 * `null` if the specifier is not a [bare specifier](https://nodejs.org/api/esm.html#import-specifiers)
 */
export const parseImport = (spec: string): ImportParsed => {
  if (spec.startsWith('data:') || spec.startsWith('file:') || spec.startsWith('.') || spec.startsWith('/')) {
    return { moduleId: null, modulePath: spec };
  }

  const match = spec.match(/^((?:@[^@/]+\/)?[^@/.]*)((?:\/[^@/]+)*)$/u);

  if (!match) throw new Error(`invalid package "${spec}"`);

  const moduleId = match[1]!;
  const modulePath = match[2] ? `./${match[2]}` : '.';

  return { moduleId, modulePath };
};

const findPackage = async (dir: string, moduleId: string): Promise<string | undefined> => {
  const filename = path.resolve(dir, 'node_modules', ...moduleId.split('/'), 'package.json');
  const exists = await fs.promises
    .stat(filename)
    .then(() => true)
    .catch(() => false);

  if (exists) return filename;

  const parentDir = path.dirname(dir);

  if (parentDir === dir) return undefined;

  return await findPackage(parentDir, moduleId);
};

const exportsIterator = function* (
  value: unknown,
  conditions: string[] = [],
): Generator<{ entry: string; conditions: string[] }> {
  if (typeof value === 'string') {
    yield { entry: value, conditions };
  } else if (typeof value === 'object' && value != null) {
    for (const [condition, conditionValue] of Object.entries(value)) {
      yield* exportsIterator(conditionValue, [...conditions, condition]);
    }
  }
};
