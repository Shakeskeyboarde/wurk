/* eslint-disable unicorn/no-process-exit */
import { log } from './utils/log.js';

export const onError = (error: unknown): never => {
  log.error(error);

  process.exit(process.exitCode || 1);
};
