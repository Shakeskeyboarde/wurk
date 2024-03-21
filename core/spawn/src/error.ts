/**
 * Error thrown when a spawned process exits with a non-zero status.
 */
export class SpawnExitCodeError extends Error {
  /**
   * The exit code of the process.
   */
  readonly exitCode: number;
  /**
   * The signal code of the process, if it was killed by a signal.
   */
  readonly signalCode: NodeJS.Signals | null;

  /**
   * Create a new `SpawnExitCodeError`.
   */
  constructor(
    cmd: string,
    exitCode: number,
    signalCode: NodeJS.Signals | null,
  ) {
    super(exitCode !== 0
      ? `process "${cmd}" exited with a non-zero status (${exitCode})`
      : `process "${cmd}" failed`);

    this.exitCode = exitCode;
    this.signalCode = signalCode;
  }
}
