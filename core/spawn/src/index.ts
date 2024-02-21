import { JsonAccessor } from '@wurk/json';
import { type Log, log as defaultLog } from '@wurk/log';
import { spawn as crossSpawn } from 'cross-spawn';
import { npmRunPath } from 'npm-run-path';

type SpawnInput = WithImplicitCoercion<Uint8Array | readonly number[] | string>;
type SpawnOutput = 'ignore' | 'inherit' | 'echo' | 'buffer';

interface SpawnResult {
  readonly stdout: Buffer;
  readonly stdoutText: string;
  readonly stdoutJson: JsonAccessor;
  readonly stderr: Buffer;
  readonly stderrText: string;
  readonly stderrJson: JsonAccessor;
  readonly combined: Buffer;
  readonly combinedText: string;
  readonly exitCode: number;
  readonly signalCode: NodeJS.Signals | null;
  readonly ok: boolean;
}

export type SpawnPromise = Promise<SpawnResult> & {
  stdout(): Promise<Buffer>;
  stdoutText(): Promise<string>;
  stdoutJson(): Promise<JsonAccessor>;
  stderr(): Promise<Buffer>;
  stderrText(): Promise<string>;
  stderrJson(): Promise<JsonAccessor>;
  combined(): Promise<Buffer>;
  combinedText(): Promise<string>;
  exitCode(): Promise<number>;
  signalCode(): Promise<NodeJS.Signals | null>;
  ok(): Promise<boolean>;
};

export class SpawnError extends Error {
  readonly exitCode: number;
  readonly signalCode: NodeJS.Signals | null;

  constructor(cmd: string, exitCode: number, signalCode: NodeJS.Signals | null) {
    super(exitCode !== 0 ? `process "${cmd}" exited with a non-zero status (${exitCode})` : `process "${cmd}" failed`);

    this.exitCode = exitCode;
    this.signalCode = signalCode;
  }
}

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
   * Data to write to the child process stdin.
   */
  readonly input?: SpawnInput;
  /**
   * Method of handling the output streams. Defaults to `buffer` which stores
   * stream output in memory.
   */
  readonly output?: SpawnOutput;
  /**
   * Logger to use for logging.
   */
  readonly log?: Log;
  /**
   * Do not throw an error if the child process exits with a non-zero status.
   */
  readonly allowNonZeroExitCode?: boolean;
}

export type SpawnSparseArgs = readonly (string | number | false | null | undefined | SpawnSparseArgs)[];

export type Spawn = typeof spawn;

export const spawn = (cmd: string, sparseArgs: SpawnSparseArgs = [], options: SpawnOptions = {}): SpawnPromise => {
  const { cwd, env, input, output = 'buffer', log = defaultLog, allowNonZeroExitCode = false } = options;
  const args = getArgs(sparseArgs);

  if (output === 'echo' || output === 'inherit') {
    log.print(`> ${quote(cmd, ...args)}`, { to: 'stderr', prefix: output !== 'inherit' });
  } else {
    log.debug(`> ${quote(cmd, ...args)}`);
  }

  const cp = crossSpawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env, PATH: npmRunPath({ cwd, path: env?.PATH ?? process.env.PATH }) },
    stdio: [
      input != null ? 'pipe' : 'ignore',
      output === 'ignore' || output === 'inherit' ? output : 'pipe',
      output === 'ignore' || output === 'inherit' ? output : 'pipe',
    ],
  });

  /*
   * Switch the streams to flowing mode on the next tick, if they aren't
   * already, to prevent memory leaks. Not entirely sure this is
   * necessary, but I think it's better to be safe than sorry.
   */
  process.nextTick(() => {
    cp.stdout?.resume();
    cp.stderr?.resume();
  });

  const data: { stream: 'stdout' | 'stderr'; chunk: Buffer }[] = [];

  if (output === 'buffer') {
    cp.stdout?.on('data', (chunk: Buffer) => data.push({ stream: 'stdout', chunk }));
    cp.stderr?.on('data', (chunk: Buffer) => data.push({ stream: 'stderr', chunk }));
  } else if (output === 'echo') {
    cp.stdout?.pipe(log.stdout);
    cp.stderr?.pipe(log.stderr);
  }

  if (input != null) {
    cp.stdin?.end(Buffer.from(input));
  }

  const promise = new Promise<SpawnResult>((resolve, reject) => {
    cp.on('error', reject);

    cp.on('close', (exitCode, signalCode) => {
      log.flush();

      exitCode ??= 1;

      if (exitCode !== 0 && !allowNonZeroExitCode) {
        if (output !== 'echo' && output !== 'inherit') {
          log.print(`> ${quote(cmd, ...args)}`, { to: 'stderr' });

          if (data.length) {
            log.print(
              Buffer.concat(data.map(({ chunk }) => chunk))
                .toString('utf-8')
                .trim(),
              { to: 'stderr' },
            );
          }
        }

        reject(new SpawnError(cmd, exitCode, signalCode));

        return;
      }

      try {
        const result: SpawnResult = {
          get stdout() {
            return Buffer.concat(data.filter(({ stream }) => stream === 'stdout').map(({ chunk }) => chunk));
          },
          get stdoutText() {
            return result.stdout.toString('utf-8').trim();
          },
          get stdoutJson() {
            return JsonAccessor.parse(result.stdoutText);
          },
          get stderr() {
            return Buffer.concat(data.filter(({ stream }) => stream === 'stderr').map(({ chunk }) => chunk));
          },
          get stderrText() {
            return result.stderr.toString('utf-8').trim();
          },
          get stderrJson() {
            return JsonAccessor.parse(result.stderrText);
          },
          get combined() {
            return Buffer.concat(data.map(({ chunk }) => chunk));
          },
          get combinedText() {
            return result.combined.toString('utf-8').trim();
          },
          exitCode,
          signalCode,
          ok: exitCode === 0,
        };

        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });

  return Object.assign(promise, {
    stdout: () => promise.then((result) => result.stdout),
    stdoutText: () => promise.then((result) => result.stdoutText),
    stdoutJson: () => promise.then((result) => result.stdoutJson),
    stderr: () => promise.then((result) => result.stderr),
    stderrText: () => promise.then((result) => result.stderrText),
    stderrJson: () => promise.then((result) => result.stderrJson),
    combined: () => promise.then((result) => result.combined),
    combinedText: () => promise.then((result) => result.combinedText),
    exitCode: () =>
      promise
        .then((result) => result.exitCode)
        .catch((error) => {
          if (!(error instanceof SpawnError)) throw error;
          return error.exitCode;
        }),
    signalCode: () =>
      promise
        .then((result) => result.signalCode)
        .catch((error) => {
          if (!(error instanceof SpawnError)) throw error;
          return error.signalCode;
        }),
    ok: () =>
      promise
        .then((result) => result.ok)
        .catch((error) => {
          if (!(error instanceof SpawnError)) throw error;
          return false;
        }),
  });
};

const quote = (...args: readonly string[]): string => {
  return args
    .map((arg) => {
      if (/["`!#$^&*|?;<>(){}[\]\\]/u.test(arg)) return `'${arg.replaceAll(/(['\\])/gu, '\\$1')}'`;
      if (/['\s]/u.test(arg)) return `"${arg}"`;

      return arg;
    })
    .join(' ');
};

const getArgs = (args: SpawnSparseArgs): string[] => {
  return args.flatMap((value): string | string[] => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString(10);
    if (Array.isArray(value)) return getArgs(value);

    return [];
  });
};
