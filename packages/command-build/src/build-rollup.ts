import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildRollupOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly watch: boolean;
  readonly customConfigFile: string | undefined;
  readonly spawn: Spawn;
}

export const buildRollup = async ({
  log,
  workspace,
  watch,
  customConfigFile,
  spawn,
}: BuildRollupOptions): Promise<boolean> => {
  log.info(watch ? `Starting Rollup in watch mode.` : `Building with Rollup.`);
  workspace.setStatus('pending', 'rollup');

  const isSuccess = await spawn(
    'rollup',
    [
      customConfigFile && `--config=${customConfigFile}`,
      customConfigFile?.endsWith('ts') && '--configPlugin=@rollup/plugin-typescript',
      watch && '--watch',
    ],
    {
      cwd: workspace.dir,
      echo: true,
      errorReturn: true,
      errorSetExitCode: true,
    },
  ).succeeded();

  workspace.setStatus(isSuccess ? 'success' : 'failure', 'rollup');

  return isSuccess;
};
