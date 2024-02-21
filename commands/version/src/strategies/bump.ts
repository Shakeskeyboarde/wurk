import { type ReleaseType } from 'semver';
import semver from 'semver';
import { type Workspace } from 'wurk';

interface Options {
  readonly releaseType: ReleaseType;
  readonly preid: string | undefined;
}

export const bump = async ({ log, version, config }: Workspace, { releaseType, preid }: Options): Promise<void> => {
  // Auto-versioning does not support workspaces without versions.
  if (!version) {
    log.debug('skipping workspace (no version)');
    return;
  }

  config.at('version').set(new semver.SemVer(version).inc(releaseType, preid).format());
};
