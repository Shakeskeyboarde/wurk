# Werk Run Command

Run package scripts.

[![npm](https://img.shields.io/npm/v/@werk/command-run?label=NPM)](https://www.npmjs.com/package/@werk/command-run)
[![werk](https://img.shields.io/npm/v/@werk/cli?label=Werk&color=purple)](https://www.npmjs.com/package/@werk/cli)

## Install

```sh
npm i -D @werk/command-run
```

## Run Script

```sh
# werk run <script> [args...]
werk run test --passWithNoTests
```

You can also run multiple scripts by passing a CSV of script names. Additional arguments will be passed to _ALL_ scripts. The scripts are run serially, in order, within each workspace. Multiple workspaces may still be processed in parallel.

```sh
werk run jest,vitest --passWithNoTests
```
