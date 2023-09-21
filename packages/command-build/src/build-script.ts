import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildScriptOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly spawn: Spawn;
}
export const buildScript = async (options: BuildScriptOptions): Promise<boolean> => {
  const { log, workspace, start, spawn } = options;

  log.notice(`${start ? 'Starting' : 'Building'} workspace "${workspace.name}" using package script.`);

  return await spawn('npm', ['run', '--if-present', start ? 'start' : 'build'], {
    cwd: workspace.dir,
    echo: true,
    errorReturn: true,
    errorSetExitCode: true,
  }).succeeded();
};
