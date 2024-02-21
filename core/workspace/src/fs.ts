/* eslint-disable max-lines */
import fs from 'node:fs';
import path from 'node:path';

import { importRelative, type ImportResult } from '@wurk/import';
import { JsonAccessor } from '@wurk/json';
import { glob, type Path } from 'glob';

export interface FsOptions {
  readonly dir: string;
}

export class Fs {
  readonly dir: string;

  constructor({ dir }: FsOptions) {
    this.dir = dir;
  }

  resolve(...paths: string[]): string {
    return path.resolve(this.dir, ...paths);
  }

  async read(filename: string): Promise<Buffer> {
    return await fs.promises.readFile(this.resolve(filename));
  }

  async readText(filename: string, encoding?: BufferEncoding): Promise<string> {
    return await this.read(filename).then((buffer) => buffer.toString(encoding));
  }

  async readJson(filename: string): Promise<JsonAccessor> {
    return await this.readText(filename).then(JsonAccessor.parse);
  }

  async write(filename: string, data: Buffer): Promise<void> {
    const abs = this.resolve(filename);
    const dir = path.dirname(abs);

    await this.mkdir(dir);
    await fs.promises.writeFile(abs, data);
  }

  async writeText(filename: string, data: string, encoding?: BufferEncoding): Promise<void> {
    await this.write(filename, Buffer.from(data.endsWith('\n') ? data : data + '\n', encoding));
  }

  async writeJson(filename: string, data: unknown): Promise<void> {
    await this.writeText(filename, JSON.stringify(data, null, 2));
  }

  async readdir(dir: string, options?: { withFileTypes?: false; recursive?: boolean }): Promise<string[]>;
  async readdir(dir: string, options: { withFileTypes: true; recursive?: boolean }): Promise<fs.Dirent[]>;
  async readdir(
    dir: string,
    options?: { withFileTypes?: boolean; recursive?: boolean },
  ): Promise<string[] | fs.Dirent[]> {
    return await fs.promises.readdir(this.resolve(dir), options as any);
  }

  async mkdir(dir: string): Promise<void> {
    await fs.promises.mkdir(this.resolve(dir), { recursive: true });
  }

  async stat(filename: string): Promise<fs.Stats> {
    return await fs.promises.stat(this.resolve(filename));
  }

  async exists(filename: string): Promise<boolean> {
    return await this.stat(filename)
      .then(() => true)
      .catch(() => false);
  }

  async find(pattern: string | string[], options: { withFileType: true; nodir?: boolean }): Promise<Path[]>;
  async find(pattern: string | string[], options?: { withFileType?: false; nodir?: boolean }): Promise<string[]>;
  async find(
    pattern: string | string[],
    options?: { withFileType?: boolean; nodir?: boolean },
  ): Promise<string[] | Path[]> {
    return await glob(pattern, {
      cwd: this.dir,
      absolute: true,
      withFileTypes: options?.withFileType,
      nodir: options?.nodir,
    });
  }

  async findUp(...names: string[]): Promise<string | undefined> {
    if (names.length === 0) return undefined;

    const next = async (dir: string): Promise<string | undefined> => {
      for (const name of names) {
        const abs = this.resolve(dir, name);

        if (await this.exists(abs)) return abs;
      }

      const parentDir = path.dirname(dir);

      return parentDir !== dir ? await next(parentDir) : undefined;
    };

    return await next(this.dir);
  }

  /**
   * Import relative to the workspace directory, instead of relative to the
   * current file. This method should be used to import optional command
   * dependencies, because it allows per-workspace package installation.
   *
   * The `versionRange` option can be a semver range, just like a dependency
   * in your `package.json` file.
   *
   * **Note:** There's no way to infer the type of the imported module.
   * However, Typescript type imports are not emitted in compiled code,
   * so you can safely import the module type, and then use this method
   * to import the implementation.
   */
  async import<TExports extends Record<string, any> = Record<string, unknown>>(
    name: string,
    versionRange?: string,
  ): Promise<ImportResult<TExports>> {
    return await importRelative(name, { dir: this.dir, versionRange });
  }
}
