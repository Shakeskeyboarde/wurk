# Wurk Build Command

Build workspaces using auto-detected tools.

- [Vite](https://npmjs.com/package/vite): `vite.config*.*`
- [Rollup](https://npmjs.com/package/rollup): `rollup.config*.*`
- [TypeScript](https://npmjs.com/package/typescript): `[src/]tsconfig*.json` (where noEmit != true)
- [TypeDoc](https://npmjs.com/package/typedoc): `typedoc*.(js|json)`

## Getting Started

Install the command in your root workspace.

```sh
npm install --save-dev @wurk/command-build
```

Run the command.

```sh
wurk build
```

Each build tool is run once per matching configuration file. So, if there are two `tsconfig*.json` files in a workspace, the `tsc` command will be run twice in that workspace.

## Start (Watch)

Using the `start` command alias or the `--start` option will build all workspaces once, and then continue in "watch" mode (Rollup, TypeScript, TypeDoc) and/or start development servers (Vite).

```sh
wurk start
wurk build --start
```

## Options

- `--start` (or command alias `start`)
  - Start development servers and/or watch for changes and rebuild.
- `--no-clean`
  - Do not clean workspace directories before building.
- `--no-include-dependencies`
  - Do not include dependency workspaces when building or starting.

## Package Scripts

The `wurk:build` and `wurk:start` package scripts are special. If _either_ script is present, it disables automatic tool detection and running, for both building and starting. These scripts serve as an escape hatch for workspaces where auto detection won't work.

File: `package.json`

```json
{
  "scripts": {
    "wurk:build": "...",
    "wurk:start": "..."
  }
}
```
