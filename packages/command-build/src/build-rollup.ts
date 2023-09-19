import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildRollupOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly customConfigFile: string | undefined;
  readonly spawn: Spawn;
}

export const buildRollup = async ({
  log,
  workspace,
  start,
  customConfigFile,
  spawn,
}: BuildRollupOptions): Promise<void> => {
  log.notice(`${start ? 'Starting' : 'Building'} workspace "${workspace.name}" using Rollup.`);

  await spawn(
    'rollup',
    [
      customConfigFile && `--config=${customConfigFile}`,
      customConfigFile?.endsWith('ts') && '--configPlugin=@rollup/plugin-typescript',
      start && '--watch',
    ],
    {
      cwd: workspace.dir,
      echo: true,
      errorReturn: true,
      errorSetExitCode: true,
    },
  );
};
