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

## Watch

After building once, start continuously building workspaces. Generally, this means starting a development server or rebuilding when files are changed.

```sh
werk build --watch
```

## Modes

A build mode will be selected automatically based on the presence of tool configuration files.

- `tsc`: Build using the TypeScript compiler.
  - `tsconfig.*build*.json` present in the package root, _or DEFAULT if conditions for other build modes are not met._
- `vite`: Build using Vite.
  - `index.html` or `vite.config.*` is present in the package root, or if `vite` is present the `package.json` file's `devDependencies`.
- `rollup`: Build using Rollup.
  - `rollup.config.*` present in the package root.
- `script`: Run the workspace build script.
  - `build` script (or `start` when the `--start` option is set) is present in the workspace `package.json` file.

### Mode: `script`

Runs the `build` script from the workspace `package.json` file. If the `--start` flag is set, then the `start` script will be run after building.

### Mode: `tsc`

Builds once for every `tsconfig.*build*.json` file found in the workspace. If no matching build configuration is present (when used as the default build mode), then temporary configurations will be generated.

Generated configurations write output to the `lib` directory. CommonJS and/or ESModule output is determined automatically.

Generated configurations will extends a `tsconfig.json` file in the workspace or the workspaces root.

**Note:** A simple `package.json` file will also be written to each output directory, as long as it's not the workspace root. This package file contains only the [type](https://nodejs.org/api/packages.html#type) directive, set to the value which matches the TypeScript configuration (`module` or `commonjs`).

### Mode: `vite`

Uses the `vite.config.*` file in the workspace root if it exists.

If no configuration exists, a default configuration will be used. Under the default configuration, library mode is enabled if the `package.json` file contains `bin`, `main`, or `exports` entry points. CommonJS and/or ESModule output is determined automatically.

When library mode is enabled, bundling is disabled (ie. "preserve modules"), _unless_ a library entrypoint is named `bundle.*`. Disabling bundling means that one output file per-input file is generated, which is useful for tree-shaking.

The following plugins are used in the default configuration, _if they are dev dependencies of the workspace._

- `@vitejs/plugin-react`
- `vite-plugin-dts`
- `vite-plugin-refresh`
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

Uses the `rollup.config.*` file in the workspace.
