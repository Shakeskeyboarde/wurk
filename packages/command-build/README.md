# Werk Build Command

Build with near-zero-configuration using common tools and opinionated configurations.

[![npm](https://img.shields.io/npm/v/@werk/command-build?label=NPM)](https://www.npmjs.com/package/@werk/command-build)
[![werk](https://img.shields.io/npm/v/@werk/cli?label=Werk&color=purple)](https://www.npmjs.com/package/@werk/cli)

## Install

```sh
npm i -D @werk/command-exec
```

## Build

```sh
werk build
```

## Start

After building once, start continuously building workspaces. Generally, this means starting a development server or rebuilding when files are changed.

```sh
werk build --start
```

Why is `--start` an option to the build command? Because generally you want to build everything once, before starting the continuous build, so that projects with interdependency do not initially fail to build due to missing dependencies.

## Modes

A build mode will be selected automatically based on the presence of tool configuration files.

- `script`: Run the workspace build script.
  - `build` script (or `start` when the `--start` option is set) is present in the workspace `package.json` file.
- `tsc`: Build using the TypeScript compiler.
  - `tsconfig.*build*.json` present in the package root, or **DEFAULT** if conditions for other build modes are not met.
- `vite`: Build using Vite.
  - `index.html` or `vite.config.*` is present in the package root.
- `rollup`: Build using Rollup.
  - `rollup.config.*` present in the package root.

### Mode: `script`

Runs the `build` script from the workspace `package.json` file. If the `--start` flag is set, then the `start` script will be run after building.

### Mode: `tsc`

Builds once for every `tsconfig.*build*.json` file found in the workspace. If no matching build configuration is present (when used as the default build mode), then temporary configurations will be generated.

Generated configurations write output to the `lib` directory. If the workspace package has a `main` entry, the output will be CommonJS. If the workspace has an `exports` entry, the output will be ESM. If both are present, then both types of output will be generated, ESM to the `lib/esm` directory, and CommonJS to the `lib/cjs` directory.

Generated configurations will extends a `tsconfig.json` file in the workspace or the workspaces root. The following options are overridden by generated configurations.

- compilerOptions
  - moduleDetection: `auto`
  - moduleResolution: `NodeNext`
  - module: `ES2022` or `CommonJS`
  - outDir: `lib`, `lib/esm`, or `lib/cjs`
  - rootDir: `src`
  - noEmit: `false`
  - emitDeclarationOnly: `false`
  - declaration: `true`
  - sourceMap: `true`
- include: `["src"]`
- exclude: `["**/*.test.*", "**/*.spec.*", "**/*.stories.*]`

**Note:** A simple `package.json` file will also be written to each output directory, as long as it's not the workspace root. This package file contains only the [type](https://nodejs.org/api/packages.html#type) directive, set to the value which matches the TypeScript configuration (`module` or `commonjs`).

### Mode: `vite`

Uses the `vite.config.js` or `vite.config.ts` file in the workspace root if it exists. If no configuration exists, a default configuration will be used.

The default configuration will output to the `dist` directory, unless `package.json` contains a `main` entry, in which case library mode will be used to build ESM (`lib/esm`) and CommonJS (`lib/cjs`) module output.

In library mode, all non-dev dependencies will be externalized.

The following plugins are used in the default configuration, _if they are installed._

- `@vitejs/plugin-react`
- `vite-plugin-dts` (library mode only)
- `vite-plugin-refresh` (non-library mode only)
- `vite-plugin-svgr`

#### SVGR

The default configuration for `vite-plugin-svgr` provides the SVG react component as the default export (not a named export). The following type declaration is required for TypeScript to allow SVG imports.

```ts
declare module '*.svg' {
  import { type ComponentType, type SVGProps } from 'react';
  const ReactComponent: ComponentType<SVGProps<SVGElement>>;
  export default ReactComponent;
}
```

With the above declaration, SVGs can be imported and used as follows. All SVG element props are supported.

```ts
import MySvg from './my-svg.svg';

const MyComponent = (): JSX.Element => {
  return <MySvg />
};
```

### Mode: `rollup`

Uses the `rollup.config.js` or `rollup.config.mjs` file in the workspace.
