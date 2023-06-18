import { type LogLevel } from './utils/log.js';

export interface LogOptions {
  readonly level: LogLevel;
  readonly prefix: boolean;
}

export interface SelectOptions {
  readonly withDependencies: boolean;
  readonly includeWorkspaces: readonly string[];
  readonly includeKeywords: readonly string[];
  readonly excludeWorkspaces: readonly string[];
  readonly excludeKeywords: readonly string[];
  readonly excludePrivate: boolean;
  readonly excludePublic: boolean;
  readonly excludePublished: boolean;
  readonly excludeUnpublished: boolean;
  readonly excludeModified: boolean;
  readonly excludeUnmodified: boolean;
}

export interface RunOptions {
  readonly concurrency: number;
  readonly wait: boolean;
}

export interface GitOptions {
  readonly gitFromRevision: string | undefined;
  readonly gitHead: string | undefined;
}

export interface GlobalOptions {
  readonly log: LogOptions;
  readonly select: SelectOptions;
  readonly run: RunOptions;
  readonly git: GitOptions;
}
