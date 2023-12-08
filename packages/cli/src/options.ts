import { type LogLevelString } from './utils/log.js';

export interface LogOptions {
  readonly level: LogLevelString;
  readonly prefix: boolean;
}

export interface SelectMatcher {
  readonly match: (value: string) => boolean;
  readonly isSelected: boolean;
}

export interface SelectOptions {
  readonly workspace: readonly SelectMatcher[];
  readonly includeRootWorkspace: boolean;
  readonly dependencies: boolean;
}

export interface RunOptions {
  readonly concurrency: number;
}

export interface GitOptions {
  readonly gitFromRevision: string | undefined;
}

export interface GlobalOptions {
  readonly log: LogOptions;
  readonly select: SelectOptions;
  readonly run: RunOptions;
  readonly git: GitOptions;
}
