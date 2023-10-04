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

## Options

- `-w, --watch`: After building once, start continuously building workspaces. Generally, this means starting a development server or rebuilding when files are changed.
- `--vite`: Force Vite build mode.
- `--abort-on-failure`: Abort on the first build failure.

## Modes

A build mode will be selected automatically in the following order, based on the presence of tool configuration files.

- `script`: Run the workspace build script.
  - A `build` script (or `start` when the `--start` option is set) is present in the workspace `package.json` file.
- `vite`: Build using Vite.
  - The `--vite` flag is set, an `index.html` or `vite.config.*` is present in the package root, or `vite` is present the `package.json` file's `devDependencies`.
- `rollup`: Build using Rollup.
  - A `rollup.config.*` present in the package root.
- `tsc`: Build using the TypeScript compiler.
  - Typescript is a dev dependency of the root or current workspace.

### Mode: `script`

Runs the `build` script from the workspace `package.json` file. If the `--start` flag is set, then the `start` script will be run after building.

### Mode: `vite`

Uses the `vite.config.*` file in the workspace root if it exists.

The `--vite` option can be used to force this mode, because it should actually work for almost any project. However, the other modes exist because there are some edge cases that Vite doesn't handle currently (like decorators).

If no configuration exists, a default configuration will be used. Under the default configuration, library mode is enabled if the `package.json` file contains `bin`, `main`, or `exports` entry points. CommonJS and/or ESModule output is determined automatically.

When library mode is enabled, bundling is disabled (ie. "preserve modules"), _unless_ a library entrypoint is named `bundle.*`. Disabling bundling means that one output file per-input file is generated, which is useful for tree-shaking.

The following plugins are used in the default configuration, _if they are dev dependencies of the workspace._

- `@vitejs/plugin-react`
  - Version: ^4.0.4
- `vite-plugin-bin`
  - Version: ^1.0.1
- `vite-plugin-checker`
  - Version: >=0.6.2 <1
- `vite-plugin-dts`
  - Version: ^3.5.3
- `vite-plugin-refresh`
  - Version: ^1.0.3
- `vite-plugin-svgr`
  - Version: ^4.0.0
- `vite-plugin-rewrite-all`
  - Version: ^1.0.1

#### Plugin: Checker

The checker plugin will enable Typescript and ESLint checking based on the workspace configuration.

Typescript checking is enabled if Typescript is dev dependency of the root (or current) workspace, and there is Typescript configuration in the
current workspace.

ESlint checking is enabled if ESLint is a dev dependency of the root (or current) workspace, and the current workspace `package.json` has an `eslint` script. _ESLint checking as part of the build process is not recommended, because it should probably be considered testing._

### Mode: `rollup`

Uses the `rollup.config.*` file in the workspace.

### Mode: `tsc`

Builds once for every `tsconfig.*build*.json` file found in the workspace. If no matching build configuration files are present, then temporary configurations will be generated.

This mode is the default even though it doesn't support bundling and is not particularly fast, because it is considered the "reference" option, and will handle all Typescript features.

Generated configurations write output to the `lib` directory. CommonJS and/or ESModule output is determined automatically.

Generated configurations will extends a `tsconfig.json` file in the workspace or the workspaces root.

**Note:** A simple `package.json` file will also be written to each output directory, as long as it's not the workspace root. This package file contains only the [type](https://nodejs.org/api/packages.html#type) directive, set to the value which matches the TypeScript configuration (`module` or `commonjs`).

## Recommendations

Build dependencies should be included in the `devDependencies` of each workspace, _even in a mono-repo._ Build dependency version mismatches in different workspaces usually won't cause problems, so this allows per-workspace build tool migration. It also makes it clear what tools are being used in the build. Typescript is the only exception to this rule, as it is used by the IDE as well as the build.
