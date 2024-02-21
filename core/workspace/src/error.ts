export class AbortError extends Error {
  constructor(cause?: any) {
    super('aborted', { cause });
  }
}
