import nodePath from 'node:path';
import nodeUrl from 'node:url';

import { fs } from '@wurk/fs';
import { type JsonAccessor } from '@wurk/json';
import { log } from '@wurk/log';
import { type PackageManager } from '@wurk/pm';

import { type Command, CommandFactory } from './command.js';
import { resolve } from './resolve.js';

export const loadCommandPlugins = async (
  pm: PackageManager,
  config: JsonAccessor,
): Promise<Command[]> => {
  const ids = Array.from(new Set([
    ...[
      ...config
        .at('dependencies')
        .keys('object'),
      ...config
        .at('devDependencies')
        .keys('object'),
      ...config
        .at('peerDependencies')
        .keys('object'),
      ...config
        .at('optionalDependencies')
        .keys('object'),
    ]
      .filter((packageId) => /^(?:(?:.*\/)?w[eu]rk-command-|@(?:werk|wurk)\/command-).*$/u.test(packageId)),
  ]))
    .sort();

  const commands: Command[] = [];

  for (const id of ids) {
    const command = await loadCommandPlugin(pm, id);

    if (command) {
      commands.push(command);
    }
  }

  return commands;
};

const loadCommandPlugin = async (
  pm: PackageManager,
  id: string,
): Promise<Command | null> => {
  try {
    const entry = await resolve(id, pm.rootDir);
    const exports: undefined | { default?: unknown } = await import(entry);

    if (!(exports?.default instanceof CommandFactory)) {
      log.debug`invalid default export from command package "${id}"`;
      return null;
    }

    const config = await getCommandConfig(entry, id);

    if (!config) {
      log.debug`could not find package.json for command package "${id}"`;
      return null;
    }

    return exports.default.load(pm, config);
  }
  catch (error) {
    log.debug`could not load command package "${id}"`;
    log.debug({ message: error });
    return null;
  }
};

const getCommandConfig = async (
  entry: string,
  id: string,
): Promise<JsonAccessor | null> => {
  let dir = nodePath.dirname(nodeUrl.fileURLToPath(entry));

  do {
    const config = await fs.readJson(nodePath.join(dir, 'package.json'));
    const name = config
      .at('name')
      .as('string');

    if (name === id) {
      return config;
    }
  } while (dir !== (dir = nodePath.dirname(dir)));

  return null;
};
