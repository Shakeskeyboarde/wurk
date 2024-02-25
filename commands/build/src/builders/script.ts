import { type Log } from 'wurk';

import { Builder, type BuilderFactory } from '../builder.js';

export const getScriptBuilder: BuilderFactory = async (workspace) => {
  const { config, spawn } = workspace;
  const isBuildScriptPresent = config.at('scripts').at('wurk:build').exists();
  const isStartScriptPresent = config.at('scripts').at('wurk:start').exists();

  if (!isBuildScriptPresent && !isStartScriptPresent) return null;

  const script = async (watch: boolean, log: Log): Promise<void> => {
    await spawn('npm', ['run', `wurk:${watch ? 'start' : 'build'}`], {
      log,
      output: 'echo',
    });
  };

  return new Builder('script', workspace, {
    build: isBuildScriptPresent && script.bind(null, false),
    start: isStartScriptPresent && script.bind(null, true),
  });
};
