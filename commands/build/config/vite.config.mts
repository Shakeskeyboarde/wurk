import { JsonAccessor } from '@wurk/json';
import { defineWurkConfig, PLUGIN_NAMES, type PluginName, type WurkConfigOptions } from '@wurk/vite-config';

export default defineWurkConfig(
  JsonAccessor.parse(process.env.WURK_VITE_OPTIONS).compose<WurkConfigOptions>((root) => {
    return {
      outDir: root.at('outDir').as('string'),
      disablePlugins: root
        .at('disablePlugins')
        .as('array')
        ?.filter(
          (value): value is PluginName => typeof value === 'string' && PLUGIN_NAMES.includes(value as PluginName),
        ),
      lib: root.at('lib').compose<WurkConfigOptions['lib']>((lib) => {
        return (
          lib.exists() && {
            entries: lib
              .at('entries')
              .as('array')
              ?.filter((value): value is string => typeof value === 'string'),
            format: lib.at('format').as((value): value is 'es' | 'cjs' => value === 'es' || value === 'cjs'),
            preserveModules: lib.at('preserveModules').as('boolean'),
          }
        );
      }),
    };
  }),
);
