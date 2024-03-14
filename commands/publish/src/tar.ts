import nodeFs from 'node:fs/promises';
import nodeZlib from 'node:zlib';

import { type Entry, extract } from 'tar-stream';

export const readTar = async <T>(filename: string,
  callback: (entry: Entry, abort: () => void) => Promise<T>,
): Promise<T[]> => {
  const handle = await nodeFs.open(filename, 'r');
  const readable = handle.createReadStream();
  const results: T[] = [];
  const abortController = new AbortController();
  const signal = abortController.signal;
  const abort = (): void => abortController.abort();

  try {
    const extractor = readable
      .pipe(nodeZlib.createGunzip())
      .pipe(extract());

    for await (const entry of extractor) {
      const result = await callback(entry, abort);

      results.push(result);

      if (signal.aborted) {
        break;
      }

      entry.resume();
    }
  }
  finally {
    readable.destroy();
    await handle.close();
  }

  return results;
};

export const readTarFilenames = async (filename: string): Promise<string[]> => {
  return await readTar(filename, async (entry) => {
    return entry.header.name;
  });
};
