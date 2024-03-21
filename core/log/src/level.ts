/**
 * Log level name string type.
 */
export type LogLevelString = keyof typeof LogLevel;

/**
 * Weighted log levels.
 */
export enum LogLevel {
  silent = 0,
  error = 10,
  warn = 20,
  notice = 30,
  info = 40,
  verbose = 50,
  silly = 60,
}

/**
 * Set the global log level. This is stored in an environment variable so that
 * it can be accessed from anywhere in the application and inherited by child
 * processes.
 */
export const setLogLevel = (level:
  | LogLevel
  | LogLevelString
  | 'trace'
  | 'debug'
  | (string & {})
  | undefined
  | null): void => {
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
  }
  else if (level != null) {
    level = LogLevel[level] as keyof typeof LogLevel;
  }

  process.env.WURK_LOG_LEVEL = level ?? undefined;
};

/**
 * Get the current global log level from the environment, or the default
 * level if it is not set. The default level is `info` unless the `DEBUG`
 * environment variable is set, in which case it is `silly`.
 */
export const getLogLevel = (): LogLevel => {
  return isLogLevelString(process.env.WURK_LOG_LEVEL)
    ? LogLevel[process.env.WURK_LOG_LEVEL]
    : process.env.DEBUG
      ? LogLevel.silly
      : LogLevel.info;
};

/**
 * Check if the given log level is enabled.
 */
export const isLogLevel = (level: LogLevel): boolean => {
  return level <= getLogLevel();
};

const isLogLevelString = (value: unknown): value is LogLevelString => {
  return typeof value === 'string' && value in LogLevel;
};
