import { type Fs } from '@wurk/fs';

import { type Workspace } from './workspace.js';

export type EntrypointType = (typeof WORKSPACE_ENTRYPOINT_TYPES)[number];

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

export const getEntrypoints = (workspace: Workspace): readonly Entrypoint[] => {
  const { config, fs } = workspace;
  const entryPoints: Entrypoint[] = [];
  const addEntryPoints = (type: Entrypoint['type'], value: unknown): void => {
    if (typeof value === 'string') {
      entryPoints.push(new Entrypoint(fs, type, fs.resolve(value)));
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

  addEntryPoints('types', config.at('types').value);
  addEntryPoints('bin', config.at('bin').value);
  addEntryPoints('main', config.at('main').value);
  addEntryPoints('module', config.at('module').value);
  addEntryPoints('exports', config.at('exports').value);
  addEntryPoints('man', config.at('man').value);
  addEntryPoints('files', config.at('files').value);
  addEntryPoints('directories', config.at('directories').value);

  return entryPoints;
};

export class Entrypoint {
  readonly #fs: Fs;
  readonly type: EntrypointType;
  readonly filename: string;

  constructor(fs: Fs, type: EntrypointType, filename: string) {
    this.#fs = fs;
    this.type = type;
    this.filename = filename;
  }

  async exists(): Promise<boolean> {
    if (this.type === 'files') {
      const entries = await this.#fs.find({
        patterns: this.filename,
        includeDirs: true,
      });

      if (entries.some((entry) => entry.isFile())) {
        return true;
      }

      /**
       * If the pattern didn't match any files, then check to see if any
       * matched directories contain any files.
       */
      if (!this.filename.endsWith('/**')) {
        const isNotEmpty = await this.#fs
          .find(`${this.filename}/**`)
          .then((files) => Boolean(files.length));

        return isNotEmpty;
      }
    }
    else {
      const filenames = this.filename === 'LICENSE' ? ['LICENSE', 'LICENCE'] : [this.filename];

      for (const filename of filenames) {
        if (await this.#fs.exists(filename)) {
          return true;
        }
      }
    }

    return false;
  }
}
