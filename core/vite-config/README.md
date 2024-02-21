# Wurk Vite Config Factory

Generate an opinionated Vite config from a small declarative set of options.

## Usage

Create a `vite.config.ts` file in your workspace root. Call the `defineWurkConfig` function, passing in options as required.

```ts
import { defineWurkConfig } from '@wurk/vite-config';

export default defineWurkConfig({
  // All configuration values are optional.
  outDir: 'dist',
  emptyOutDir: true,
  lib: {
    entries: ['src/index.ts'],
    format: 'es',
    preserveModules: true,
  },
  disablePlugins: [
    // Can be any of the optional plugin names listed in this README.
    //
    // Note: Instead of disabling the plugin here, you can also just
    //       remove it from the workspace dev dependencies.
  ],
});
```

## Optional Plugins

The following plugins are used _only if they are dev dependencies of the current workspace._

- `@vitejs/plugin-react`
- `vite-plugin-bin`
- `vite-plugin-checker`
- `vite-plugin-dts`
- `vite-plugin-refresh`
- `vite-plugin-svgr`
- `vite-plugin-zip-pack`

### Plugin: Checker

The checker plugin will enable Typescript checking based on the workspace configuration.

Typescript checking is enabled if Typescript is dev dependency, and a Typescript configuration (`tsconfig.json`) is present.

ESlint checking is enabled if ESLint is a dev dependency, and the workspace `package.json` file has an `eslint` script. _ESLint checking as part of the build process is not recommended, because it should be considered testing._

### Plugin: Zip Pack

The zip pack plugin will generate a zip file from the output directory.
