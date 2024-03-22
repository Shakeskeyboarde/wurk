/* eslint-disable no-control-regex */
import nodeAssert from 'node:assert';
import nodePath from 'node:path';

import { type Log, log as defaultLog } from '@wurk/log';
import { type Spawn, spawn } from '@wurk/spawn';

/**
 * Options for creating a new {@link Git} instance.
 */
export interface GitOptions {
  /**
   * A directory in the Git repository, used as the working directory for
   * all Git processes spawned by the instance.
   */
  readonly dir: string;
  /**
   * Optional logger.
   */
  readonly log?: Log;
}

/**
 * Options for getting the HEAD commit hash.
 */
export interface GitHeadOptions {
  /**
   * If true, do not throw an error if the repository is a shallow clone.
   */
  readonly allowShallow?: boolean;
}

/**
 * Options for getting Git log entries.
 */
export interface GitLogOptions extends GitHeadOptions {
  /**
   * The commit-ish to start from.
   */
  readonly start?: string | null;
  /**
   * The commit-ish to end at.
   */
  readonly end?: string;
}

/**
 * A single Git log entry.
 */
export interface GitLog {
  /**
   * The commit hash.
   */
  readonly hash: string;
  /**
   * The author's name.
   */
  readonly author: string;
  /**
   * The author's email.
   */
  readonly authorEmail: string;
  /**
   * The date the commit was authored. This is when the commit was created.
   */
  readonly authorDate: string;
  /**
   * The committer's name.
   */
  readonly committer: string;
  /**
   * The committer's email.
   */
  readonly committerEmail: string;
  /**
   * The date the commit was last modified. For example, if the commit is
   * rebased, this date will change.
   */
  readonly committerDate: Date;
  /**
   * The commit message subject (ie. the first line of the commit message).
   */
  readonly subject: string;
  /**
   * The commit message body. Everything after the subject.
   */
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

  /**
   * Create a new Git instance.
   */
  protected constructor(options: GitOptions) {
    this.#log = options.log ?? defaultLog;
    this.#dir = options.dir;
  }

  /**
   * Return true if the instance directory is a shallow Git clone.
   */
  readonly getIsShallow = async (): Promise<boolean> => {
    const { stdoutText } = await this.#spawn('git', [
      'rev-parse',
      '--is-shallow-repository',
    ]);

    return stdoutText !== 'false';
  };

  /**
   * Return the root directory of the Git repository.
   */
  readonly getRoot = async (): Promise<string> => {
    const { stdoutText } = await this.#spawn('git', [
      'rev-parse',
      '--show-toplevel',
    ]);

    return stdoutText;
  };

  /**
   * Get the hash of the most recent commit which modified the directory. This
   * may not actually be HEAD if the directory was not modified in the current
   * HEAD commit.
   */
  readonly getHead = async (dir: string, options?: GitHeadOptions): Promise<string | null> => {
    if (!options?.allowShallow) {
      nodeAssert(
        !(await this.getIsShallow()),
        `non-shallow git clone required`,
      );
    }

    const { stdoutText } = await this.#spawn('git', [
      'log',
      ['-n', '1'],
      '--pretty=format:%H',
      ['--', dir],
    ]);

    return stdoutText || null;
  };

  /**
   * Get a list of all the files in the directory which are ignored by Git
   * (`.gitignore`).
   */
  readonly getIgnored = async (dir: string): Promise<string[]> => {
    const [gitRoot, gitIgnored] = await Promise.all([
      await this.getRoot(),
      await this.#spawn('git', [
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
    const { stdoutText } = await this.#spawn('git', ['status', '--porcelain', dir ?? '.']);

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

    const { stdoutText } = await this.#spawn('git', [
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

  readonly #spawn: Spawn = (cmd, sparseArgs?, ...options) => spawn(cmd, sparseArgs, {
    log: this.#log,
    cwd: this.#dir,
    stdio: 'buffer',
  }, ...options);

  /**
   * Get a Git API instance.
   *
   * Throws:
   * - If Git is not installed (ENOENT)
   * - If the directory is not a repo (ENOREPO)
   */
  static async create(options: GitOptions): Promise<Git> {
    const git = new Git({ dir: options.dir, log: options.log });

    const { exitCode } = await git.#spawn('git', ['status'], {
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
