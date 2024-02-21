import { type Workspace, type WorkspaceCollection } from 'wurk';

interface VitestContext {
  readonly workspaces: WorkspaceCollection;
}

const CONFIG_FILENAMES = [
  'vite.config.ts',
  'vite.config.mts',
  'vite.config.cts',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.cjs',
  'vitest.config.ts',
  'vitest.config.mts',
  'vitest.config.cts',
  'vitest.config.js',
  'vitest.config.mjs',
  'vitest.config.cjs',
];

export const runVitest = async ({ workspaces }: VitestContext): Promise<void> => {
  if (!workspaces.root.config.at('devDependencies').at('vitest').is('string')) return;

  const workspaceDirs: string[] = [];

  for (const workspace of workspaces) {
    if (!(await isVitestConfigFound(workspace))) continue;

    workspaceDirs.push(workspace.dir);
  }

  if (!workspaceDirs.length) return;

  const configFilename = workspaces.root.fs.resolve('node_modules', '.wurk-command-test', 'vitest.workspace.json');

  await workspaces.root.fs.writeJson(configFilename, workspaceDirs);
  await workspaces.root.spawn('vitest', ['run', `--workspace=${configFilename}`], {
    output: 'inherit',
  });
};

const isVitestConfigFound = async (workspace: Workspace): Promise<boolean> => {
  for (const filename of CONFIG_FILENAMES) {
    if (await workspace.fs.exists(filename)) return true;
  }

  return false;
};
