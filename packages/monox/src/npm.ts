import { abort } from './abort.js';
import { spawn } from './spawn.js';

interface NpmWorkspace {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  keywords?: string[];
  path: string;
  realpath?: string;
}

export const getNpmWorkspacesRoot = async (): Promise<string> => {
  return await spawn('npm', ['query', ':root', '--json'], { capture: true })
    .json<[{ workspaces: unknown; realpath: string }?]>()
    .then((values) => values?.[0])
    .then((value) => (value?.workspaces != null ? value.realpath : abort('Workspaces not configured.')));
};

export const getNpmWorkspaces = async (): Promise<NpmWorkspace[]> => {
  return await spawn('npm', ['query', '.workspace', '--quiet', '--json'], { capture: true }).json<NpmWorkspace[]>();
};
