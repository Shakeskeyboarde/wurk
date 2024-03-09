import nodeFs from 'node:fs';
import nodeOs from 'node:os';
import nodePath from 'node:path';
import type nodeStream from 'node:stream';

import { JsonAccessor } from '@wurk/json';
import { glob, type Path } from 'glob';

export interface FsOptions {
  readonly cwd?: FsPath;
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
  readonly cwd?: FsPath;
  readonly includeDirs?: boolean;
  readonly stat?: boolean;
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

export type FsPath = string | undefined | FsPath[];

export class Fs {
  readonly cwd: string;

  constructor(options?: FsOptions) {
    this.cwd = nodePath.join(...getPathParts(options?.cwd));
  }

  resolve(...paths: FsPath[]): string {
    return nodePath.resolve(this.cwd, ...getPathParts(paths));
  }

  relative(...paths: FsPath[]): string {
    return nodePath.relative(this.cwd, this.resolve(paths));
  }

  async read(...filename: FsPath[]): Promise<Buffer | undefined> {
    return await nodeFs.promises
      .readFile(this.resolve(filename))
      .catch((error: any) => {
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

  async readText(...filename: FsPath[]): Promise<string | undefined> {
    return await this.read(filename).then((buffer) => {
      return buffer?.toString('utf8');
    });
  }

  async readJson(...filename: FsPath[]): Promise<JsonAccessor> {
    return await this.readText(filename).then(JsonAccessor.parse);
  }

  async readStream(
    filename: FsPath,
    options?: FsReadStreamOptions,
  ): Promise<nodeFs.ReadStream | undefined> {
    const handle = await nodeFs.promises
      .open(this.resolve(filename), 'r')
      .catch((error: any) => {
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
    dir: FsPath,
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
        .catch((error: any) => {
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
            fullpath: nodePath.join(current, dirEntry.name),
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
        await dirEntries.close().catch((error: any) => {
          if (error?.code !== 'ERR_DIR_CLOSED') {
            throw error;
          }
        });
      }
    }
  }

  async write(
    filename: FsPath,
    data: Buffer | nodeStream.Readable,
  ): Promise<void> {
    const absFilename = this.resolve(filename);
    await this.writeDir(nodePath.dirname(absFilename));
    await nodeFs.promises.writeFile(absFilename, data);
  }

  async writeText(filename: FsPath, data: string): Promise<void> {
    await this.write(
      filename,
      Buffer.from(data.endsWith('\n') ? data : data + '\n', 'utf8'),
    );
  }

  async writeJson(filename: FsPath, data: unknown): Promise<void> {
    await this.writeText(filename, JSON.stringify(data, null, 2));
  }

  async writeStream(
    filename: FsPath,
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

  async writeDir(...dir: FsPath[]): Promise<void> {
    await nodeFs.promises.mkdir(this.resolve(dir), { recursive: true });
  }

  async copyFile(source: FsPath, destination: FsPath): Promise<void> {
    const absSource = this.resolve(source);
    const absDestination = this.resolve(destination);
    await this.writeDir(nodePath.dirname(absDestination));
    await nodeFs.promises.copyFile(absSource, absDestination);
  }

  async delete(filename: FsPath, options?: FsDeleteOptions): Promise<void> {
    await nodeFs.promises.rm(this.resolve(filename), {
      ...options,
      force: true,
    });
  }

  async stat(
    filename: FsPath,
    options?: FsStatOptions,
  ): Promise<nodeFs.Stats | undefined> {
    return await nodeFs.promises[options?.followSymlinks ? 'stat' : 'lstat'](
      this.resolve(filename),
    ).catch((error: any) => {
      if (error?.code === 'ENOENT' || error?.code === 'EACCES') {
        return undefined;
      }

      throw error;
    });
  }

  /**
   * Returns true if the file exists and is accessible.
   */
  async exists(filename: FsPath, options?: FsStatOptions): Promise<boolean> {
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
      cwd: options?.cwd == null ? this.cwd : this.resolve(options.cwd),
      nodir: !options?.includeDirs,
      stat: options?.stat,
    }).then((paths) => {
      return paths.sort((a, b) => a.fullpath().localeCompare(b.fullpath()));
    });
  }

  /**
   * Create a temporary directory that is automatically cleaned up when the
   * process exists.
   */
  async temp(...prefix: FsPath[]): Promise<string> {
    const parts = getPathParts(prefix);
    const dirs = parts.slice(0, -1);
    const basename = parts.at(-1) ?? '';
    const dir = await nodeFs.promises.mkdtemp(
      nodePath.resolve(
        nodeOs.tmpdir(),
        ...dirs,
        `.wurk${basename ? `-${basename}-` : '-'}`,
      ),
      { encoding: 'utf8' },
    );

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

export const getPathParts = (value: FsPath): string[] => {
  return Array.isArray(value)
    ? value.flatMap((valueN) => getPathParts(valueN))
    : typeof value === 'string'
      ? [value]
      : [];
};

export const fs = new Fs();
