export interface ChangeSet {
  readonly version: string;
  readonly changes?: readonly Change[];
  readonly notes?: readonly string[];
}

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
