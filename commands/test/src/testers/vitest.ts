import path from 'node:path';

import { type WorkspaceCollection } from 'wurk';

interface VitestContext {
  readonly workspaces: WorkspaceCollection;
}

export const vitest = async (context: VitestContext): Promise<void> => {
  const { workspaces } = context;
  const isDependencyPresent = workspaces.root.config
    .at('devDependencies')
    .at('vitest')
    .is('string');

  if (!isDependencyPresent) return;

  const workspaceDirs: string[] = [];

  for (const workspace of workspaces) {
    const isConfigFound = await workspace.fs
      .find(['vitest.config.*', 'vite.config.*'])
      .then((entries) => Boolean(entries.length));

    if (isConfigFound) {
      workspaceDirs.push(workspace.dir);
    }
  }

  if (!workspaceDirs.length) return;

  const tmpDir = await workspaces.root.fs.temp('vitest');
  const tmpConfig = path.join(tmpDir, 'vitest.workspace.json');

  await workspaces.root.fs.writeJson(tmpConfig, workspaceDirs);
  await workspaces.root.spawn('vitest', ['run', `--workspace=${tmpConfig}`], {
    output: 'inherit',
    logCommand: {
      mapArgs: (arg) =>
        arg.startsWith('--workspace=')
          ? { literal: '--workspace=<temp-config>' }
          : arg,
    },
  });
};
