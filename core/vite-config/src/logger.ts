import { importRelative } from '@wurk/import';

import { getVersionRange } from './get-version.js';

type Exports = typeof import('vite');

const { moduleExports } = await importRelative<Exports>('vite', { versionRange: getVersionRange('vite') });
const { createLogger } = moduleExports;

export const logger = createLogger();
