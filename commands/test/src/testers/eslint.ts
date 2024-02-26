import { type WorkspaceCollection } from 'wurk';

interface EslintContext {
  readonly workspaces: WorkspaceCollection;
}

export const eslint = async ({ workspaces }: EslintContext): Promise<void> => {
  const isDependencyPresent = workspaces.root.config
    .at('devDependencies')
    .at('eslint')
    .is('string');

  if (!isDependencyPresent) return;

  const workspaceDirs = Array.from(workspaces).map(({ dir }) =>
    workspaces.root.fs.relative(dir),
  );

  if (!workspaceDirs.length) return;

  await workspaces.root.spawn(
    'eslint',
    ['--max-warnings=0', ...workspaceDirs],
    { output: 'inherit' },
  );
};
