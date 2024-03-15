import { type SemVer } from 'semver';
import { type Workspace } from 'wurk';

import { type StrategyResult } from '../strategy.js';

interface Options {
  readonly version: SemVer;
}

export const literal = async (
  options: Options,
  workspace: Workspace,
): Promise<StrategyResult> => {
  const { log } = workspace;
  const { version } = options;
  const newVersion = version.format();

  log.info`setting version to ${newVersion}`;

  return { version: newVersion };
};
