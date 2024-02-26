# Wurk

Wurk is declarative build and project tooling for monorepos or single packages, designed to make project setup and onboarding easier, without sacrificing flexibility.

[![npm](https://img.shields.io/npm/v/wurk?label=NPM)](https://www.npmjs.com/package/wurk)

## Prerequisites

- [Node.js®](https://nodejs.org/) is required.
- [NPM](https://www.npmjs.com/) is required.
- [Git](https://git-scm.com/) is optional, but strongly recommended.
- [TypeScript](https://www.typescriptlang.org/) is optional, but strongly recommended.

## Getting Started

Install Wurk and any [commands](#commands) you want as a dev dependencies of your project root.

```sh
npm install --save-dev wurk @wurk/command-build
```

Run a Wurk command.

```sh
npx wurk build
```

(Optional) Install Wurk globally to avoid having to use `npx`. When `wurk` is executed, it delegates to the locally installed version, so `wurk` becomes equivalent to `npx wurk`.

```sh
npm install --global wurk
```

## Commands

The following "official" commands are available.

- [build](https://www.npmjs.com/package/@wurk/command-build): Run Rollup, Vite, TypeScript, and TypeDoc.
- [test](https://www.npmjs.com/package/@wurk/command-test): Run ESLint and Vitest.
- [version](https://www.npmjs.com/package/@wurk/command-version): Set, bump, promote, and semantically auto generate versions.
- [publish](https://www.npmjs.com/package/@wurk/command-publish): Publish or pack packages.
- [run](https://www.npmjs.com/package/@wurk/command-run): Run package scripts.
- [exec](https://www.npmjs.com/package/@wurk/command-exec): Run executables.
- [clean](https://www.npmjs.com/package/@wurk/command-clean): Remove Git ignored files, but leave dependencies and dotfiles alone.
- [list](https://www.npmjs.com/package/@wurk/command-list): List workspaces.

Run `npm install --save-dev @wurk/command-<name>` in your project root to install any of these commands.

See the [API docs](./docs/api/README.md) for information on creating your own custom commands.

## Options

Wurk has global options for selection, parallelization, logging, etc.

These options are "global" because they are defined by Wurk itself. Commands can also define their own options. In general, global options should precede the command name, and command options should follow the command name. Most commands will allow Wurk to handle global options that follow the command name, but this is not guaranteed.

```sh
wurk [global-options] <command> [command-options]
```

### Selection Options

Options which reduce the number of workspaces that are processed.

- `-w, --workspace <query>`
  - Select workspaces by name, privacy, keyword, or directory.
  - Use `private:true` or `private:false` to select private or public workspaces.
  - Use `keyword:<pattern>` to select workspaces by keyword (glob supported).
  - Use `dir:<pattern>` to select workspaces by directory (glob supported).
  - Use `name:<pattern>` or just `<pattern>` to select workspaces by name (glob supported).
  - Prefix any query with `not:` to exclude instead of include.
  - Use a leading ellipsis to (eg. `...<query>`) to also match dependencies.
  - Use a trailing ellipsis to (eg. `<query>...`) to also match dependents.
- `--include-root-workspace`
  - Include the root workspace in the selection. _This is strongly discouraged due to the potential for unexpected behaviors like accidental recursion!_

### Parallelization Options

- `-p, --parallel`
  - Process workspaces in parallel.
  - This option implies the `--concurrency=auto` option.
- `-c, --concurrency <count>`
  - Set the number workspaces to process in parallel. The count can be a number, "auto", or "all". The default is is "auto", which is equivalent to one greater than the number of CPU cores (cores + 1).
  - This option implies the `--parallel` option.

> By default, workspaces are processed serially. This is generally the slowest option, but also the safest.

### Logging Options

- `-l, --loglevel <level>`
  - Set the log level (`silent`, `error`, `warn`, `info`, `notice`, `verbose`, or `silly`). The default is `info`.
  - Log level can also be set using the `WURK_LOG_LEVEL` environment variable. The command line option takes precedence over the environment variable.
- `--clear`
  - Clear the screen on startup. This does the same thing as the linux `clear` command, but is more CI friendly. It does not error if it is not available or `TERM` is not set, and it respects TTY availability.

### Git Options

- `--git-from-revision <rev>`
  - Use a specific Git revision when detecting modifications. If not specified, it will be detected from the NPM registry metadata based on each workspace's current version.
