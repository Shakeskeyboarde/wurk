import path from 'node:path';

import { type Log, log as defaultLog } from '@wurk/log';
import { type Spawn, spawn } from '@wurk/spawn';

export interface GitOptions {
  readonly log?: Log;
  readonly dir: string;
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

export class Git {
  readonly #log: Log;
  readonly #dir: string;

  constructor(options: GitOptions) {
    this.#log = options.log ?? defaultLog;
    this.#dir = options.dir;
  }

  /**
   * Return true if the workspace directory is part of a Git repository.
   */
  readonly getIsRepo = async (): Promise<boolean> => {
    return await this.#spawn('git', ['status']).ok();
  };

  /**
   * Return true if the workspace directory is only a shallow Git checkout.
   */
  readonly getIsShallow = async (): Promise<boolean> => {
    return await this.#spawn('git', ['rev-parse', '--is-shallow-repository']).then(({ stdoutText }) => {
      return stdoutText !== 'false';
    });
  };

  /**
   * Return the root directory of the Git repository.
   */
  readonly getRoot = async (): Promise<string> => {
    return await this.#spawn('git', ['rev-parse', '--show-toplevel']).stdoutText();
  };

  /**
   * Get the hash of the most recent commit which modified the workspace
   * directory. This may not actually be HEAD if the workspace directory
   * was not modified in the current HEAD commit.
   */
  readonly getHead = async (): Promise<string | undefined> => {
    try {
      let head = await this.#spawn('git', ['log', '-n', '1', '--pretty=format:%H', '.']).stdoutText();

      if (!head) {
        head = await this.#spawn('git', ['rev-parse', 'HEAD']).stdoutText();
      }

      return head || undefined;
    } catch (_error) {
      return undefined;
    }
  };

  /**
   * Get a list of all the files in the workspace directory which are
   * ignored by Git (`.gitignore`). This method will return an empty
   * array if the workspace directory is not part of a Git repository.
   */
  readonly getIgnored = async (): Promise<string[]> => {
    if (!(await this.getIsRepo())) return [];

    this.#log.debug(`Git ignored files:`);

    const [gitRoot, gitIgnoredText] = await Promise.all([
      await this.getRoot(),
      await this.#spawn('git', ['status', '--ignored', '--porcelain', this.#dir]).stdoutText(),
    ]);

    return gitIgnoredText
      .split(/\r?\n/u)
      .flatMap((line): [string] | [] => {
        const match = line.match(/^!! (.*)$/u);
        return match ? [match[1]!] : [];
      })
      .map((file) => path.relative(this.#dir, path.resolve(gitRoot, file)));
  };

  /**
   * Return true if the Git working tree is dirty.
   */
  readonly getIsDirty = async (): Promise<boolean> => {
    return await this.#spawn('git', ['status', '--porcelain', this.#dir]).stdoutText().then(Boolean);
  };

  /**
   * Get git log entries.
   */
  readonly getLogs = async (start?: string | null, end?: string): Promise<GitLog[]> => {
    start = start?.trim();
    end = end?.trim() || 'HEAD';

    const formatEntries = Object.entries(LOG_FORMAT);
    const formatNames = formatEntries.map(([name]) => name);
    const formatPlaceholders = formatEntries.map(([, placeholder]) => placeholder);
    const text = await this.#spawn('git', [
      'log',
      `--pretty=format:${LOG_CAP} ${formatPlaceholders.join(LOG_SEPARATOR)} ${LOG_CAP}`,
      start ? `${start}..${end}` : end,
      '--',
      this.#dir,
    ]).stdoutText();

    return [...text.matchAll(/\0{3}(.*)\0{3}/gsu)].flatMap(([, content = '']) => {
      const values = content.split(LOG_SEPARATOR).map((value) => value.trim());
      const log = Object.fromEntries(formatNames.map((name, index) => [name, values[index]]));
      return log as unknown as GitLog;
    });
  };

  readonly #spawn: Spawn = (cmd, sparseOrgs, spawnOptions) => {
    return spawn(cmd, sparseOrgs, { log: this.#log, cwd: this.#dir, ...spawnOptions });
  };
}
