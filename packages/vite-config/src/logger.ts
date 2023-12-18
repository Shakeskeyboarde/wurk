import { importRelative } from '@werk/cli';

type Exports = typeof import('vite');

const { exports } = await importRelative<Exports>('vite', { version: '^5.0.7' });
const { createLogger } = exports;

export const logger = createLogger();
