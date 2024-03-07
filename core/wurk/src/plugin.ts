import { importRelative } from '@wurk/import';
import { type JsonAccessor } from '@wurk/json';
import { log } from '@wurk/log';

import { type Command, CommandFactory } from './command.js';

const loadCommandPlugin = async (
  rootDir: string,
  packageId: string,
): Promise<Command | null> => {
  try {
    const result = await importRelative(packageId, { cwd: rootDir });

    if (result == null) {
      log.error`package "${packageId}" could not be imported`;
      return null;
    }

    if (!(result.exports.default instanceof CommandFactory)) {
      log.error`package "${packageId}" command factory returned an invalid command`;
      return null;
    }

    return result.exports.default.load(result.config);
  } catch (error) {
    log.debug`loading command package "${packageId}" threw the following error:`;
    log.debug({ message: error });
    return null;
  }
};

export const loadCommandPlugins = async (
  rootDir: string,
  rootConfig: JsonAccessor,
): Promise<Command[]> => {
  const packageIds = Array.from(
    new Set([
      ...[
        ...rootConfig.at('dependencies').keys('object'),
        ...rootConfig.at('devDependencies').keys('object'),
        ...rootConfig.at('peerDependencies').keys('object'),
        ...rootConfig.at('optionalDependencies').keys('object'),
      ].filter((packageId) =>
        /^(?:(?:.*\/)?w[eu]rk-command-|@(?:werk|wurk)\/command-).*$/u.test(
          packageId,
        ),
      ),
    ]),
  ).sort();

  const commands = await Promise.all(
    packageIds.map((packageId) => loadCommandPlugin(rootDir, packageId)),
  );

  return commands.filter((value): value is Command => value != null);
};
