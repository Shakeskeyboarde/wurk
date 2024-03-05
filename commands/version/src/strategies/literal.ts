import { type SemVer } from 'semver';
import { type Workspace } from 'wurk';

interface Options {
  readonly version: SemVer;
}

export const literal = async (
  options: Options,
  workspace: Workspace,
): Promise<void> => {
  const { log, config } = workspace;
  const { version } = options;
  const newVersion = version.format();

  log.info`setting version to ${newVersion}`;
  config.at('version').set(newVersion);
};
