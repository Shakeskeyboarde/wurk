import { type WorkspaceCollection } from 'wurk';

interface EslintContext {
  readonly workspaces: WorkspaceCollection;
  readonly options: { readonly fix?: boolean };
}

export const runEslint = async ({ workspaces, options }: EslintContext): Promise<void> => {
  if (!workspaces.root.config.at('devDependencies').at('eslint').is('string')) return;

  const workspaceDirs = Array.from(workspaces).map(({ dir }) => dir);

  if (!workspaceDirs.length) return;

  await workspaces.root.spawn('eslint', ['--max-warnings=0', ...(options.fix ? ['--fix'] : []), ...workspaceDirs], {
    output: 'inherit',
  });
};
