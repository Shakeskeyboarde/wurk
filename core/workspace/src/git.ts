import assert from 'node:assert';
import path from 'node:path';

import { type Log, log as defaultLog } from '@wurk/log';
import {
  spawn,
  type SpawnOptions,
  type SpawnPromise,
  type SpawnSparseArgs,
} from '@wurk/spawn';

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

const LOG_CAP = '%x00%x00%x00';
const LOG_SEPARATOR = ' %x00%x00 ';
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
    return await this._exec(['rev-parse', '--is-shallow-repository']).then(
      ({ stdoutText }) => stdoutText !== 'false',
    );
  };

  /**
   * Return the root directory of the Git repository.
   */
  readonly getRoot = async (): Promise<string> => {
    return await this._exec(['rev-parse', '--show-toplevel']).stdoutText();
  };

  /**
   * Get the hash of the most recent commit which modified the instance
   * directory. This may not actually be HEAD if the instance directory
   * was not modified in the current HEAD commit.
   */
  readonly getHead = async (
    options?: GitHeadOptions,
  ): Promise<string | null> => {
    if (!options?.allowShallow) {
      assert(!(await this.getIsShallow()), `non-shallow git clone required`);
    }

    return (await this._exec(['rev-parse', 'HEAD']).stdoutText()) || null;
  };

  /**
   * Get a list of all the files in the instance directory which are
   * ignored by Git (`.gitignore`).
   */
  readonly getIgnored = async (): Promise<string[]> => {
    const [gitRoot, gitIgnoredText] = await Promise.all([
      await this.getRoot(),
      await this._exec([
        'status',
        '--ignored',
        '--porcelain',
        this.#dir,
      ]).stdoutText(),
    ]);

    return gitIgnoredText
      .split(/\r?\n/u)
      .flatMap((line): [string] | [] => {
        const match = line.match(/^!! (.*)$/u);
        return match ? [match[1]!] : [];
      })
      .map((file) => path.resolve(gitRoot, file));
  };

  /**
   * Return true if the Git working tree is dirty.
   */
  readonly getIsDirty = async (): Promise<boolean> => {
    return await this._exec(['status', '--porcelain', this.#dir])
      .stdoutText()
      .then(Boolean);
  };

  /**
   * Get Git log entries.
   *
   * **Note:** This method will throw an error if the directory is part of a
   * shallow Git clone.
   */
  readonly getLogs = async (options?: GitLogOptions): Promise<GitLog[]> => {
    if (!options?.allowShallow) {
      assert(!(await this.getIsShallow()), `non-shallow git clone required`);
    }

    const start = options?.start?.trim();
    const end = options?.end?.trim() || 'HEAD';
    const formatEntries = Object.entries(LOG_FORMAT);
    const formatNames = formatEntries.map(([name]) => name);

    const formatPlaceholders = formatEntries.map(
      ([, placeholder]) => placeholder,
    );

    const text = await this._exec([
      'log',
      `--pretty=format:${LOG_CAP} ${formatPlaceholders.join(LOG_SEPARATOR)} ${LOG_CAP}`,
      start ? `${start}..${end}` : end,
      '--',
      this.#dir,
    ]).stdoutText();

    return [...text.matchAll(/\0{3}(.*)\0{3}/gsu)].flatMap(
      ([, content = '']) => {
        const values = content
          .split(LOG_SEPARATOR)
          .map((value) => value.trim());
        const log = Object.fromEntries(
          formatNames.map((name, index) => [name, values[index]]),
        );

        return log as unknown as GitLog;
      },
    );
  };

  protected readonly _exec = (
    args: SpawnSparseArgs,
    options?: Omit<SpawnOptions, 'cwd' | 'log' | 'output'>,
  ): SpawnPromise => {
    return spawn('git', args, {
      ...options,
      log: this.#log,
      cwd: this.#dir,
      output: 'buffer',
    });
  };

  /**
   * Get a Git API instance.
   *
   * Throws:
   * - If Git is not installed (ENOENT)
   * - If the directory is not a repo (ENOGITREPO)
   */
  static async create(options: GitOptions): Promise<Git> {
    const git = new Git({ dir: options.dir, log: options.log });

    const { exitCode } = await git._exec(['status'], {
      allowNonZeroExitCode: true,
    });

    if (exitCode) {
      throw Object.assign(new Error('git repo is required'), {
        code: 'ENOGITREPO',
      });
    }

    return git;
  }
}
