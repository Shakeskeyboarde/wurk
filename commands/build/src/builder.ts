import { type Entrypoint, type Log, type Workspace } from 'wurk';

export type BuilderFactory = (workspace: Workspace) => Promise<Builder | null>;

export interface BuilderOptions<T> {
  readonly build?: ((log: Log, value: T) => Promise<void>) | false;
  readonly start?: ((log: Log, value: T) => Promise<void>) | false;
  readonly matrix?: readonly T[];
}

export class Builder<T = unknown> {
  readonly #matrix: readonly any[];
  readonly name: string;
  readonly build: ((log: Log) => Promise<void>) | null;
  readonly start: ((log: Log) => Promise<void>) | null;

  constructor(name: string, workspace: Workspace, options: BuilderOptions<T>) {
    const { status, fs, getEntrypoints } = workspace;
    const { build, start, matrix } = options;

    this.#matrix = matrix?.length ? matrix : [undefined];
    this.name = name;

    this.build = build
      ? async (log) => {
          status.set(
            'pending',
            status.detail ? `${status.detail}, ${name}` : name,
          );

          for (const [index, value] of this.#matrix.entries()) {
            const taskLog = log.clone({
              prefix: `${log.prefix}${this.#matrix.length > 1 ? `[${index}]` : ''}`,
            });

            await build(taskLog, value);
          }

          const entrypoints = getEntrypoints();
          const missingEntrypoints: Entrypoint[] = [];

          for (const entrypoint of entrypoints) {
            if (!(await entrypoint.exists())) {
              missingEntrypoints.push(entrypoint);
            }
          }

          if (missingEntrypoints.length) {
            status.set('warning', 'entry points');
            log.warn`missing entry points:`;
            missingEntrypoints.forEach(({ type, filename }) => {
              log.warn`- ${fs.relative(filename)} (${type})`;
            });
          } else {
            status.set('success');
          }
        }
      : null;

    this.start = start
      ? async (log) => {
          await Promise.all(
            this.#matrix.map(async (value, index) => {
              const taskLog = log.clone({
                prefix: `${log.prefix}${this.#matrix.length > 1 ? `[${index}]` : ''}`,
              });

              await start(taskLog, value).catch((error: unknown) => {
                process.exitCode ||= 1;
                taskLog.error({ message: error });
              });
            }),
          );
        }
      : null;
  }
}
