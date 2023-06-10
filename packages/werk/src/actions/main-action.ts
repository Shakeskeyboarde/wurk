import { commandAction } from '../actions/command-action.js';
import { loadCommandPlugin } from '../command/load-command-plugin.js';
import { type Commander, getCommanderMetadata } from '../commander/commander.js';
import { CleanupContext } from '../context/cleanup-context.js';
import { getNpmWorkspaces } from '../npm/get-npm-workspaces.js';
import { getNpmWorkspacesRoot } from '../npm/get-npm-workspaces-root.js';
import { type GlobalOptions } from '../options.js';

interface MainActionOptions {
  readonly commander: Commander<any, any>;
  readonly cmd: string;
  readonly cmdArgs: readonly string[];
  readonly globalOpts: GlobalOptions;
}

export const mainAction = async ({ commander, cmd, cmdArgs, globalOpts }: MainActionOptions): Promise<void> => {
  const [rootDir, workspaces] = await Promise.all([await getNpmWorkspacesRoot(), await getNpmWorkspaces()]);
  const commandPlugin = await loadCommandPlugin(cmd);
  const { command, ...commandInfo } = commandPlugin;
  const { packageJson } = commandInfo;

  process.chdir(rootDir);

  const subCommander = commander.command(cmd);

  if (command.init({ command: commandInfo, rootDir, commander: subCommander }) !== subCommander) {
    throw new Error(`Command "${cmd}" did not return the correct commander instance. Did it return a sub-command?`);
  }

  process.on('exit', (exitCode) => {
    const context = new CleanupContext({
      command: commandInfo,
      rootDir,
      args: commander.processedArgs,
      opts: commander.opts(),
      exitCode,
    });

    command.cleanup(context);
  });
  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'].forEach((event) => {
    process.on(event, () => process.exit(process.exitCode || 1));
  });

  const { isVersionSet, isDescriptionSet } = getCommanderMetadata(subCommander);

  if (!isDescriptionSet && packageJson.description) subCommander.description(packageJson.description);
  if (!isVersionSet && packageJson.version) subCommander.version(packageJson.version);

  await subCommander
    .name(cmd)
    .action(async () => {
      const args = subCommander.processedArgs;
      const opts = subCommander.opts();

      await commandAction({ rootDir, workspaces, args, opts, commandPlugin: commandPlugin, globalOpts: globalOpts });
    })
    .parseAsync(cmdArgs, { from: 'user' });
};
