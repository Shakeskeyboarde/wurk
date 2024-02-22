import fs from 'node:fs';
import path from 'node:path';
import type stream from 'node:stream';

import { JsonAccessor } from '@wurk/json';
import { glob, type Path } from 'glob';

export interface FsOptions {
  readonly cwd: string;
}

export interface FsReadStreamOptions
  extends Readonly<Pick<fs.promises.CreateReadStreamOptions, 'highWaterMark' | 'start' | 'end'>> {
  //
}

export interface FsReadDirOptions {
  readonly recursive?: boolean;
}

export interface FsWriteStreamOptions
  extends Readonly<Pick<fs.promises.CreateWriteStreamOptions, 'highWaterMark' | 'start'>> {
  readonly truncate?: boolean;
}

export interface FsDeleteOptions {
  readonly recursive?: boolean;
}

export interface FsStatOptions {
  readonly followSymlinks?: boolean;
}

export interface FsFindOptions {
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

export class Fs {
  readonly cwd: string;

  constructor({ cwd }: FsOptions) {
    this.cwd = cwd;
  }

  resolve(...paths: string[]): string {
    return path.resolve(this.cwd, ...paths);
  }

  relative(...paths: string[]): string {
    return path.relative(this.cwd, path.join(...paths));
  }

  async read(filename: string): Promise<Buffer | undefined> {
    return await fs.promises.readFile(this.resolve(filename)).catch((error) => {
      if (error?.code === 'ENOENT' || error?.code === 'EISDIR' || error?.code === 'EACCES') {
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

  async readStream(filename: string, options?: FsReadStreamOptions): Promise<fs.ReadStream | undefined> {
    const handle = await fs.promises.open(this.resolve(filename), 'r').catch((error) => {
      if (error?.code === 'ENOENT' || error?.code === 'EISDIR' || error?.code === 'EACCES') {
        return undefined;
      }

      throw error;
    });

    return handle?.createReadStream(options);
  }

  async readDir(dir: string, options?: FsReadDirOptions): Promise<fs.Dirent[] | undefined> {
    return await fs.promises
      .readdir(this.resolve(dir), { ...options, encoding: 'utf8', withFileTypes: true })
      .catch((error) => {
        if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR' || error?.code === 'EACCES') {
          return undefined;
        }

        throw error;
      });
  }

  async write(filename: string, data: Buffer | stream.Readable): Promise<void> {
    await this.writeDir(path.dirname(filename));
    await fs.promises.writeFile(this.resolve(filename), data);
  }

  async writeText(filename: string, data: string): Promise<void> {
    await this.write(filename, Buffer.from(data.endsWith('\n') ? data : data + '\n', 'utf8'));
  }

  async writeJson(filename: string, data: unknown): Promise<void> {
    await this.writeText(filename, JSON.stringify(data, null, 2));
  }

  async writeStream(filename: string, options?: FsWriteStreamOptions): Promise<fs.WriteStream> {
    const handle = await fs.promises.open(this.resolve(filename), options?.truncate ? 'w' : 'wx');
    return handle.createWriteStream({ ...options, flush: true });
  }

  async writeDir(dir: string): Promise<void> {
    await fs.promises.mkdir(this.resolve(dir), { recursive: true });
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await this.writeDir(path.dirname(destination));
    await fs.promises.copyFile(this.resolve(source), this.resolve(destination));
  }

  async delete(filename: string, options?: FsDeleteOptions): Promise<void> {
    await fs.promises.rm(this.resolve(filename), { ...options, force: true });
  }

  async stat(filename: string, options?: FsStatOptions): Promise<fs.Stats | undefined> {
    return await fs.promises[options?.followSymlinks ? 'stat' : 'lstat'](this.resolve(filename)).catch((error) => {
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

  async find(patterns: string | string[], options?: FsFindOptions): Promise<Path[]> {
    return await glob(patterns, {
      withFileTypes: true,
      cwd: options?.cwd ?? this.cwd,
      nodir: !options?.includeDirs,
      stat: options?.stat,
    }).then((paths) => paths.sort((a, b) => a.fullpath().localeCompare(b.fullpath())));
  }

  async findUp(patterns: string | string[], options?: FsFindUpOptions): Promise<Path[]> {
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
}
