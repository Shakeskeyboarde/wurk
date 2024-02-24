import { Ansi, isLogLevel, type Log, LogLevel } from '@wurk/log';

export enum StatusValue {
  skipped = -2,
  pending = -1,
  success = 0,
  warning = 1,
  failure = 2,
}

export class Status {
  #value: StatusValue = StatusValue.skipped;
  #detail: string = '';

  readonly name: string;

  get value(): StatusValue {
    return this.#value;
  }

  get detail(): string {
    return this.#detail;
  }

  constructor(name: string) {
    this.name = name;
  }

  set(
    value: StatusValue | Extract<keyof typeof StatusValue, string>,
    detail?: string,
  ): this {
    if (typeof value === 'string') {
      value = value in StatusValue ? StatusValue[value] : this.#value;
    }

    this.#value = value;

    if (detail != null) {
      this.#detail = detail;
    }

    return this;
  }

  setDetail(value: string): this {
    this.#detail = value;

    return this;
  }
}

export const printStatus = (
  log: Log,
  entries: Iterable<{ name: string; status: Status }>,
  prefix = '',
): void => {
  let statusLogLevel: LogLevel = LogLevel.notice;

  const statusMessages = Array.from(entries)
    .flatMap((workspace): string[] => {
      let statusMessage: string;

      switch (workspace.status.value) {
        case StatusValue.skipped:
          statusMessage = `${Ansi.dim}skipped${Ansi.reset}`;
          break;
        case StatusValue.success:
          statusMessage = `${Ansi.color.green}success${Ansi.reset}`;
          break;
        case StatusValue.warning:
          statusMessage = `${Ansi.color.yellow}warning${Ansi.reset}`;
          statusLogLevel = LogLevel.warn;
          break;
        case StatusValue.pending:
        case StatusValue.failure:
          statusMessage = `${Ansi.color.red}failure${Ansi.reset}`;
          statusLogLevel = LogLevel.error;
          break;
      }

      return [
        `\n  ${workspace.name}: ${statusMessage}${workspace.status.detail ? ` ${Ansi.reset}${Ansi.dim}(${workspace.status.detail})${Ansi.reset}` : ''}`,
      ];
    })
    .join('');

  if (!isLogLevel(statusLogLevel)) return;

  if (prefix && !prefix.endsWith(' ')) {
    prefix += ' ';
  }

  if (statusMessages) {
    log.print(`${prefix}summary:${statusMessages}`, {
      prefix: false,
      to: 'stderr',
    });
  }

  if (process.exitCode) {
    log.print(`${prefix}failure`, {
      prefix: false,
      to: 'stderr',
      color: 'red',
    });
  } else {
    log.print(`${prefix}success`, {
      prefix: false,
      to: 'stderr',
      color: 'green',
    });
  }
};
