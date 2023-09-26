import { type PackageJsonKnown } from '../utils/package-json.js';
import { spawn } from '../utils/spawn.js';
import { type RawWorkspace } from '../workspace/create-workspaces.js';

interface NpmWorkspace extends PackageJsonKnown {
  readonly name: string;
  readonly path: string;
  readonly realpath?: string;
}

export const getNpmWorkspaces = async (
  dir: string,
): Promise<[rootWorkspace: RawWorkspace, workspaces: RawWorkspace[]]> => {
  const [[npmWorkspacesRoot], npmWorkspaces] = await Promise.all([
    spawn('npm', ['query', ':root', '--quiet', '--json'], {
      cwd: dir,
      capture: true,
    }).getJson<[NpmWorkspace]>(),
    spawn('npm', ['query', '.workspace', '--quiet', '--json'], {
      cwd: dir,
      capture: true,
    }).getJson<readonly NpmWorkspace[]>(),
  ]);

  return [
    {
      ...npmWorkspacesRoot,
      isPrivate: npmWorkspacesRoot.private,
      dir: npmWorkspacesRoot.realpath ?? npmWorkspacesRoot.path,
    },
    npmWorkspaces.map((npmWorkspace) => {
      return {
        ...npmWorkspace,
        isPrivate: npmWorkspace.private,
        dir: npmWorkspace.realpath ?? npmWorkspace.path,
      };
    }),
  ];
};
