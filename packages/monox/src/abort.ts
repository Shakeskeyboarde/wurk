export class AbortError extends Error {
  exitCode: number;

  constructor(message: string | undefined, exitCode: number) {
    super(message);
    this.name = 'AbortError';
    this.exitCode = exitCode;
  }
}

export const abort = function (errorMessage?: string, exitCode = 1): never {
  throw new AbortError(errorMessage, exitCode);
};
