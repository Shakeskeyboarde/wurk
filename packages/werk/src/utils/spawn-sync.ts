import { type SpawnSyncReturns } from 'node:child_process';

import { sync as crossSpawnSync } from 'cross-spawn';
import { npmRunPath } from 'npm-run-path';
import { quote } from 'shell-quote';

import { log as defaultLog } from './log.js';
import { type SpawnOptions, type SpawnResult } from './spawn.js';

export type SpawnSyncOptions = Pick<
  SpawnOptions,
  'cwd' | 'env' | 'echo' | 'capture' | 'errorReturn' | 'errorMessage' | 'log'
>;

export type SpawnSyncResult = Omit<SpawnResult, 'output'>;

export const spawnSync = (
  cmd: string,
  args: readonly (string | undefined | null)[] = [],
  {
    cwd,
    env = process.env,
    echo,
    capture,
    errorReturn,
    errorMessage,
    log = defaultLog,
    ...options
  }: SpawnSyncOptions = {},
): SpawnSyncResult => {
  const args_ = args.filter((value): value is string => value != null);

  let exitCode = 0;
  let error: unknown;
  let spawnResult: SpawnSyncReturns<Buffer> | undefined;

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
  if (!errorReturn && error != null) throw error;

  const result: SpawnSyncResult = {
    stdout: spawnResult?.stdout ?? Buffer.alloc(0),
    stderr: spawnResult?.stderr ?? Buffer.alloc(0),
    exitCode,
    error,
    succeeded: exitCode === 0,
    failed: exitCode !== 0,
    getJson: <T>(): T => JSON.parse(result.stdout.toString('utf-8')),
    tryGetJson: <T>(): T | undefined => {
      try {
        return result.getJson();
      } catch {
        return undefined;
      }
    },
  };

  return result;
};

export type SpawnSync = typeof spawnSync;
