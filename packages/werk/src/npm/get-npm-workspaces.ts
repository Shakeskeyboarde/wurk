import { isObject } from '../utils/is-object.js';
import { memoize } from '../utils/memoize.js';
import { spawn } from '../utils/spawn.js';
import { type WorkspacePackage } from '../workspace/workspace-package.js';

interface NpmWorkspace {
  readonly name: string;
  readonly version: string;
  readonly private?: boolean;
  readonly type?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly keywords?: readonly string[];
  readonly path: string;
  readonly realpath?: string;
  readonly werk?: Record<string, unknown>;
  readonly scripts?: Record<string, string>;
}

export const getNpmWorkspaces = memoize(
  /**
   * Memoized.
   */
  async (dir?: string): Promise<readonly WorkspacePackage[]> => {
    return await spawn('npm', ['query', '.workspace', '--quiet', '--json'], { cwd: dir, capture: true })
      .getJson<NpmWorkspace[]>()
      .then((npmWorkspaces) => {
        return npmWorkspaces.map(({ path, realpath, werk, ...workspace }) => ({
          ...workspace,
          dir: realpath ?? path,
          werk: isObject(werk) ? (werk as Record<string, { config?: unknown }>) : undefined,
        }));
      });
  },
);
