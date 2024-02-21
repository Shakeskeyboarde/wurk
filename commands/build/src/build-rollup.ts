import { type Workspace } from 'wurk';

interface BuildRollupOptions {
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly customConfigFile: string | undefined;
}

export const buildRollup = async ({ workspace, start, customConfigFile }: BuildRollupOptions): Promise<void> => {
  const { status, log, spawn } = workspace;

  status.set('pending', 'rollup');
  log.info(start ? `starting Rollup in watch mode` : `building with Rollup`);

  await spawn(
    'rollup',
    [
      customConfigFile && `--config=${customConfigFile}`,
      customConfigFile?.endsWith('ts') && '--configPlugin=@rollup/plugin-typescript',
      start && '--watch',
    ],
    { output: 'echo' },
  );

  status.set('success');
};
