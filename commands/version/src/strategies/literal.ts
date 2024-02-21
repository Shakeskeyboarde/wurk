import { type SemVer } from 'semver';
import { type Workspace } from 'wurk';

interface Options {
  readonly version: SemVer;
}

export const literal = async ({ config }: Workspace, { version }: Options): Promise<void> => {
  config.at('version').set(version.format());
};
