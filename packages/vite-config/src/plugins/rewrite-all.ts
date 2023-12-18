import { importRelative } from '@werk/cli';
import type { ViteDevServer } from 'vite';

import { getVersion } from '../get-version.js';

type Exports = {
  default(): {
    name: string;
    configureServer(server: ViteDevServer): () => void;
  };
};

export default async () => {
  const { exports } = await importRelative<Exports>('vite-plugin-rewrite-all', {
    version: getVersion('vite-plugin-rewrite-all'),
  });
  const { default: plugin } = exports;

  return plugin();
};
