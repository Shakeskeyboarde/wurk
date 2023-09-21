import { type CustomCommander } from '../commander/commander.js';
import { type Config } from '../config.js';
import { importRelative } from '../utils/import-relative.js';
import { type PackageJson } from '../utils/package-json.js';
import { type Command, isCommand } from './command.js';
import { createCommand } from './create-command.js';

export interface CommandPlugin {
  readonly command: Command<any, any, any>;
  readonly commandName: string;
  readonly commandDir: string;
  readonly commandMain: string;
  readonly commandPackage: PackageJson;
  readonly commander: CustomCommander;
}

const loadCommandPlugin = async (
  workspacesRoot: string,
  parentCommander: CustomCommander,
  name: string,
  packageId: string,
): Promise<CommandPlugin> => {
  try {
    const plugin = await importRelative(packageId, { dir: workspacesRoot }).catch((error) => {
      throw new Error('Plugin import failed.', { cause: error });
    });

    const { exports, entry: main, dir, packageJson } = plugin;

    if (exports.default == null) {
      throw new Error('Plugin has no default export.');
    }

    if (!isCommand(exports.default)) {
      throw new Error(
        'Plugin default export is not a valid Werk command. It may not be compatible with the version of Werk in your project.',
      );
    }

    const commander = parentCommander.createCommand(name);

    if (packageJson.description) {
      commander.description(packageJson.description);
    }

    exports.default.config(commander, name);

    if (packageJson.version) {
      commander.version(packageJson.version, '-v, --version', 'Display the current version.');
    }

    return {
      command: exports.default,
      commandName: name,
      commandDir: dir,
      commandMain: main,
      commandPackage: packageJson,
      commander,
    };
  } catch (error) {
    return {
      command: createCommand({
        before: async ({ log }) => {
          log.error(`Command "${name}" (id: ${packageId}) failed to load.`);
          log.error();

          throw error;
        },
      }) as Command<any, any, any>,
      commandName: name,
      commandDir: '',
      commandMain: '',
      commandPackage: {},
      commander: parentCommander
        .createCommand(name)
        .description(`<load_error>`)
        .helpOption(false)
        .allowExcessArguments()
        .allowUnknownOption(),
    };
  }
};

export const loadCommandPlugins = async (
  config: Pick<Config, 'rootPackage' | 'commandPackageIds'>,
  parentCommander: CustomCommander,
): Promise<CommandPlugin[]> => {
  const resolved = new Map(Object.entries(config.commandPackageIds));

  Object.keys({
    ...config.rootPackage.dependencies,
    ...config.rootPackage.devDependencies,
    ...config.rootPackage.peerDependencies,
    ...config.rootPackage.optionalDependencies,
  })
    .sort()
    .forEach((packageId) => {
      const match = packageId.match(/^(?:(?:.*\/)?werk-command-|@werk\/command-)(.*)$/u);
      const name = match?.[1];

      if (!name || resolved.has(name)) return;

      resolved.set(name, packageId);
    });

  return await Promise.all(
    [...resolved.entries()].map(async ([name, packageId]) => {
      return await loadCommandPlugin(config.rootPackage.dir, parentCommander, name, packageId);
    }),
  );
};
