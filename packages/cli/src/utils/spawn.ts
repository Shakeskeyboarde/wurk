import assert from 'node:assert';
import { type ChildProcess } from 'node:child_process';

import { spawn as crossSpawn } from 'cross-spawn';
import { npmRunPath } from 'npm-run-path';
import { quote } from 'shell-quote';

import { type Log, log as defaultLog } from './log.js';

type GetOutput = {
  (): Promise<Buffer>;
  (encoding: BufferEncoding): Promise<string>;
  (encoding?: BufferEncoding): Promise<string | Buffer>;
};

export type Args = readonly (string | number | false | null | undefined | Args)[];

export interface SpawnOptions {
  /**
   * Current working directory of the child process.
   */
  readonly cwd?: string | URL;
  /**
   * Child process environment.
   */
  readonly env?: NodeJS.ProcessEnv;
  /**
   * Print child process stdout and stderr to the parent process stdout and stderr.
   */
  readonly echo?: boolean | 'inherit';
  /**
   * Capture child process stdout and stderr.
   */
  readonly capture?: boolean;
  /**
   * Provide readable stream access to the child process stdout and stderr.
   */
  readonly stream?: boolean;
  /**
   * Provide writable stream access to the child process stdin.
   *
   * **Note:** Setting this to `true` or `"inherit"` may cause the child
   * process to hang if it continues to listen for input until `stdin` is
   * ended.
   */
  readonly input?: boolean | 'inherit';
  /**
   * Set `process.exitCode` to the child process exit code on error.
   */
  readonly errorSetExitCode?: boolean;
  /**
   * Return on error instead of throwing.
   */
  readonly errorReturn?: boolean;
  /**
   * Print the child process output if it fails.
   */
  readonly errorEcho?: boolean;
  /**
   * Log an error message if the child process fails.
   */
  readonly errorMessage?: (error: unknown, exitCode: number) => string;
  /**
   * Logger to use for logging.
   */
  readonly log?: Log;
}

export interface SpawnResult {
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly output: Buffer;

  readonly getJson: <T>() => T;
  readonly tryGetJson: <T>() => T | undefined;

  readonly exitCode: number;
  readonly error: unknown;

  readonly succeeded: boolean;
  readonly failed: boolean;
}

export interface SpawnPromise extends Promise<SpawnResult> {
  readonly childProcess: ChildProcess;
  readonly stdin: NodeJS.WritableStream | null;
  readonly stdout: NodeJS.ReadableStream | null;
  readonly stderr: NodeJS.ReadableStream | null;

  readonly getStdout: GetOutput;
  readonly getStderr: GetOutput;
  readonly getOutput: GetOutput;

  readonly getJson: <T>() => Promise<T>;
  readonly tryGetJson: <T>() => Promise<T | undefined>;

  readonly getExitCode: () => Promise<number>;
  readonly getError: () => Promise<unknown>;

  readonly succeeded: () => Promise<boolean>;
  readonly failed: () => Promise<boolean>;
}

export const getArgsArray = (args: Args): string[] => {
  return args.flatMap((value): string | string[] => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString(10);
    if (Array.isArray(value)) return getArgsArray(value);
    return [];
  });
};

export const spawn = (
  cmd: string,
  args: Args = [],
  {
    echo = false,
    capture = false,
    stream = false,
    input = false,
    errorSetExitCode = false,
    errorReturn = false,
    errorEcho = false,
    errorMessage,
    log = defaultLog,
    env,
    ...options
  }: SpawnOptions = {},
): SpawnPromise => {
  const args_ = getArgsArray(args);

  assert(
    echo !== 'inherit' || (!capture && !stream),
    'Cannot inherit output streams when "capture" or "stream" are set.',
  );

  log.debug(`$ ${quote([cmd, ...args_])}`);

  const childProcess = crossSpawn(cmd, args_, {
    ...options,
    stdio: [
      input === 'inherit' ? 'inherit' : input ? 'pipe' : 'ignore',
      echo === 'inherit' ? 'inherit' : echo || capture || errorEcho || stream ? 'pipe' : 'ignore',
      echo === 'inherit' ? 'inherit' : echo || capture || errorEcho || stream ? 'pipe' : 'ignore',
    ],
    env: {
      ...process.env,
      ...env,
      PATH: npmRunPath({ cwd: options.cwd, path: env?.PATH ?? process.env.PATH }),
      WERK_CLI: 'true',
    },
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  const stdio: Buffer[] = [];

  let exitCode = 0;
  let error: unknown = undefined;

  if (echo === true) {
    childProcess.stdout?.pipe(log.stdout);
    childProcess.stderr?.pipe(log.stderr);
  }

  if (capture || errorEcho) {
    childProcess.stdout?.on('data', (data: Buffer) => {
      stdout.push(data);
      stdio.push(data);
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      stderr.push(data);
      stdio.push(data);
    });
  }

  childProcess.on('error', (err) => {
    error = err;
  });

  /*
   * Switch the streams to flowing mode on the next tick, if they aren't
   * already, to prevent memory leaks. Not entirely sure this is
   * necessary, but I think it's better to be safe than sorry.
   */
  Promise.resolve()
    .then(() => {
      childProcess.stdout?.resume();
      childProcess.stderr?.resume();
    })
    .catch(() => undefined);

  const promise = new Promise<SpawnResult>((resolve, reject) => {
    childProcess.on('close', () => {
      exitCode = childProcess.exitCode ?? 1;

      if (exitCode && !error) error = new Error(`Spawned process failed: ${quote([cmd, ...args_])}`);
      if (error && !exitCode) exitCode = 1;
      if (errorEcho && error != null) log.verbose(Buffer.concat(stdio).toString('utf-8').trim());
      if (errorMessage && error != null) log.error(errorMessage(error, exitCode));

      if (errorSetExitCode && exitCode) {
        process.exitCode = process.exitCode ?? exitCode;
      }

      if (!errorReturn && error != null) {
        reject(error);
        return;
      }

      const result: SpawnResult = {
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        output: Buffer.concat(stdio),
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

      resolve(result);
    });
  });

  return Object.assign(promise, {
    childProcess,
    stdin: input ? childProcess.stdin : null,
    stdout: stream ? (childProcess.stdout as NodeJS.ReadableStream) : null,
    stderr: stream ? (childProcess.stderr as NodeJS.ReadableStream) : null,
    getStdout: (encoding?: BufferEncoding): Promise<any> =>
      promise.then((result) => (encoding ? result.stdout.toString(encoding).trim() : result.stdout)),
    getStderr: (encoding?: BufferEncoding): Promise<any> =>
      promise.then((result) => (encoding ? result.stderr.toString(encoding).trim() : result.stderr)),
    getOutput: (encoding?: BufferEncoding): Promise<any> =>
      promise.then((result) => (encoding ? result.output.toString(encoding).trim() : result.output)),
    getJson: <T>(): Promise<T> => promise.then((result) => result.getJson<T>()),
    tryGetJson: <T>(): Promise<T | undefined> => promise.then((result) => result.tryGetJson<T>()),
    getExitCode: () => promise.then((result) => result.exitCode),
    getError: () => promise.then((result) => result.error),
    succeeded: () =>
      promise.then(
        (result) => result.succeeded,
        () => false,
      ),
    failed: () =>
      promise.then(
        (result) => result.failed,
        () => true,
      ),
  });
};

export type Spawn = typeof spawn;
