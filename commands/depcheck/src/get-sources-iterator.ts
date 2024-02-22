import path from 'node:path';

import { type Fs } from 'wurk';

export const getSourcesIterator = async function* (fs: Fs): AsyncGenerator<string, undefined> {
  const dirs = ['.'];

  for (let current = dirs.shift(); current != null; current = dirs.shift()) {
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const filename = path.join(current, entry.name);

      if (entry.isFile() && /\.(?:js|cjs|mjs|jsx|ts|mts|cts|tsx)$/u.test(entry.name)) {
        yield fs.resolve(filename);
      } else if (entry.isDirectory() && entry.name !== 'node_modules') {
        dirs.push(filename);
      }
    }
  }
};
