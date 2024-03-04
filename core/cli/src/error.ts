import { type PartialCli } from './cli.js';

type ErrorCli = PartialCli<'name' | 'getHelpText' | 'printHelp'>;

class CliError extends Error implements CliErrorConfig {
  readonly cli: ErrorCli;
  readonly code: 'CLI_PARSE_ERROR' | 'CLI_ACTION_ERROR';

  protected constructor(message: string | undefined, options: CliErrorConfig) {
    super(message, { cause: options.cause });
    this.cli = options.cli;
    this.code = options.code;
  }
}

class CliParseError extends CliError {
  constructor(
    message: string | undefined,
    options: Omit<CliErrorConfig, 'code'>,
  ) {
    super(message, { ...options, code: 'CLI_PARSE_ERROR' });
  }

  static from(
    cause: unknown,
    options: Omit<CliErrorConfig, 'code' | 'cause'>,
  ): CliError {
    if (cause instanceof CliParseError) {
      return cause;
    }

    return new CliParseError(
      cause instanceof Error
        ? cause.message
        : typeof cause === 'string'
          ? cause
          : undefined,
      {
        ...options,
        cause,
      },
    );
  }
}

class CliActionError extends CliError {
  constructor(
    message: string | undefined,
    options: Omit<CliErrorConfig, 'code'>,
  ) {
    super(message, { ...options, code: 'CLI_ACTION_ERROR' });
  }

  static from(
    cause: unknown,
    options: Omit<CliErrorConfig, 'code' | 'cause'>,
  ): CliError {
    if (cause instanceof CliActionError) {
      return cause;
    }

    const message =
      cause instanceof Error
        ? cause.message
        : typeof cause === 'string'
          ? cause
          : undefined;

    return new CliActionError(message, { ...options, cause });
  }
}

interface CliErrorConfig extends ErrorOptions {
  readonly cli: ErrorCli;
  readonly code: 'CLI_PARSE_ERROR' | 'CLI_ACTION_ERROR';
}

export { CliActionError, CliError, CliParseError, type ErrorCli };
