import { type SpawnSyncReturns } from 'node:child_process';

import { sync as crossSpawnSync } from 'cross-spawn';
import { npmRunPath } from 'npm-run-path';
import { quote } from 'shell-quote';

import { log as defaultLog } from './log.js';
import { type SpawnOptions } from './spawn.js';

type GetOutputSync = {
  (): Buffer;
  (encoding: BufferEncoding): string;
  (encoding?: BufferEncoding): string | Buffer;
};

export type SpawnSyncOptions = Pick<
  SpawnOptions,
  'cwd' | 'env' | 'echo' | 'capture' | 'errorThrow' | 'errorMessage' | 'log'
>;

export interface SpawnSyncResult {
  readonly getStdout: GetOutputSync;
  readonly getStderr: GetOutputSync;

  readonly getJson: <T>() => T;
  readonly tryGetJson: <T>() => T | undefined;

  readonly getExitCode: () => number;
  readonly getError: () => unknown;

  readonly succeeded: () => boolean;
  readonly failed: () => boolean;
}

export const spawnSync = (
  cmd: string,
  args: readonly (string | undefined | null)[] = [],
  {
    cwd,
    env = process.env,
    echo,
    capture,
    errorThrow,
    errorMessage,
    log = defaultLog,
    ...options
  }: SpawnSyncOptions = {},
): SpawnSyncResult => {
  const args_ = args.filter((value): value is string => value != null);

  let exitCode = 0;
  let error: unknown;
  let spawnResult: SpawnSyncReturns<Buffer>;

  try {
    spawnResult = crossSpawnSync(cmd, args_, {
      ...options,
      stdio: ['ignore', echo || capture ? 'pipe' : 'ignore', echo || capture ? 'pipe' : 'ignore'],
      cwd,
      env: {
        ...env,
        PATH: npmRunPath({ cwd: cwd, path: env.PATH }),
      },
    });
    error = new Error(`Spawned process failed: ${quote([cmd, ...args_])}`);
    exitCode = spawnResult.status ?? 1;
  } catch (err) {
    error = err;
    exitCode = 1;
  }

  if (errorMessage && error != null) log.error(errorMessage(error, exitCode));
  if (errorThrow && error != null) throw error;

  const result: SpawnSyncResult = {
    getStdout: (encoding?: BufferEncoding): any => spawnResult.stdout.toString(encoding),
    getStderr: (encoding?: BufferEncoding): any => spawnResult.stderr.toString(encoding),
    getJson: () => JSON.parse(result.getStdout('utf-8')),
    tryGetJson: () => {
      try {
        return JSON.parse(result.getStdout('utf-8'));
      } catch {
        return;
      }
    },
    getExitCode: () => exitCode,
    getError: () => error,
    succeeded: () => exitCode === 0,
    failed: () => !result.succeeded(),
  };

  return result;
};

export type SpawnSync = typeof spawnSync;
