import { type ArgsErrorType } from './types/error.js';
import { type ArgsErrorConfig } from './types/error-config.js';

export class ArgsError extends Error implements ArgsErrorType {
  readonly command;
  readonly code;

  constructor(message: string, options: ArgsErrorConfig) {
    super(message, options);
    this.command = options.command;
    this.code = options.code;
  }
}
