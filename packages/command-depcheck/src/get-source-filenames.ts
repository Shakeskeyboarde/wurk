import fs from 'node:fs';

export const getSourceFilenames = async (dir: string): Promise<string[]> => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const promises = entries.map(async (entry) => {
    if (entry.isFile() && /\.(?:js|cjs|mjs|jsx|ts|mts|cts|tsx)$/u.test(entry.name)) return `${dir}/${entry.name}`;
    if (entry.isDirectory() && entry.name !== 'node_modules') return await getSourceFilenames(`${dir}/${entry.name}`);
    return [];
  });

  return await Promise.all(promises).then((results) => results.flatMap((result) => result));
};
