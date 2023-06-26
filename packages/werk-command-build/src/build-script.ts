import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildScriptOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly spawn: Spawn;
}
export const buildScript = async (options: BuildScriptOptions): Promise<void> => {
  const { log, workspace, start, spawn } = options;

  log.notice(`${start ? 'Starting' : 'Building'} workspace "${workspace.name}" using package script.`);

  await spawn('npm', ['run', '--if-present', start ? 'build' : 'start'], {
    echo: true,
    errorReturn: true,
    errorSetExitCode: true,
  });
};
