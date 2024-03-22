import nodePath from 'node:path';

import { JsonAccessor } from '@wurk/json';
import { type Log, log as defaultLog } from '@wurk/log';
import { spawn as crossSpawn } from 'cross-spawn';
import { npmRunPath } from 'npm-run-path';

import { getArgs, type LiteralArg, type SpawnSparseArgs } from './args.js';
import { SpawnExitCodeError } from './error.js';
import { quote } from './quote.js';
import { type SpawnResult } from './result.js';

type SpawnStdio = 'ignore' | 'inherit' | 'echo' | 'buffer';

/**
 * Options for spawning a child process.
 */
export interface SpawnOptions {
  /**
   * Current working directory of the child process.
   */
  readonly cwd?: string;
  /**
   * Child process environment. This always extends the current `process.env`,
   * but variables can be omitted by setting them to `undefined`.
   */
  readonly env?: NodeJS.ProcessEnv;
  /**
   * Child process PATH values to be appended to the current `process.env.PATH`
   * value.
   */
  readonly paths?: readonly string[];
  /**
   * Method of handling the child process input and output streams. Defaults
   * to `buffer` which stores stream output in memory and ignores stdin.
   *
   * The input stream is only inherited if this is set to `inherit`, and the
   * `input` option is not set.
   */
  readonly stdio?: SpawnStdio;
  /**
   * Data to write to the child process stdin.
   */
  readonly input?: Buffer;
  /**
   * Logger to use for process logging.
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

/**
 * Spawn function type.
 */
export type Spawn = typeof spawn;

const promises: {
  readonly all: Set<Promise<unknown>>;
  blocking: Promise<unknown> | undefined;
} = {
  all: new Set(),
  blocking: undefined,
};

/**
 * Spawn a child process.
 */
export const spawn = (
  cmd: string,
  sparseArgs: SpawnSparseArgs = [],
  ...options: SpawnOptions[]
): Promise<SpawnResult> => {
  let promise: Promise<SpawnResult>;

  const mergedOptions = mergeSpawnOptions(...options);

  if (mergedOptions.stdio === 'inherit') {
    // If a stream is inherited, then wait for all other spawned processes to
    // complete before starting, and block new ones from spawning until this
    // process exits.
    promise = Promise.allSettled(promises.all)
      .then(async () => await spawnAsync(cmd, sparseArgs, mergedOptions));

    promises.blocking = promise;

    promise.finally(() => {
      if (promises.blocking === promise) {
        promises.blocking = undefined;
      }
    })
      .catch(() => {});
  }
  else {
    // If no streams are inherited, then only wait if a previous process had
    // inherited streams.
    promise = Promise.allSettled([promises.blocking])
      .then(async () => await spawnAsync(cmd, sparseArgs, mergedOptions));
  }

  promises.all.add(promise);

  promise.finally(() => {
    promises.all.delete(promise);
  })
    .catch(() => {});

  return promise;
};

const spawnAsync = async (
  cmd: string,
  sparseArgs: SpawnSparseArgs = [],
  options: SpawnOptions = {},
): Promise<SpawnResult> => {
  const {
    cwd,
    env,
    paths = [],
    stdio = 'buffer',
    input,
    log = defaultLog,
    logCommand = stdio === 'echo' || stdio === 'inherit',
    allowNonZeroExitCode = false,
  } = options;

  const args = getArgs(sparseArgs);

  if (logCommand) {
    const mapArgs = (typeof logCommand === 'object' && logCommand.mapArgs) || ((arg) => arg);
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
      prefix: stdio !== 'inherit',
    })`> ${quote(cmd, ...mappedArgs)}`;
  }
  else {
    log.debug`> ${quote(cmd, ...args)}`;
  }

  const cp = crossSpawn(cmd, args, {
    detached: false,
    cwd,
    env: {
      ...process.env,
      ...env,
      PATH: [
        nodePath.dirname(process.execPath),
        npmRunPath({ cwd, path: '' }),
        env?.PATH ?? process.env.PATH,
        ...paths,
      ]
        .filter((value): value is string => Boolean(value))
        .join(nodePath.delimiter),
    },
    stdio: [
      input != null ? 'pipe' : stdio === 'inherit' ? 'inherit' : 'ignore',
      stdio === 'ignore' || stdio === 'inherit' ? stdio : 'pipe',
      stdio === 'ignore' || stdio === 'inherit' ? stdio : 'pipe',
    ],
  });

  // Switch the streams to flowing mode on the next tick, if they aren't
  // already, to prevent memory leaks. Not entirely sure this is
  // necessary, but I think it's better to be safe than sorry.
  process.nextTick(() => {
    cp.stdout?.resume();
    cp.stderr?.resume();
  });

  const data: { stream: 'stdout' | 'stderr'; chunk: Buffer }[] = [];

  if (stdio === 'buffer') {
    cp.stdout?.on('data', (chunk: Buffer) => data.push({ stream: 'stdout', chunk }));
    cp.stderr?.on('data', (chunk: Buffer) => data.push({ stream: 'stderr', chunk }));
  }
  else if (stdio === 'echo') {
    cp.stdout?.pipe(log.stdout);
    cp.stderr?.pipe(log.stderr);
  }

  if (input instanceof Buffer) {
    cp.stdin?.end(input);
  }

  return await new Promise<SpawnResult>((resolve, reject) => {
    cp.on('error', (error: Error & { code?: unknown }) => {
      reject(error?.code === 'ENOENT'
        ? Object.assign(new Error(`${cmd} is required`, { cause: error }), {
          code: error.code,
        })
        : error);
    });

    cp.on('close', (exitCode, signalCode) => {
      log.flush();

      exitCode ??= 1;

      if (exitCode !== 0 && !allowNonZeroExitCode) {
        if (stdio === 'buffer') {
          if (!logCommand) {
            // Print out the command if it wasn't logged before.
            log.print({ to: 'stderr' })`> ${quote(cmd, ...args)}`;
          }

          // Dump the buffered output to the log.
          data.forEach(({ stream, chunk }) => log[stream].write(chunk));
        }

        reject(new SpawnExitCodeError(cmd, exitCode, signalCode));

        return;
      }

      const result: SpawnResult = {
        get stdout() {
          return Buffer.concat(data
            .filter(({ stream }) => stream === 'stdout')
            .map(({ chunk }) => chunk));
        },
        get stdoutText() {
          return result.stdout.toString('utf8')
            .replace(/\n$/u, '');
        },
        get stdoutJson() {
          return JsonAccessor.parse(result.stdoutText);
        },
        get stderr() {
          return Buffer.concat(data
            .filter(({ stream }) => stream === 'stderr')
            .map(({ chunk }) => chunk));
        },
        get stderrText() {
          return result.stderr.toString('utf8')
            .replace(/\n$/u, '');
        },
        get stderrJson() {
          return JsonAccessor.parse(result.stderrText);
        },
        get combined() {
          return Buffer.concat(data.map(({ chunk }) => chunk));
        },
        get combinedText() {
          return result.combined.toString('utf8')
            .replace(/\n$/u, '');
        },
        exitCode,
        signalCode,
        ok: exitCode === 0,
      };

      resolve(result);
    });
  });
};

/**
 * Deep merge spawn options.
 *
 * - `cwd` is resolved relative to previous `cwd` values.
 * - `env` is merged with previous `env` values.
 * - `paths` are appended to previous `paths` values.
 */
const mergeSpawnOptions = (...options: (SpawnOptions | undefined)[]): SpawnOptions => {
  return options.reduce<SpawnOptions>((current, next) => {
    return !next
      ? current
      : {
        ...current,
        ...next,
        cwd: nodePath.resolve(...[current.cwd, next.cwd].filter((value): value is string => Boolean(value))),
        env: { ...current.env, ...next.env },
        paths: [...(current.paths ?? []), ...(next.paths ?? [])],
      };
  }, {});
};

// /**
//  * Create a spawn function with default options.
//  */
// export const createSpawn = (getDefaultOptions: () => SpawnOptions): Spawn => {
//   return async (cmd, args, options): Promise<SpawnResult> => {
//     const defaultOptions = getDefaultOptions();
//     const mergedOptions = mergeSpawnOptions(defaultOptions, options);

//     return await spawn(cmd, args, mergedOptions);
//   };
// };
