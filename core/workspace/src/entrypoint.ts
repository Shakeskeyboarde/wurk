import { type Workspace } from './workspace.js';

export interface Entrypoint {
  readonly type: (typeof WORKSPACE_ENTRYPOINT_TYPES)[number];
  readonly filename: string;
}

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
      entryPoints.push({ type, filename: fs.resolve(value) });
    } else if (Array.isArray(value)) {
      value.forEach((subValue) => addEntryPoints(type, subValue));
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach((subValue) => {
        addEntryPoints(type, subValue);
      });
    }
  };

  if (config.at('license').exists()) {
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

export const getMissingEntrypoints = async (
  workspace: Workspace,
): Promise<Entrypoint[]> => {
  const { fs } = workspace;
  const entrypoints = getEntrypoints(workspace);
  const missing: Entrypoint[] = [];

  for (const entrypoint of entrypoints) {
    if (entrypoint.type === 'files') {
      const entries = await fs.find({
        patterns: entrypoint.filename,
        includeDirs: true,
      });

      let found = false;

      for (const entry of entries) {
        if (entry.isFile()) {
          found = true;
          break;
        }
      }

      /**
       * If the pattern didn't match any files, then check to see if any
       * matched directories contain any files.
       */
      if (!found && !entrypoint.filename.includes('**')) {
        found = await fs
          .find(`${entrypoint.filename}/**`)
          .then((files) => Boolean(files.length));
      }

      if (!found) {
        missing.push(entrypoint);
      }
    } else {
      const filenames =
        entrypoint.filename === 'LICENSE'
          ? ['LICENSE', 'LICENCE']
          : [entrypoint.filename];

      let found = false;

      for (const filename of filenames) {
        if (await fs.exists(filename)) {
          found = true;
          break;
        }
      }

      if (!found) {
        missing.push(entrypoint);
      }
    }
  }

  return missing;
};
