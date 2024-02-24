import { type Workspace } from 'wurk';

import { Builder } from '../builder.js';

export const getScriptBuilder = async (
  workspace: Workspace,
): Promise<Builder | null> => {
  const { config, spawn } = workspace;
  const isBuildScriptPresent = config.at('scripts').at('build').exists();
  const isStartScriptPresent = config.at('scripts').at('start').exists();

  if (!isBuildScriptPresent && !isStartScriptPresent) return null;

  return new Builder('script', workspace, {
    build: isBuildScriptPresent
      ? async (log) => {
          await spawn('npm', ['run', 'build'], { log, output: 'echo' });
        }
      : null,
    start: isStartScriptPresent
      ? async (log) => {
          await spawn('npm', ['start'], { log, output: 'echo' });
        }
      : null,
  });
};
