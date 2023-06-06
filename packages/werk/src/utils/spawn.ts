import { spawn as crossSpawn } from 'cross-spawn';
import { npmRunPath } from 'npm-run-path';
import { quote } from 'shell-quote';

import { type Log, log as defaultLog } from '../log.js';

export interface SpawnedProcess extends Promise<void> {
  stdout(): Promise<Buffer>;
  stdout(encoding: BufferEncoding): Promise<string>;
  stdout(encoding?: BufferEncoding): Promise<string | Buffer>;

  stderr(): Promise<Buffer>;
  stderr(encoding: BufferEncoding): Promise<string>;
  stderr(encoding?: BufferEncoding): Promise<string | Buffer>;

  stdio(): Promise<Buffer>;
  stdio(encoding: BufferEncoding): Promise<string>;
  stdio(encoding?: BufferEncoding): Promise<string | Buffer>;

  json<T>(): Promise<T>;
  tryJson<T>(): Promise<T | undefined>;

  succeeded(): Promise<boolean>;
  failed(): Promise<boolean>;

  exitCode(): Promise<number | null>;
  error(): Promise<unknown>;
}

export interface SpawnOptions {
  cwd?: string | URL;
  env?: NodeJS.ProcessEnv;
  echo?: boolean;
  capture?: boolean;
  throw?: boolean;
  log?: Log;
}

export const spawn = (
  command: string,
  args: string[] = [],
  { echo = false, capture = false, throw: throw_ = false, log = defaultLog, ...options }: SpawnOptions = {},
): SpawnedProcess => {
  const cp = crossSpawn(command, args, {
    ...options,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...options?.env,
      PATH: npmRunPath({ cwd: options?.cwd, path: options?.env?.PATH }),
    },
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  const stdio: Buffer[] = [];

  let exitCode: number | null = null;
  let error: unknown = undefined;

  cp.stdout.on('data', (data: Buffer) => {
    if (capture) {
      stdout.push(data);
      stdio.push(data);
    }
    if (echo) {
      log.writeOut(data);
    }
  });

  cp.stderr.on('data', (data: Buffer) => {
    if (capture) {
      stderr.push(data);
      stdio.push(data);
    }
    if (echo) {
      log.writeErr(data);
    }
  });

  cp.on('error', (err) => {
    error = err;
  });

  const promise = new Promise<void>((resolve, reject) =>
    cp.on('close', () => {
      if (cp.exitCode && !error) error = new Error(`command failed\n${quote([command, ...args])}\n${stdio}`);
      if (error && !cp.exitCode) exitCode = 1;

      if (throw_ && error != null) reject(error);
      else resolve();
    }),
  );

  const result: SpawnedProcess = Object.assign(promise, {
    stdout: (encoding?: BufferEncoding): Promise<any> =>
      promise.then(() => (encoding == null ? Buffer.concat(stdout) : Buffer.concat(stdout).toString(encoding).trim())),
    stderr: (encoding?: BufferEncoding): Promise<any> =>
      promise.then(() => (encoding == null ? Buffer.concat(stderr) : Buffer.concat(stderr).toString(encoding).trim())),
    stdio: (encoding?: BufferEncoding): Promise<any> =>
      promise.then(() => (encoding == null ? Buffer.concat(stdio) : Buffer.concat(stdio).toString(encoding).trim())),
    json: () => result.stdout('utf-8').then((value) => JSON.parse(value)),
    tryJson: () => promise.then(() => JSON.parse(stdout.toString())).catch(() => undefined),
    succeeded: () =>
      promise.then(
        () => exitCode === 0 && error == null,
        () => false,
      ),
    failed: () => result.succeeded().then((value) => !value),
    exitCode: () => promise.then(() => exitCode),
    error: () => promise.then(() => error),
  });

  return result;
};

export type Spawn = typeof spawn;
