import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildScriptOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly scriptName: 'start' | 'build';
  readonly spawn: Spawn;
}
export const buildScript = async (options: BuildScriptOptions): Promise<boolean> => {
  const { log, workspace, scriptName, spawn } = options;

  log.notice(`${scriptName === 'start' ? 'Starting' : 'Building'} workspace "${workspace.name}" using package script.`);

  return await spawn('npm', ['run', '--if-present', scriptName], {
    cwd: workspace.dir,
    echo: true,
    errorReturn: true,
    errorSetExitCode: true,
  }).succeeded();
};
