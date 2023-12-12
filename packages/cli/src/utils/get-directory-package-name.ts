import fs from 'node:fs';
import path from 'node:path';

export const getDirectoryPackageName = async (dir: string): Promise<string> => {
  let content: string;

  try {
    content = await fs.promises.readFile(path.join(dir, 'package.json'), 'utf8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      const next = path.dirname(dir);

      if (next !== dir) {
        return await getDirectoryPackageName(next);
      } else {
        throw new Error('The working directory does not have a package.json file.');
      }
    }

    throw error;
  }

  const data = JSON.parse(content);
  const name = data?.name;

  if (typeof name !== 'string') {
    throw new Error('The working directory package.json file does not have a name.');
  }

  return name;
};
