import { type SemVer } from 'semver';
import { type Workspace } from 'wurk';

import { type ChangeSet } from '../change.js';

interface Options {
  readonly version: SemVer;
}

/**
 * Set the workspace version to a literal value.
 */
export const literal = async (
  options: Options,
  workspace: Workspace,
): Promise<ChangeSet> => {
  const { log } = workspace;
  const { version } = options;
  const newVersion = version.format();

  log.info`setting version to ${newVersion}`;

  return { version: newVersion };
};
