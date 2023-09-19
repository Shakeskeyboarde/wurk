import { getViteConfig, type ViteConfigOptions } from '@werk/command-build/vite-config';
import { defineConfig, type UserConfig } from 'vite';

export default defineConfig(async (env): Promise<UserConfig> => {
  const options: ViteConfigOptions | undefined = await Promise.resolve()
    .then(async () => JSON.parse(process.env.VITE_WERK_OPTIONS!))
    .catch(() => undefined);

  return await getViteConfig(env, options);
});
