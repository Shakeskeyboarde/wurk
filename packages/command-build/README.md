# Werk Build Command

Build with near-zero-configuration using common tools and opinionated configurations.

[![npm](https://img.shields.io/npm/v/@werk/command-build?label=NPM)](https://www.npmjs.com/package/@werk/command-build)
[![werk](https://img.shields.io/npm/v/@werk/cli?label=Werk&color=purple)](https://www.npmjs.com/package/@werk/cli)

## Install

```sh
npm i -D @werk/command-build
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
- `rollup`: Build using Rollup.
  - A `rollup.config.*` present in the package root.
- `vite`: Build using Vite.
  - The `--vite` option is set.
  - An `index.html` or `vite.config.*` is present in the package root.
  - All of the following are true:
    - An `exports`, `module`, `main`, `bin`, or `types` entry is present in the `package.json` file.
    - Vite is a dev dependency of the current workspace
- `tsc`: Build using the TypeScript compiler.
  - All of the following are true:
    - An `exports`, `module`, `main`, `bin`, or `types` entry is present in the `package.json` file.
    - Typescript is a dev dependency of the root or current workspace.

### Mode: `script`

Runs the `build` script from the workspace `package.json` file. If the `--start` flag is set, then the `start` script will be run after building.

### Mode: `rollup`

Uses the `rollup.config.*` file in the workspace.

### Mode: `vite`

Uses the `vite.config.*` file in the workspace root if it exists.

The `--vite` option can be used to force this mode, because it should actually work for almost any project. However, the other modes exist because there are some edge cases that Vite doesn't handle currently (like decorators).

If no configuration exists, a default configuration will be used. Under the default configuration, library mode is enabled if the `package.json` file contains `bin`, `main`, or `exports` entry points. CommonJS and/or ESModule output is determined automatically.

When library mode is enabled, bundling is disabled (ie. "preserve modules"), _unless_ any package entry (`exports`, `module`, `main`, `bin`, or `types`) is named `bundle.*`. Disabling bundling means that one output file per-input file is generated, which is useful for tree-shaking.

#### Automatic Plugin Support

See the [@werk/vite-config](https://github.com/Shakeskeyboarde/werk/blob/main/packages/vite-config/README.md#optional-plugins) package for more information about what Vite plugins are used automatically.

### Mode: `tsc`

Builds once for every `tsconfig.*build*.json` file found in the workspace. If no matching build configuration files are present, then temporary configurations will be generated.

This mode is the default even though it doesn't support bundling and is not particularly fast, because it is considered the "reference" option, and will handle all Typescript features.

Generated configurations write output to the `lib` directory. CommonJS and/or ESModule output is determined automatically.

Generated configurations will extend a `tsconfig.json` file in the workspace or the workspaces root.

**Note:** A simple `package.json` file will also be written to each output directory, as long as it's not the workspace root. This package file contains only the [type](https://nodejs.org/api/packages.html#type) directive, set to the value which matches the TypeScript configuration (`module` or `commonjs`).

## Recommendations

Build dependencies should be included in the `devDependencies` of each workspace, _even in a mono-repo._ Build dependency version mismatches in different workspaces usually won't cause problems, so this allows per-workspace build tool migration. It also makes it clear what tools are being used in the build. Typescript is the only exception to this rule, as it is used by the IDE as well as the build.
