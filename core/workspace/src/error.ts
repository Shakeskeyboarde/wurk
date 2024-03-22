/**
 * Error thrown by workspace `forEach*` methods when a callback aborts the
 * iteration.
 */
export class WorkspaceAbortError extends Error {
  /**
   * Create a new abort error.
   */
  constructor(cause?: any) {
    super('aborted', { cause });
  }
}
