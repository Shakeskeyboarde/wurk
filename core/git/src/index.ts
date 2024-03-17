/* eslint-disable no-control-regex */
import nodeAssert from 'node:assert';
import nodePath from 'node:path';

import { type Log, log as defaultLog } from '@wurk/log';
import { createSpawn } from '@wurk/spawn';

export interface GitOptions {
  readonly dir: string;
  readonly log?: Log;
}

export interface GitHeadOptions {
  readonly allowShallow?: boolean;
}

export interface GitLogOptions extends GitHeadOptions {
  readonly start?: string | null;
  readonly end?: string;
}

export interface GitLog {
  readonly hash: string;
  readonly author: string;
  readonly authorEmail: string;
  readonly authorDate: string;
  readonly committer: string;
  readonly committerEmail: string;
  readonly committerDate: Date;
  readonly subject: string;
  readonly body: string;
}

const LOG_FORMAT: Readonly<Record<keyof GitLog, string>> = {
  hash: '%H',
  author: '%an',
  authorEmail: '%ae',
  authorDate: '%aI',
  committer: '%cn',
  committerEmail: '%ce',
  committerDate: '%cI',
  subject: '%s',
  body: '%b',
};

/**
 * Git repository informational utilities (readonly).
 */
export class Git {
  readonly #log: Log;
  readonly #dir: string;

  protected constructor(options: Pick<GitOptions, 'dir' | 'log'>) {
    this.#log = options.log ?? defaultLog;
    this.#dir = options.dir;
  }

  /**
   * Return true if the instance directory is a shallow Git clone.
   */
  readonly getIsShallow = async (): Promise<boolean> => {
    const { stdoutText } = await this._spawn('git', [
      'rev-parse',
      '--is-shallow-repository',
    ]);

    return stdoutText !== 'false';
  };

  /**
   * Return the root directory of the Git repository.
   */
  readonly getRoot = async (): Promise<string> => {
    const { stdoutText } = await this._spawn('git', [
      'rev-parse',
      '--show-toplevel',
    ]);

    return stdoutText;
  };

  /**
   * Get the hash of the most recent commit which modified the instance
   * directory. This may not actually be HEAD if the instance directory
   * was not modified in the current HEAD commit.
   */
  readonly getHead = async (dir: string, options?: GitHeadOptions): Promise<string | null> => {
    if (!options?.allowShallow) {
      nodeAssert(
        !(await this.getIsShallow()),
        `non-shallow git clone required`,
      );
    }

    const { stdoutText } = await this._spawn('git', [
      'log',
      ['-n', '1'],
      '--pretty=format:%H',
      ['--', dir],
    ]);

    return stdoutText || null;
  };

  /**
   * Get a list of all the files in the instance directory which are
   * ignored by Git (`.gitignore`).
   */
  readonly getIgnored = async (dir: string): Promise<string[]> => {
    const [gitRoot, gitIgnored] = await Promise.all([
      await this.getRoot(),
      await this._spawn('git', [
        'status',
        '--ignored',
        '--porcelain',
        dir ?? '.',
      ]),
    ]);

    return gitIgnored.stdoutText
      .split(/\r?\n/u)
      .flatMap((line): [string] | [] => {
        const match = line.match(/^!! (.*)$/u);
        return match ? [match[1]!] : [];
      })
      .map((file) => nodePath.resolve(gitRoot, file));
  };

  /**
   * Return true if the Git working tree is dirty.
   */
  readonly getIsDirty = async (dir: string): Promise<boolean> => {
    const { stdoutText } = await this._spawn('git', ['status', '--porcelain', dir ?? '.']);

    return Boolean(stdoutText);
  };

  /**
   * Get Git log entries.
   *
   * **Note:** This method will throw an error if the directory is part of a
   * shallow Git clone.
   */
  readonly getLogs = async (dir: string, options?: GitLogOptions): Promise<GitLog[]> => {
    if (!options?.allowShallow) {
      nodeAssert(
        !(await this.getIsShallow()),
        `non-shallow git clone required`,
      );
    }

    const start = options?.start?.trim();
    const end = options?.end?.trim() || 'HEAD';
    const formatEntries = Object.entries(LOG_FORMAT);
    const formatNames = formatEntries.map(([name]) => name);

    const formatPlaceholders = formatEntries.map(([, placeholder]) => placeholder);

    const { stdoutText } = await this._spawn('git', [
      'log',
      `--pretty=format:${formatPlaceholders.join('%x1F')}%x1E`,
      start ? `${start}..${end}` : end,
      '--',
      dir,
    ]);

    const entries = Array.from(stdoutText.matchAll(/(.*?)\u001E/gsu));

    const logs = entries.flatMap(([, content = '']) => {
      const values = content
        .split(/\u001F/u)
        .map((value) => value.trim());
      const log = Object.fromEntries(formatNames.map((name, index) => [name, values[index]]));

      return log as unknown as GitLog;
    });

    return logs;
  };

  protected readonly _spawn = createSpawn(() => ({
    log: this.#log,
    cwd: this.#dir,
    stdio: 'buffer',
  }));

  /**
   * Get a Git API instance.
   *
   * Throws:
   * - If Git is not installed (ENOENT)
   * - If the directory is not a repo (ENOREPO)
   */
  static async create(options: GitOptions): Promise<Git> {
    const git = new Git({ dir: options.dir, log: options.log });

    const { exitCode } = await git._spawn('git', ['status'], {
      allowNonZeroExitCode: true,
    });

    if (exitCode) {
      throw Object.assign(new Error('git repo is required'), {
        code: 'ENOREPO',
      });
    }

    return git;
  }
}
