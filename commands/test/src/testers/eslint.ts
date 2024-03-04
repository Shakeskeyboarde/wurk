import { type Log, type WorkspaceCollection } from 'wurk';

interface EslintContext {
  readonly log: Log;
  readonly workspaces: WorkspaceCollection;
}

export const eslint = async ({
  log,
  workspaces,
}: EslintContext): Promise<void> => {
  const isDependencyPresent = workspaces.root.config
    .at('devDependencies')
    .at('eslint')
    .is('string');

  if (!isDependencyPresent) return;
  if (!workspaces.iterableSize) return;

  const workspaceDirs = Array.from(workspaces)
    .filter(({ isSelected }) => isSelected)
    .map(({ dir }) => workspaces.root.fs.relative(dir));

  await workspaces.root.spawn(
    'eslint',
    ['--max-warnings=0', ...workspaceDirs],
    { log, output: 'inherit' },
  );
};
