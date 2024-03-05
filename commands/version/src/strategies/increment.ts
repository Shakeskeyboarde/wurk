import semver from 'semver';
import { type Workspace } from 'wurk';

export const increment = async ({
  log,
  config,
  version,
  isPrivate,
  getDependencyLinks,
}: Workspace): Promise<void> => {
  const newVersion = config.at('version').as('string');
  const isVersionUpdated = Boolean(newVersion) && newVersion !== version;

  if (!isVersionUpdated && version && !isPrivate) {
    const isIncrementRequired = getDependencyLinks().some(({ dependency }) => {
      const newDependencyVersion = dependency.config.at('version').as('string');

      return (
        newDependencyVersion && newDependencyVersion !== dependency.version
      );
    });

    // If dependency versions are updated, then bump the workspace version
    // so that bug fixes in dependencies are picked up by consumers of
    // dependents.
    if (isIncrementRequired) {
      const newIncrementedVersion = new semver.SemVer(version)
        .inc(semver.prerelease(version)?.length ? 'prerelease' : 'patch')
        .format();

      config.at('version').set(newIncrementedVersion);
      log.info`increment version for dependency updates (${version} -> ${newIncrementedVersion})`;
    }
  }
};
