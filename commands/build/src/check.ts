import path from 'node:path';

import { type Workspace } from 'wurk';

export const check = async ({ log, status, dir, getMissingEntrypoints }: Workspace): Promise<void> => {
  const missing = await getMissingEntrypoints();

  if (missing.length) {
    status.set('warning', 'entry points');
    log.warn(`missing entry points:`);
    missing.forEach(({ type, filename }) => log.warn(`  - ${path.relative(dir, filename)} (${type})`));
  }
};
