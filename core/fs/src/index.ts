import nodeFs from 'node:fs';
import path from 'node:path';
import type stream from 'node:stream';

import { JsonAccessor } from '@wurk/json';
import { glob, type Path } from 'glob';

export interface FsOptions {
  readonly cwd?: string;
}

export interface FsReadStreamOptions
  extends Readonly<
    Pick<
      nodeFs.promises.CreateReadStreamOptions,
      'highWaterMark' | 'start' | 'end'
    >
  > {
  //
}

export interface FsReadDirOptions {
  readonly recursive?: boolean;
}

export interface FsWriteStreamOptions
  extends Readonly<
    Pick<nodeFs.promises.CreateWriteStreamOptions, 'highWaterMark' | 'start'>
  > {
  readonly truncate?: boolean;
}

export interface FsDeleteOptions {
  readonly recursive?: boolean;
}

export interface FsStatOptions {
  readonly followSymlinks?: boolean;
}

export interface FsFindOptions {
  readonly patterns: string | string[];
  readonly cwd?: string;
  readonly includeDirs?: boolean;
  readonly stat?: boolean;
}

export interface FsFindUpOptions {
  readonly cwd?: string;
  readonly includeDirs?: boolean;
  readonly stat?: boolean;
  /**
   * Stop traversing to higher parent directories when matches are found.
   */
  readonly stopTraversingOnFound?: boolean;
}

export interface FsDirEntry extends Omit<nodeFs.Dirent, 'path' | 'parentPath'> {
  /**
   * The base name of the directory entry.
   */
  readonly name: string;

  /**
   * The absolute path of the directory entry.
   */
  readonly fullpath: string;

  /**
   * Flag the directory for recursive iteration after the current directory
   * has been processed (breadth first recursion). Has no effect on entries
   * that are not directories.
   */
  recurse(enabled?: boolean): void;
}

export class Fs {
  readonly cwd: string;

  constructor(options?: FsOptions) {
    this.cwd = options?.cwd ?? '.';
  }

  resolve(...paths: string[]): string {
    return path.resolve(this.cwd, ...paths);
  }

  relative(...paths: string[]): string {
    return path.relative(this.cwd, path.join(...paths));
  }

  async read(filename: string): Promise<Buffer | undefined> {
    return await nodeFs.promises
      .readFile(this.resolve(filename))
      .catch((error) => {
        if (
          error?.code === 'ENOENT' ||
          error?.code === 'EISDIR' ||
          error?.code === 'EACCES'
        ) {
          return undefined;
        }

        throw error;
      });
  }

  async readText(filename: string): Promise<string | undefined> {
    return await this.read(filename).then((buffer) => buffer?.toString('utf8'));
  }

  async readJson(filename: string): Promise<JsonAccessor> {
    return await this.readText(filename).then(JsonAccessor.parse);
  }

  async readStream(
    filename: string,
    options?: FsReadStreamOptions,
  ): Promise<nodeFs.ReadStream | undefined> {
    const handle = await nodeFs.promises
      .open(this.resolve(filename), 'r')
      .catch((error) => {
        if (
          error?.code === 'ENOENT' ||
          error?.code === 'EISDIR' ||
          error?.code === 'EACCES'
        ) {
          return undefined;
        }

        throw error;
      });

    return handle?.createReadStream(options);
  }

  /**
   * Iterate over a directory and optionally it's subdirectories (breadth first).
   */
  async readDir(
    dir: string,
    callback: (entry: FsDirEntry) => Promise<void | boolean>,
  ): Promise<void> {
    const queue: string[] = [this.resolve(dir)];

    for (
      let current = queue.shift();
      current != null;
      current = queue.shift()
    ) {
      const dirEntries = await nodeFs.promises
        .opendir(current)
        .catch((error) => {
          if (
            error?.code === 'ENOENT' ||
            error?.code === 'ENOTDIR' ||
            error?.code === 'EACCES'
          ) {
            return undefined;
          }

          throw error;
        });

      if (!dirEntries) continue;

      try {
        for await (const dirEntry of dirEntries) {
          let recurse = false;

          const entry: FsDirEntry = Object.assign(dirEntry, {
            recurse: (enabled = true) => void (recurse = enabled),
            fullpath: path.join(current, dirEntry.name),
          });

          if ((await callback(entry)) === false) {
            // Stop reading if the callback returns `false` (not void).
            return;
          }

          if (recurse && entry.isDirectory()) {
            queue.push(entry.fullpath);
          }
        }
      } finally {
        await dirEntries.close().catch((error) => {
          if (error?.code !== 'ERR_DIR_CLOSED') {
            throw error;
          }
        });
      }
    }
  }

