interface CliUsageErrorContext {
  getHelpText(error?: unknown): string;
  printHelp(error?: unknown): void;
}

interface CliUsageErrorOptions {
  readonly context?: CliUsageErrorContext;
}

class CliUsageError extends Error {
  context?: CliUsageErrorContext;

  constructor(cause: unknown, options?: CliUsageErrorOptions) {
    const message = typeof cause === 'string'
      ? cause
      : cause instanceof Error
        ? cause.message
        : 'cli parsing failed';

    super(message, {
      cause: typeof message !== 'string' ? message : undefined,
    });

    this.context = options?.context;
  }

  static from(cause: unknown, options?: CliUsageError): CliUsageError {
    return cause instanceof CliUsageError ? cause : new CliUsageError(cause, options);
  }
}

export { CliUsageError };
