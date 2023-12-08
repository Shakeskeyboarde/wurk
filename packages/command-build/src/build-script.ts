import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildScriptOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly scriptName: 'start' | 'build';
  readonly spawn: Spawn;
}
export const buildScript = async (options: BuildScriptOptions): Promise<boolean> => {
  const { log, workspace, scriptName, spawn } = options;

  log.info(`Running "${scriptName}" script.`);
  workspace.setStatus('pending', `${scriptName} script`);

  const isSuccess = await spawn(
    'npm',
    [!workspace.isRoot && ['-w', workspace.name], 'run', '--if-present', scriptName],
    {
      echo: true,
      errorReturn: true,
      errorSetExitCode: true,
    },
  ).succeeded();

  workspace.setStatus(isSuccess ? 'success' : 'failure', `${scriptName} script`);

  return isSuccess;
};
