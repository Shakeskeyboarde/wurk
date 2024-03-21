import { type JsonAccessor } from '@wurk/json';

/**
 * Result of spawning a child process.
 */
export interface SpawnResult {
  /**
   * The buffered stdout of the process.
   */
  readonly stdout: Buffer;
  /**
   * The buffered stdout of the process as a UTF-8 string.
   */
  readonly stdoutText: string;
  /**
   * The buffered stdout of the process as a JSON decoded value.
   */
  readonly stdoutJson: JsonAccessor;
  /**
   * The buffered stderr of the process.
   */
  readonly stderr: Buffer;
  /**
   * The buffered stderr of the process as a UTF-8 string.
   */
  readonly stderrText: string;
  /**
   * The buffered stderr of the process as a JSON decoded value.
   */
  readonly stderrJson: JsonAccessor;
  /**
   * The combined buffered output of the process.
   */
  readonly combined: Buffer;
  /**
   * The combined buffered output of the process as a UTF-8 string.
   */
  readonly combinedText: string;
  /**
   * The exit code of the process.
   */
  readonly exitCode: number;
  /**
   * The signal code of the process, if it was killed by a signal.
   */
  readonly signalCode: NodeJS.Signals | null;
  /**
   * Convenience property which is true if the process exited with a zero
   * {@link exitCode}.
   */
  readonly ok: boolean;
}
