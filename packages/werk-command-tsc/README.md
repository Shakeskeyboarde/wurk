# Werk TSC Command

Build using the TypeScript compiler.

## Install

```sh
npm i -D @werk/command-version
```

## Build

```sh
werk tsc
```

This will run the TypeScript compiler for all build configurations found in each workspace root. Build configurations can be `tsconfig.*build*.json` files, or partial configurations in the workspace [package.json](#package-config) file.

## Package Config

In addition to (or instead of) `tsconfig.*build*.json` files, you can also add partial TypeScript build configurations to the `package.json` file in each workspace.

```json
{
  "werk": {
    "tsc": [
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
```

These configurations implicitly extend the `tsconfig.json` file in the workspace root, unless they explicitly extend another configuration. The command will generate temporary `tsconfig.build-*.json` files for each configuration, and then delete them when the command is finished.
