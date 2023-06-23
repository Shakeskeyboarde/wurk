# Werk TSC Command

Build using the TypeScript compiler.

[![npm](https://img.shields.io/npm/v/@werk/command-tsc?label=NPM)](https://www.npmjs.com/package/@werk/command-tsc)
[![werk](https://img.shields.io/npm/v/@werk/cli?label=Werk&color=purple)](https://www.npmjs.com/package/@werk/cli)

## Install

```sh
npm i -D @werk/command-version
```

## Build

```sh
werk tsc
```

This will run the TypeScript compiler for all build configurations found in each workspace root. Build configurations can be `tsconfig.*build*.json` files, or partial configurations in the workspace [package.json](#package-config) file.

**Note:** A simple `package.json` file will also be written to each output directory, as long as it's not the workspace root. This package file contains only the [type](https://nodejs.org/api/packages.html#type) directive, set to the value which matches the TypeScript configuration (`module` or `commonjs`).

## Package Config

In addition to (or instead of) `tsconfig.*build*.json` files, you can also add partial TypeScript build configurations to the `package.json` file in each workspace.

```json
{
  "werk": {
    "tsc": {
      "config": [
        {
          "compilerOptions": {
            "target": "es2015",
            "module": "es2015",
            "moduleResolution": "node",
            "declaration": true,
            "outDir": "dist"
          }
        }
      ]
    }
  }
}
```

These configurations implicitly extend the `tsconfig.json` file in their individual workspace root, or at the workspaces root, unless they explicitly extend another configuration. The command will generate temporary `tsconfig.build-*.json` files for each configuration, and then delete them when the command is finished.
