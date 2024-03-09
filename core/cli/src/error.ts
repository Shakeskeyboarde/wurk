class CliUsageError extends Error {
  constructor(message: unknown) {
    super(typeof message === 'string' ? message : 'cli parsing failed', {
      cause: typeof message !== 'string' ? message : undefined,
    });
  }

  static from(cause: unknown): CliUsageError {
    return cause instanceof CliUsageError ? cause : new CliUsageError(cause);
  }
}

export { CliUsageError };