  async write(filename: string, data: Buffer | stream.Readable): Promise<void> {
    await this.writeDir(path.dirname(filename));
    await nodeFs.promises.writeFile(this.resolve(filename), data);
  }

  async writeText(filename: string, data: string): Promise<void> {
    await this.write(
      filename,
      Buffer.from(data.endsWith('\n') ? data : data + '\n', 'utf8'),
    );
  }

  async writeJson(filename: string, data: unknown): Promise<void> {
    await this.writeText(filename, JSON.stringify(data, null, 2));
  }

  async writeStream(
    filename: string,
    options?: FsWriteStreamOptions,
  ): Promise<nodeFs.WriteStream> {
    const handle = await nodeFs.promises.open(
      this.resolve(filename),
      options?.truncate ? 'w' : 'wx',
    );

    return handle.createWriteStream({
      highWaterMark: options?.highWaterMark,
      start: options?.start,
      flush: true,
    });
  }

  async writeDir(dir: string): Promise<void> {
    await nodeFs.promises.mkdir(this.resolve(dir), { recursive: true });
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await this.writeDir(path.dirname(destination));
    await nodeFs.promises.copyFile(
      this.resolve(source),
      this.resolve(destination),
    );
  }

  async delete(filename: string, options?: FsDeleteOptions): Promise<void> {
    await nodeFs.promises.rm(this.resolve(filename), {
      ...options,
      force: true,
    });
  }

  async stat(
    filename: string,
    options?: FsStatOptions,
  ): Promise<nodeFs.Stats | undefined> {
    return await nodeFs.promises[options?.followSymlinks ? 'stat' : 'lstat'](
      this.resolve(filename),
    ).catch((error) => {
      if (error?.code === 'ENOENT' || error?.code === 'EACCES') {
        return undefined;
      }

      throw error;
    });
  }

  /**
   * Returns true if the file exists and is accessible.
   */
  async exists(filename: string, options?: FsStatOptions): Promise<boolean> {
    return await this.stat(filename, options)
      .then(Boolean)
      .catch(() => false);
  }

  async find(
    optionsOrPatterns: FsFindOptions | string | string[],
  ): Promise<Path[]> {
    const { patterns, ...options } =
      typeof optionsOrPatterns === 'string' || Array.isArray(optionsOrPatterns)
        ? { patterns: optionsOrPatterns }
        : optionsOrPatterns;

    return await glob(patterns, {
      withFileTypes: true,
      cwd: options?.cwd ?? this.cwd,
      nodir: !options?.includeDirs,
      stat: options?.stat,
    }).then((paths) => {
      return paths.sort((a, b) => a.fullpath().localeCompare(b.fullpath()));
    });
  }

  async findUp(
    patterns: string | string[],
    options?: FsFindUpOptions,
  ): Promise<Path[]> {
    const results = new Map<string, Path>();
    const next = async (cwd: string): Promise<string | undefined> => {
      const matches = await glob(patterns, {
        withFileTypes: true,
        cwd,
        nodir: !options?.includeDirs,
        stat: options?.stat,
      });

      for (const match of matches) {
        results.set(match.fullpath(), match);
      }

      if (options?.stopTraversingOnFound && results.size > 0) {
        return;
      }

      const parentDir = path.dirname(cwd);

      return parentDir !== cwd ? await next(parentDir) : undefined;
    };

    await next(path.resolve(options?.cwd ?? this.cwd));

    return Array.from(results.values());
  }

  /**
   * Create a temporary directory that is automatically cleaned up when the
   * process exists.
   */
  async temp(prefix = 'wurk'): Promise<string> {
    const dir = await nodeFs.promises.mkdtemp(prefix, { encoding: 'utf8' });

    process.on('exit', () => {
      try {
        nodeFs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    });

    return dir;
  }
}

export const fs = new Fs();
