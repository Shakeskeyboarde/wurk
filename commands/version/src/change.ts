export interface Change {
  readonly type: ChangeType;
  readonly scope: string | undefined;
  readonly message: string;
}

/**
 * Enum values are in order of increasing severity.
 */
export enum ChangeType {
  none,
  note,
  docs,
  ci,
  perf,
  tests,
  build,
  chore,
  refactor,
  improvement,
  revert,
  fix,
  feat,
  breaking,
}
