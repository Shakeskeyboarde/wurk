# Werk Vitest Command

Run Vitest using its built-in [workspaces support](https://vitest.dev/guide/workspace.html).

[![npm](https://img.shields.io/npm/v/@werk/command-vitest?label=NPM)](https://www.npmjs.com/package/@werk/command-vitest)
[![werk](https://img.shields.io/npm/v/@werk/cli?label=Werk&color=purple)](https://www.npmjs.com/package/@werk/cli)

If there is no `vitest.workspace` or `vitest.projects` file (with `.js`, `.ts`, or `.json` extension) at the workspaces root, a temporary one will be created by compiling all workspaces with a `vite.config` or `vitest.config` file.

If Vitest workspaces are configured, then this command acts as a simple passthrough for `vitest`.

## Install

```sh
npm i -D @werk/command-vitest
```

## Run Tests

```sh
# werk vitest [args...]
werk vitest run
```
