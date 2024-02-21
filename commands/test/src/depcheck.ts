import { type WorkspaceCollection } from 'wurk';

interface DepcheckContext {
  readonly workspaces: WorkspaceCollection;
  readonly options: { readonly fix?: boolean };
}

export const runDepcheck = async ({ workspaces, options }: DepcheckContext): Promise<void> => {
  if (!workspaces.root.config.at('devDependencies').at('@wurk/command-depcheck').is('string')) return;

  const { fix = false } = options;

  await workspaces.root.spawn('wurk', ['depcheck', ...(fix ? ['--fix'] : [])], { output: 'inherit' });
};
