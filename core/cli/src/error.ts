interface CliUsageErrorContext {
  getHelpText(error?: unknown): string;
  printHelp(error?: unknown): void;
}

interface CliUsageErrorOptions {
  readonly context?: CliUsageErrorContext;
}

/**
 * An error thrown when the CLI usage is incorrect.
 */
export class CliUsageError extends Error {
  /**
   * Context for the usage error which can be used to get or print help text.
   */
  context?: CliUsageErrorContext;

  /**
   * Create a new `CliUsageError`.
   */
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

  /**
   * Create a new `CliUsageError` from the given cause.
   *
   * If the cause is already a `CliUsageError`, it is returned as is.
   * Otherwise, this is equivalent to `new CliUsageError(cause, options)`.
   */
  static from(cause: unknown, options?: CliUsageError): CliUsageError {
    return cause instanceof CliUsageError ? cause : new CliUsageError(cause, options);
  }
}
