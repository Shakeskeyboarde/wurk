import { type SemVer } from 'semver';
import { type Workspace } from 'wurk';

interface Options {
  readonly version: SemVer;
}

export const literal = async (
  workspace: Workspace,
  options: Options,
): Promise<void> => {
  const { config } = workspace;
  const { version } = options;

  config.at('version').set(version.format());
};
