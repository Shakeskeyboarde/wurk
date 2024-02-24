import { type WorkspaceCollection } from 'wurk';

interface DepcheckContext {
  readonly workspaces: WorkspaceCollection;
  readonly options: { readonly fix?: boolean };
}

export const depcheck = async ({
  workspaces,
  options,
}: DepcheckContext): Promise<void> => {
  const isDependencyPresent = workspaces.root.config
    .at('devDependencies')
    .at('@wurk/command-depcheck')
    .is('string');

  if (!isDependencyPresent) return;

  const { fix = false } = options;

  await workspaces.root.spawn('wurk', ['depcheck', ...(fix ? ['--fix'] : [])], {
    output: 'inherit',
  });
};
