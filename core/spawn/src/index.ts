import { JsonAccessor } from '@wurk/json';
import { type Log, log as defaultLog } from '@wurk/log';
import { spawn as crossSpawn } from 'cross-spawn';
import { npmRunPath } from 'npm-run-path';

type SpawnInput = WithImplicitCoercion<Uint8Array | readonly number[] | string>;
type SpawnOutput = 'ignore' | 'inherit' | 'echo' | 'buffer';

interface LiteralArg {
  readonly literal: string;
}

export interface SpawnResult {
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

export interface SpawnOptions {
  /**
   * Current working directory of the child process.
   */
  readonly cwd?: string;
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
   * Print the command to the log before running it. Defaults to `true` if
   * the `output` option is `echo` or `inherit`, otherwise `false`.
   */
  readonly logCommand?:
    | boolean
    | {
        readonly mapArgs?: (
          arg: string,
        ) => boolean | string | LiteralArg | null | (string | LiteralArg)[];
      };
  /**
   * Do not throw an error if the child process exits with a non-zero status.
   */
  readonly allowNonZeroExitCode?: boolean;
}

export type SpawnSparseArgs = readonly (
  | string
  | number
  | false
  | null
  | undefined
  | SpawnSparseArgs
)[];

export type Spawn = typeof spawn;

export const spawn = (
  cmd: string,
  sparseArgs: SpawnSparseArgs = [],
  options: SpawnOptions = {},
): SpawnPromise => {
  const {
    cwd,
    env,
    input,
    output = 'buffer',
    log = defaultLog,
    logCommand = output === 'echo' || output === 'inherit',
    allowNonZeroExitCode = false,
  } = options;
  const args = getArgs(sparseArgs);

  if (logCommand) {
    const mapArgs =
      (typeof logCommand === 'object' && logCommand.mapArgs) || ((arg) => arg);
    const mappedArgs = args.flatMap((arg) => {
      const mappedArg = mapArgs(arg);
      return mappedArg == null
        ? []
        : typeof mappedArg === 'boolean'
          ? mappedArg
            ? arg
            : []
          : mappedArg;
    });

    log.print({
      to: 'stderr',
      prefix: output !== 'inherit',
    })`> ${quote(cmd, ...mappedArgs)}`;
  } else {
    log.debug`> ${quote(cmd, ...args)}`;
  }

  const cp = crossSpawn(cmd, args, {
    cwd,
    env: {
      ...process.env,
      ...env,
      PATH: npmRunPath({ cwd, path: env?.PATH ?? process.env.PATH }),
    },
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
    cp.stdout?.on('data', (chunk: Buffer) =>
      data.push({ stream: 'stdout', chunk }),
    );
    cp.stderr?.on('data', (chunk: Buffer) =>
      data.push({ stream: 'stderr', chunk }),
    );
  } else if (output === 'echo') {
    cp.stdout?.pipe(log.stdout);
    cp.stderr?.pipe(log.stderr);
  }

  if (input != null) {
    cp.stdin?.end(Buffer.from(input));
  }

  const promise = new Promise<SpawnResult>((resolve, reject) => {
    cp.on('error', (error: Error & { code?: unknown }) => {
      reject(
        error?.code === 'ENOENT'
          ? Object.assign(new Error(`${cmd} is required`, { cause: error }), {
              code: error.code,
            })
          : error,
      );
    });

    cp.on('close', (exitCode, signalCode) => {
      log.flush();

      exitCode ??= 1;

      if (exitCode !== 0 && !allowNonZeroExitCode) {
        if (output !== 'echo' && output !== 'inherit') {
          log.print({ to: 'stderr' })`> ${quote(cmd, ...args)}`;

          if (data.length) {
            log.print({
              to: 'stderr',
              message: Buffer.concat(data.map(({ chunk }) => chunk))
                .toString('utf8')
                .trim(),
            });
          }
        }

        reject(new SpawnExitCodeError(cmd, exitCode, signalCode));

        return;
      }

      try {
        const result: SpawnResult = {
          get stdout() {
            return Buffer.concat(
              data
                .filter(({ stream }) => stream === 'stdout')
                .map(({ chunk }) => chunk),
            );
          },
          get stdoutText() {
            return result.stdout.toString('utf8').trim();
          },
          get stdoutJson() {
            return JsonAccessor.parse(result.stdoutText);
          },
          get stderr() {
            return Buffer.concat(
              data
                .filter(({ stream }) => stream === 'stderr')
                .map(({ chunk }) => chunk),
            );
          },
          get stderrText() {
            return result.stderr.toString('utf8').trim();
          },
          get stderrJson() {
            return JsonAccessor.parse(result.stderrText);
          },
          get combined() {
            return Buffer.concat(data.map(({ chunk }) => chunk));
          },
          get combinedText() {
            return result.combined.toString('utf8').trim();
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

  return new SpawnPromise(promise);
};

export class SpawnPromise extends Promise<SpawnResult> {
  constructor(promise: Promise<SpawnResult>) {
    super((resolve, reject) => {
      promise.then(resolve, reject);
    });
  }

  /**
   * Do this or the above promise constructor will be invoked for then/catch
   * chaining and it will break because the constructor does not match the
   * base Promise constructor.
   */
  static [Symbol.species] = Promise;

  async stdout(): Promise<Buffer> {
    return await this.then((result) => result.stdout);
  }

  async stdoutText(): Promise<string> {
    return await this.then((result) => result.stdoutText);
  }

  async stdoutJson(): Promise<JsonAccessor> {
    return await this.then((result) => result.stdoutJson);
  }

  async stderr(): Promise<Buffer> {
    return await this.then((result) => result.stderr);
  }

  async stderrText(): Promise<string> {
    return await this.then((result) => result.stderrText);
  }

  async stderrJson(): Promise<JsonAccessor> {
    return await this.then((result) => result.stderrJson);
  }

  async combined(): Promise<Buffer> {
    return await this.then((result) => result.combined);
  }

  async combinedText(): Promise<string> {
    return await this.then((result) => result.combinedText);
  }

  async exitCode(): Promise<number> {
    return await this.then((result) => result.exitCode).catch(
      (error: unknown) => {
        if (!(error instanceof SpawnExitCodeError)) throw error;
        return error.exitCode;
      },
    );
  }

  async signalCode(): Promise<NodeJS.Signals | null> {
    return await this.then((result) => result.signalCode).catch(
      (error: unknown) => {
        if (!(error instanceof SpawnExitCodeError)) throw error;
        return error.signalCode;
      },
    );
  }

  async ok(): Promise<boolean> {
    return await this.then((result) => result.ok).catch((error: unknown) => {
      if (!(error instanceof SpawnExitCodeError)) throw error;
      return false;
    });
  }
}

export class SpawnExitCodeError extends Error {
  readonly exitCode: number;
  readonly signalCode: NodeJS.Signals | null;

  constructor(
    cmd: string,
    exitCode: number,
    signalCode: NodeJS.Signals | null,
  ) {
    super(
      exitCode !== 0
        ? `process "${cmd}" exited with a non-zero status (${exitCode})`
        : `process "${cmd}" failed`,
    );

    this.exitCode = exitCode;
    this.signalCode = signalCode;
  }
}

const quote = (...args: readonly (string | LiteralArg)[]): string => {
  return args
    .map((arg) => {
      if (isLiteralArg(arg)) {
        return arg.literal;
      }

      if (/["`!#$^&*|?;<>(){}[\]\\]/u.test(arg)) {
        return `'${arg.replaceAll(/(['\\])/gu, '\\$1')}'`;
      }

      if (/['\s]/u.test(arg)) {
        return `"${arg}"`;
      }

      return arg;
    })
    .join(' ');
};

const isLiteralArg = (arg: unknown): arg is LiteralArg => {
  return typeof arg === 'object' && arg !== null && 'literal' in arg;
};

const getArgs = (args: SpawnSparseArgs): string[] => {
  return args.flatMap((value): string | string[] => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString(10);
    if (Array.isArray(value)) return getArgs(value);

    return [];
  });
};
