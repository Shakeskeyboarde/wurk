import fs from 'node:fs';
import path from 'node:path';

export const getSourcesIterator = async function* (dir: string): AsyncGenerator<string, undefined> {
  const dirs = [dir];

  for (let current = dirs.shift(); current != null; current = dirs.shift()) {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const filename = path.join(current, entry.name);

      if (entry.isFile() && /\.(?:js|cjs|mjs|jsx|ts|mts|cts|tsx)$/u.test(entry.name)) {
        yield filename;
      } else if (entry.isDirectory() && entry.name !== 'node_modules') {
        dirs.push(filename);
      }
    }
  }
};
