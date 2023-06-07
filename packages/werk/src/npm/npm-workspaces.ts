import { spawn } from '../utils/spawn.js';
import { type WorkspaceOptions } from '../workspace/workspace.js';

interface NpmWorkspace {
  readonly name: string;
  readonly version: string;
  readonly private?: boolean;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly keywords?: readonly string[];
  readonly path: string;
  readonly realpath?: string;
}

export default await spawn('npm', ['query', '.workspace', '--quiet', '--json'], { capture: true, errorThrow: true })
  .getJson<NpmWorkspace[]>()
  .then((npmWorkspaces): WorkspaceOptions[] => {
    return npmWorkspaces.map(({ path, realpath, ...workspace }) => ({
      dir: realpath ?? path,
      ...workspace,
    }));
  });
