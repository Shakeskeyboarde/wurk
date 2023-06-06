import { spawn as crossSpawn } from 'cross-spawn';
import { npmRunPath } from 'npm-run-path';
import { quote } from 'shell-quote';

import { type Log, log as defaultLog } from './log.js';

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
  readonly stream?: boolean;
  readonly input?: boolean;
  readonly errorThrow?: boolean;
  readonly errorEcho?: boolean;
  readonly errorMessage?: (error: unknown, exitCode: number) => string;
  readonly log?: Log;
}

export const spawn = (
  command: string,
  args: string[] = [],
  {
    echo = false,
    capture = false,
    stream = false,
    input = false,
    errorThrow = false,
    errorEcho = true,
    errorMessage,
    log = defaultLog,
    ...options
  }: SpawnOptions = {},
): SpawnedProcess => {
  const env = options.env ?? process.env;
  const cp = crossSpawn(command, args, {
    ...options,
    stdio: [
      input ? 'pipe' : 'ignore',
      echo || capture || errorEcho || stream ? 'pipe' : 'ignore',
      echo || capture || errorEcho || stream ? 'pipe' : 'ignore',
    ],
    env: {
      ...env,
      PATH: npmRunPath({ cwd: options.cwd, path: env.PATH }),
    },
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  const stdio: Buffer[] = [];

  let exitCode = 0;
  let error: unknown = undefined;

  if (echo) {
    cp.stdout?.pipe(log.stdout);
    cp.stderr?.pipe(log.stderr);
  }

  if (capture || errorEcho) {
    cp.stdout?.on('data', (data: Buffer) => {
      stdout.push(data);
      stdio.push(data);
    });

    cp.stderr?.on('data', (data: Buffer) => {
      stderr.push(data);
      stdio.push(data);
    });
  }

  cp.on('error', (err) => {
    error = err;
  });

  // Switch the streams to flowing mode on the next tick, if they aren't
  // already, to prevent memory leaks. Not entirely sure this is
  // necessary, but I think it's better to be safe than sorry.
  Promise.resolve()
    .then(() => {
      cp.stdout?.resume();
      cp.stderr?.resume();
    })
    .catch(() => undefined);

  const promise = new Promise<void>((resolve, reject) =>
    cp.on('close', () => {
      exitCode = cp.exitCode ?? 1;

      if (exitCode && !error) error = new Error(`command failed\n${quote([command, ...args])}\n${stdio}`);
      if (error && !exitCode) exitCode = 1;
      if (errorEcho && error != null) log.debug(Buffer.concat(stdio).toString('utf-8'));
      if (errorMessage && error != null) log.error(errorMessage(error, exitCode));

      if (errorThrow && error != null) reject(error);
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
