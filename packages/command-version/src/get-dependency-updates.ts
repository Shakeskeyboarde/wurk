import { type Log, type PackageJson, type Workspace } from '@werk/cli';
import { minVersion, satisfies } from 'semver';

const dependencyUpdates = new Map<string, { version: string }>();

export const addUpdate = (name: string, version: string): void => {
  dependencyUpdates.set(name, { version });
};

export const getUpdateNames = (): readonly string[] => {
  return [...dependencyUpdates.keys()];
};

export const getDependencyUpdates = (log: Log, workspace: Workspace): PackageJson | undefined => {
  let packagePatch: PackageJson | undefined;

  for (const scope of ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'] as const) {
    for (const [depName, depRange] of Object.entries(workspace[scope])) {
      const update = dependencyUpdates.get(depName);

      /*
       * No update for this dependency.
       */
      if (!update) continue;

      /*
       * The dependency update is too small to matter and the current
       * range already satisfies it.
       */
      if (satisfies(update.version, depRange) && satisfies(update.version, `~${minVersion(depRange)}`)) continue;

      /*
       * Not an updatable range.
       */
      if (depRange === '*' || depRange === 'x' || depRange.startsWith('file:')) continue;

      const prefix = depRange.match(/^([=^~]|>=?)?\d+(?:\.\d+(?:\.\d+(?:-[^\s|=<>^~]*)?)?)?$/u)?.[1] ?? '^';
      const newDepRange = `${prefix}${update.version}`;

      packagePatch = { ...packagePatch, [scope]: { ...packagePatch?.[scope], [depName]: newDepRange } };

      log.debug(`Updating "${depName}@${depRange}" to "${newDepRange}" in workspace "${workspace.name}".`);
    }

    return packagePatch;
  }
};
