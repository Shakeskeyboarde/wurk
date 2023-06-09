/* eslint-disable unicorn/no-process-exit */
import { log } from './utils/log.js';

export const onError = (error: unknown): never => {
  if (process.env.DEBUG) {
    log.error(error instanceof Error && 'stack' in error ? error.stack : error);
  } else {
    log.error(error instanceof Error ? error.message : `${error}`);
  }

  process.exit(process.exitCode || 1);
};
