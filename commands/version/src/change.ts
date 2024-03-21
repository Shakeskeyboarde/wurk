/**
 * A change set is a collection of changes that are part of a single version
 * of a single package.
 */
export interface ChangeSet {
  /**
   * The version of the package that the changes are for.
   */
  readonly version: string;
  /**
   * The conventional changes associated with the version.
   */
  readonly changes?: readonly Change[];
  /**
   * Notes for the version.
   */
  readonly notes?: readonly string[];
}

/**
 * A conventional change.
 */
export interface Change {
  /**
   * The conventional change type.
   */
  readonly type: ChangeType;
  /**
   * The conventional scope of the change.
   */
  readonly scope: string | undefined;
  /**
   * A short description of the change.
   */
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
