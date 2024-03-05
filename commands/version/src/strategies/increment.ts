import { type ReleaseType } from 'semver';
import semver from 'semver';
import { type Workspace } from 'wurk';

interface Options {
  readonly releaseType: ReleaseType;
  readonly preid: string | undefined;
}

export const increment = async (
  options: Options,
  workspace: Workspace,
): Promise<void> => {
  const { log, version, config } = workspace;
  const { releaseType, preid } = options;

  // Auto-versioning does not support workspaces without versions.
  if (!version) {
    log.info`workspace is unversioned`;
    return;
  }

  const newVersion = new semver.SemVer(version)
    .inc(releaseType, preid)
    .format();

  log.info`bumping ${releaseType} version (${version} -> ${newVersion})`;
  config.at('version').set(newVersion);
};
