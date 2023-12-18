import { defineWerkConfig, type WerkConfigOptions } from '@werk/vite-config';

const options: WerkConfigOptions | undefined = await Promise.resolve(process.env.VITE_WERK_OPTIONS!)
  .then(JSON.parse)
  .catch(() => undefined);

export default defineWerkConfig(options);
