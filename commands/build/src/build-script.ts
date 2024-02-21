import { type Workspace } from 'wurk';

interface BuildScriptOptions {
  readonly workspace: Workspace;
  readonly scriptName: 'start' | 'build';
}
export const buildScript = async ({ workspace, scriptName }: BuildScriptOptions): Promise<void> => {
  const { status, log, name, spawn } = workspace;

  status.set('pending', `${scriptName} script`);
  log.info(`${scriptName}ing with package script`);
  await spawn('npm', ['-w', name, 'run', scriptName], { output: 'echo' });

  status.set('success');
};