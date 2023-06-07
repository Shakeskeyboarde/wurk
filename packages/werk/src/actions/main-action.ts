import { commandAction } from '../actions/command-action.js';
import { loadCommand } from '../command/load-command.js';
import { type Commander, getCommanderMetadata } from '../commander/commander.js';
import { CleanupContext } from '../context/cleanup-context.js';
import { type GlobalOptions } from '../options.js';

interface MainActionOptions {
  readonly commander: Commander<any, any>;
  readonly cmd: string;
  readonly cmdArgs: readonly string[];
  readonly globalOptions: GlobalOptions;
}

export const mainAction = async ({ commander, cmd, cmdArgs, globalOptions }: MainActionOptions): Promise<void> => {
  const [globalNodeModules, rootDir, workspaces] = await Promise.all([
    import('../npm/npm-global-modules.js').then((exports) => exports.default),
    import('../npm/npm-workspaces-root.js').then((exports) => exports.default),
    import('../npm/npm-workspaces.js').then((exports) => exports.default),
  ]);
  const command = await loadCommand(cmd, rootDir, globalNodeModules);

  process.chdir(globalNodeModules);

  const subCommander = commander.command(cmd);

  command.instance.init({ command: command.package, rootDir, commander: subCommander });

  process.on('exit', (exitCode) => {
    const context = new CleanupContext({
      command: command.package,
      rootDir,
      args: commander.processedArgs,
      opts: commander.opts(),
      exitCode,
    });

    command.instance.cleanup(context);
  });
  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'].forEach((event) => {
    process.on(event, () => process.exit(process.exitCode || 1));
  });

  const { isVersionSet, isDescriptionSet } = getCommanderMetadata(subCommander);

  if (!isDescriptionSet && command.package.description) subCommander.description(command.package.description);
  if (!isVersionSet) subCommander.version(command.package.version);

  await subCommander
    .name(cmd)
    .action(async () => {
      const args = subCommander.processedArgs;
      const opts = subCommander.opts();

      await commandAction({ rootDir, workspaces, args, opts, command, globalOptions });
    })
    .parseAsync(cmdArgs, { from: 'user' });
};
