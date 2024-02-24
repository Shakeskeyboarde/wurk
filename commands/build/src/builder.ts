import { type Log, type Workspace } from 'wurk';

export type BuilderFactory = (workspace: Workspace) => Promise<Builder | null>;

export interface BuilderOptions<T> {
  readonly build?: ((log: Log, value: T) => Promise<void>) | null;
  readonly start?: ((log: Log, value: T) => Promise<void>) | null;
  readonly matrix?: readonly T[];
}

export class Builder<T = unknown> {
  readonly #matrix: readonly any[];
  readonly build: (() => Promise<void>) | null;
  readonly start: (() => Promise<void>) | null;

  constructor(name: string, workspace: Workspace, options: BuilderOptions<T>) {
    const { log, status, fs, getMissingEntrypoints } = workspace;

    this.#matrix = options.matrix?.length ? options.matrix : [undefined];

    this.build = options.build
      ? async () => {
          status.set('pending', name);

          for (const [index, value] of this.#matrix.entries()) {
            const taskLog =
              this.#matrix.length > 1
                ? log.clone({ prefix: `${log.prefix}[${index}]` })
                : log;

            await options.build!(taskLog, value);
          }

          const missing = await getMissingEntrypoints();

          if (missing.length) {
            status.set('warning', 'entry points');
            log.warn(`missing entry points:`);
            missing.forEach(({ type, filename }) => {
              log.warn(`- ${fs.relative(filename)} (${type})`);
            });
          } else {
            status.set('success');
          }
        }
      : null;

    this.start = options.start
      ? async () => {
          await Promise.all(
            this.#matrix.map(async (value, index) => {
              const taskLog = log.clone({ prefix: `${log.prefix}[${index}]` });

              await options.start!(taskLog, value).catch((error) => {
                process.exitCode ||= 1;
                taskLog.error(error);
              });
            }),
          );
        }
      : null;
  }
}
