import path from 'node:path';

import { type Workspace } from 'wurk';

export const getSourcesGenerator = async (
  workspace: Workspace,
): Promise<AsyncGenerator<string, undefined, undefined>> => {
  const { fs, git } = workspace;
  const ignored = await git.getIgnored();
  console.log(ignored);

  return (async function* (): AsyncGenerator<string, undefined, undefined> {
    const dirs = ['.'];

    for (let current = dirs.shift(); current != null; current = dirs.shift()) {
      const entries = await fs.readDir(current);

      for (const entry of entries) {
        const filename = path.join(current, entry.name);
        console.log(filename);

        if (ignored.includes(filename)) continue;

        if ((entry.isFile() || entry.isSymbolicLink()) && /\.(?:js|cjs|mjs|jsx|ts|mts|cts|tsx)$/u.test(entry.name)) {
          yield fs.resolve(filename);
        } else if (entry.isDirectory() && entry.name !== 'node_modules') {
          dirs.push(filename);
        }
      }
    }
  })();
};
