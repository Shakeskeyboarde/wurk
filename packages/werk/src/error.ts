/* eslint-disable unicorn/no-process-exit */
import { log } from './utils/log.js';

export const onError = (error: unknown): never => {
  if (process.env.DEBUG) {
    console.error(error);
  } else {
    log.error(error instanceof Error ? error.message : `${error}`);
  }

  process.exit(process.exitCode ?? 1);
};
