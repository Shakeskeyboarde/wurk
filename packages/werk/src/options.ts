import { type LogLevel } from './utils/log.js';
import { type SelectOptions } from './workspace/get-workspaces.js';

export interface LogOptions {
  readonly level: LogLevel;
  readonly prefix: boolean;
}

export interface RunOptions {
  readonly parallel: boolean;
  readonly concurrency?: number;
  readonly wait: boolean;
}

export interface GlobalOptions {
  readonly log: LogOptions;
  readonly select: SelectOptions;
  readonly run: RunOptions;
}
