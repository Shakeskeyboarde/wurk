export interface ProgramRunOptions {
  /**
   * What to do when an error occurs.
   *
   * - `exit`: (default) Exit the process with a non-zero exit code.
   * - `reject`: Reject the promise with an `ArgsError`.
   * - `resolve`: Resolve the promise with an `ArgsError`.
   * - `never`: Never resolve or reject the promise.
   */
  readonly errorAction?: 'exit' | 'reject' | 'resolve' | 'never';

  /**
   * Whether or not to print help text to STDERR when an error occurs.
   * Defaults to `false`.
   */
  readonly printHelpOnError?: boolean;
}
