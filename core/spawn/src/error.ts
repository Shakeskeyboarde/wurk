export class SpawnExitCodeError extends Error {
  readonly exitCode: number;
  readonly signalCode: NodeJS.Signals | null;

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
