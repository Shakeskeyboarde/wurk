import nodeFs from 'node:fs/promises';
import nodeOs from 'node:os';
import nodePath from 'node:path';

import { createCommand } from 'wurk';

export default createCommand('vitest', {
  config: (cli) => {
    return cli
      .option('[args...]', 'additional arguments to pass to vitest');
  },

  action: async (context) => {
    const { log, options, workspaces, spawn } = context;
    const workspaceDirs: string[] = [];

    for (const workspace of workspaces) {
      const { dir } = workspace;
      const hasConfig = await getConfigExists(dir);

      if (hasConfig) {
        workspaceDirs.push(dir);
      }
    }

    if (!workspaceDirs.length) {
      log.info`no vitest configurations found`;
      return;
    }

    const tmpDir = await nodeFs.mkdtemp(nodePath.resolve(nodeOs.tmpdir(), 'wurk-vitest-'));
    const tmpConfig = nodePath.join(tmpDir, 'vitest.workspace.json');

    await nodeFs.writeFile(tmpConfig, JSON.stringify(workspaceDirs, null, 2));
    await spawn('vitest', [`--workspace=${tmpConfig}`, ...options.args ?? []], {
      log: log,
      stdio: 'inherit',
      logCommand: {
        mapArgs: (arg) => arg.startsWith('--workspace=')
          ? { literal: '--workspace=<temp-config>' }
          : arg,
      },
    });
  },
});

const getConfigExists = async (dir: string): Promise<boolean> => {
  const handle = await nodeFs.opendir(dir);

  try {
    for await (const entry of handle) {
      if (entry.name.startsWith('vitest.config.') || entry.name.startsWith('vite.config.')) {
        return true;
      }
    }
  }
  finally {
    await handle.close()
      .catch((error: any) => {
        if (error?.code === 'ERR_DIR_CLOSED') return;
        throw error;
      });
  }

  return false;
};
