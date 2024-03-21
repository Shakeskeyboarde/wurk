import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { glob } from 'glob';

import { type Workspace } from './workspace.js';

/**
 * String keys for fields in a `package.json` file which are considered to be
 * entrypoints.
 */
export type EntrypointType = (typeof WORKSPACE_ENTRYPOINT_TYPES)[number];

/**
 * Array of entrypoint keys.
 */
const WORKSPACE_ENTRYPOINT_TYPES = [
  'license',
  'types',
  'bin',
  'main',
  'module',
  'exports',
  'man',
  'files',
  'directories',
] as const;

/**
 * Get the entrypoints of a workspace.
 */
export const getEntrypoints = (workspace: Workspace): readonly Entrypoint[] => {
  const { dir, config } = workspace;
  const entryPoints: Entrypoint[] = [];
  const addEntryPoints = (type: Entrypoint['type'], value: unknown): void => {
    if (typeof value === 'string') {
      const entryPath = value.includes('\\') || nodePath.win32.isAbsolute(value)
        // Looks like a windows path, so just resolve it. Hopefully, the
        // system is running Windows.
        ? nodePath.resolve(dir, value)
        // Looks like a posix path, so resolve it with posix semantics so that
        // it works with globbing.
        : nodePath.posix.resolve(dir, value);

      entryPoints.push(new Entrypoint(type, entryPath));
    }
    else if (Array.isArray(value)) {
      value.forEach((subValue) => addEntryPoints(type, subValue));
    }
    else if (typeof value === 'object' && value !== null) {
      Object.values(value)
        .forEach((subValue) => {
          addEntryPoints(type, subValue);
        });
    }
  };

  if (config.at('license')
    .exists()) {
    addEntryPoints('license', 'LICENSE');
  }

  addEntryPoints('types', config
    .at('types')
    .unwrap());
  addEntryPoints('bin', config
    .at('bin')
    .unwrap());
  addEntryPoints('main', config
    .at('main')
    .unwrap());
  addEntryPoints('module', config
    .at('module')
    .unwrap());
  addEntryPoints('exports', config
    .at('exports')
    .unwrap());
  addEntryPoints('man', config
    .at('man')
    .unwrap());
  addEntryPoints('files', config
    .at('files')
    .unwrap());
  addEntryPoints('directories', config
    .at('directories')
    .unwrap());

  return entryPoints;
};

/**
 * An entrypoint in a workspace.
 */
export class Entrypoint {
  /**
   * The type of the entrypoint (ie. the top-level `package.json` key).
   */
  readonly type: EntrypointType;

  /**
   * The filename of the entrypoint. This may be a glob.
   */
  readonly filename: string;

  /**
   * Create a new entrypoint.
   */
  constructor(type: EntrypointType, filename: string) {
    this.type = type;
    this.filename = filename;
  }

  /**
   * Check if the entrypoint exists in the workspace.
   */
  async exists(): Promise<boolean> {
    if (this.type === 'files' && !nodePath.win32.isAbsolute(this.filename)) {
      const stream = glob.stream([this.filename, `${this.filename}/**`], { nodir: true });

      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of stream) {
          return true;
        }
      }
      finally {
        stream.destroy();
      }
    }
    else {
      const filenames = this.type === 'license'
        && (nodePath.basename(this.filename) === 'LICENSE' || nodePath.basename(this.filename) === 'LICENCE')
        ? [
          nodePath.resolve(nodePath.dirname(this.filename), 'LICENSE'),
          nodePath.resolve(nodePath.dirname(this.filename), 'LICENCE'),
        ]
        : [this.filename];

      for (const filename of filenames) {
        const exists = await nodeFs.access(filename)
          .then(() => true, () => false);

        if (exists) {
          return true;
        }
      }
    }

    return false;
  }
}
