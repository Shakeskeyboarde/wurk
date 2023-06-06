import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readPackageUp } from 'read-pkg-up';

import { readJsonFile } from '../utils/read-json-file.js';
import { isCommand } from './command.js';
import { LoadedCommand } from './loaded-command.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export const loadCommand = async (
  name: string,
  workspacesRoot: string,
  globalNodeModules: string,
): Promise<LoadedCommand> => {
  const moduleIds = await readJsonFile(`${workspacesRoot}/package.json`).then((json: any) => {
    const value = json?.werk?.commands?.[name];
    return typeof value === 'string' ? [value] : [`@werk/command-${name}`, `werk-command-${name}`];
  });
  const paths = [join(workspacesRoot, 'node_modules'), globalNodeModules, __dirname];
  const [exports, main] = await moduleIds
    .reduce<Promise<[exports: unknown, id: string]>>(
      (promise, id) =>
        promise.catch(async () => {
          const filename = require.resolve(id, { paths });
          return [await import(filename), filename];
        }),
      Promise.reject(),
    )
    .catch(() => Promise.reject(new Error(`Command "${name}" not found. Do you need to install the command package?`)));
  const packageInfo = await readPackageUp({ cwd: dirname(main) });
  const command = (exports as any)?.default;

  if (!isCommand(command)) throw new Error(`Command "${name}" does not have a valid command default export.`);
  if (packageInfo == null) throw new Error(`Command "${name}" does not have a valid package.json.`);

  const { packageJson, path: dir } = packageInfo;

  return new LoadedCommand({
    command,
    commandPackage: {
      main,
      dir,
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version,
    },
  });
};
