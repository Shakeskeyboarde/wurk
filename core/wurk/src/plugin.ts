import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';
import nodeUrl from 'node:url';

import { JsonAccessor } from '@wurk/json';
import { log } from '@wurk/log';

import { type Command, CommandFactory } from './command.js';
import { resolve } from './resolve.js';

export const loadCommandPlugins = async (config: JsonAccessor, rootDir: string): Promise<Command[]> => {
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
    const command = await loadCommandPlugin(id, rootDir);

    if (command) {
      commands.push(command);
    }
  }

  return commands;
};

const loadCommandPlugin = async (id: string, rootDir: string): Promise<Command | null> => {
  try {
    const entry = await resolve(id, rootDir);
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

    return exports.default.load(config);
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
    const configFilename = nodePath.join(dir, 'package.json');
    const config = await nodeFs.readFile(configFilename, 'utf8')
      .catch((error: any) => {
        if (error?.code === 'ENOENT') return '';
        throw error;
      })
      .then(JsonAccessor.parse);
    const name = config
      .at('name')
      .as('string');

    if (name === id) {
      return config;
    }
  } while (dir !== (dir = nodePath.dirname(dir)));

  return null;
};
