import { env } from './env.js';

export type LogLevelString = keyof typeof LogLevel;

export enum LogLevel {
  silent = 0,
  error = 10,
  warn = 20,
  notice = 30,
  info = 40,
  verbose = 50,
  silly = 60,
}

export const setLogLevel = (
  level: LogLevel | LogLevelString | 'trace' | 'debug' | (string & {}) | undefined | null,
): void => {
  if (typeof level === 'string') {
    switch (level) {
      case 'trace':
        level = 'silly' satisfies LogLevelString;
        break;
      case 'debug':
        level = 'verbose' satisfies LogLevelString;
        break;
      default:
        if (!isLogLevelString(level)) return;
        break;
    }
  } else if (level != null) {
    level = LogLevel[level] as keyof typeof LogLevel;
  }

  env.WURK_LOG_LEVEL = level ?? undefined;
};

export const getLogLevel = (): LogLevel | undefined => {
  return isLogLevelString(env.WURK_LOG_LEVEL) ? LogLevel[env.WURK_LOG_LEVEL] : undefined;
};

export const isLogLevel = (level: LogLevel): boolean => {
  return level <= (getLogLevel() ?? LogLevel.info);
};

const isLogLevelString = (value: unknown): value is LogLevelString => {
  return typeof value === 'string' && value in LogLevel;
};
