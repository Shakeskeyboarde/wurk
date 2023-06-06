import { spawn as crossSpawn } from 'cross-spawn';
import { npmRunPath } from 'npm-run-path';
import { quote } from 'shell-quote';

import { type Log, log as defaultLog } from '../log.js';

export interface SpawnedProcess extends Promise<void> {
  readonly stdin: NodeJS.WritableStream | null;
  readonly stdout: NodeJS.ReadableStream;
  readonly stderr: NodeJS.ReadableStream;

  readonly getStdout: {
    (): Promise<Buffer>;
    (encoding: BufferEncoding): Promise<string>;
    (encoding?: BufferEncoding): Promise<string | Buffer>;
  };

  readonly getStderr: {
    (): Promise<Buffer>;
    (encoding: BufferEncoding): Promise<string>;
    (encoding?: BufferEncoding): Promise<string | Buffer>;
  };

  readonly getOutput: {
    (): Promise<Buffer>;
    (encoding: BufferEncoding): Promise<string>;
    (encoding?: BufferEncoding): Promise<string | Buffer>;
  };

  readonly getJson: <T>() => Promise<T>;
  readonly tryGetJson: <T>() => Promise<T | undefined>;

  readonly getExitCode: () => Promise<number | null>;
  readonly getError: () => Promise<unknown>;

  readonly succeeded: () => Promise<boolean>;
  readonly failed: () => Promise<boolean>;
}

export interface SpawnOptions {
  readonly cwd?: string | URL;
  readonly env?: NodeJS.ProcessEnv;
  readonly echo?: boolean;
  readonly capture?: boolean;
  readonly input?: boolean;
  readonly throw?: boolean;
  readonly log?: Log;
}

export const spawn = (
  command: string,
  args: string[] = [],
  {
    echo = false,
    capture = false,
    input = false,
    throw: throw_ = false,
    log = defaultLog,
    ...options
  }: SpawnOptions = {},
): SpawnedProcess => {
  const env = options.env ?? process.env;
  const cp = crossSpawn(command, args, {
    ...options,
    stdio: [input ? 'pipe' : 'ignore', echo || capture ? 'pipe' : 'ignore', echo || capture ? 'pipe' : 'ignore'],
    env: {
      ...env,
      PATH: npmRunPath({ cwd: options.cwd, path: env.PATH }),
    },
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  const stdio: Buffer[] = [];

  let exitCode: number | null = null;
  let error: unknown = undefined;

  cp.stdout?.on('data', (data: Buffer) => {
    if (capture) {
      stdout.push(data);
      stdio.push(data);
    }
    if (echo) {
      log.writeOut(data);
    }
  });

  cp.stderr?.on('data', (data: Buffer) => {
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
    stdin: cp.stdin,
    stdout: cp.stdout as NodeJS.ReadableStream,
    stderr: cp.stderr as NodeJS.ReadableStream,
    getStdout: (encoding?: BufferEncoding): Promise<any> =>
      promise.then(() => (encoding == null ? Buffer.concat(stdout) : Buffer.concat(stdout).toString(encoding).trim())),
    getStderr: (encoding?: BufferEncoding): Promise<any> =>
      promise.then(() => (encoding == null ? Buffer.concat(stderr) : Buffer.concat(stderr).toString(encoding).trim())),
    getOutput: (encoding?: BufferEncoding): Promise<any> =>
      promise.then(() => (encoding == null ? Buffer.concat(stdio) : Buffer.concat(stdio).toString(encoding).trim())),
    getJson: () => result.getStdout('utf-8').then((value) => JSON.parse(value)),
    tryGetJson: () => promise.then(() => JSON.parse(stdout.toString())).catch(() => undefined),
    getExitCode: () => promise.then(() => exitCode),
    getError: () => promise.then(() => error),
    succeeded: () =>
      promise.then(
        () => exitCode === 0 && error == null,
        () => false,
      ),
    failed: () => result.succeeded().then((value) => !value),
  });

  return result;
};

export type Spawn = typeof spawn;
