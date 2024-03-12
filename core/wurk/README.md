# Wurk

Wurk is a lightweight, extensible build system for monorepos or single packages.

- Be declarative and leverage the power of community with custom commands.
- Orchestrate tasks across multiple interrelated workspaces.
- Stay flexible and transparent without adding complexity.

Read about the motivation for this project [here](./README-MOTIVATION.md).

## Prerequisites

- [Node.js®](https://nodejs.org/)
- [NPM](https://www.npmjs.com/), [PNPM](https://pnpm.io/), or [Yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/) (recommended)

## Getting Started

Install Wurk and any [Wurk commands](#commands) you want as dev dependencies of your root workspace.

```sh
npm install --save-dev wurk @wurk/command-run
```

Run a Wurk command. For example the [run](https://npmjs.com/package/@wurk/command-run) command (installed above) runs package.json scripts in each workspace where they exist.

```sh
npx wurk run build
```

(Optional) Install Wurk globally to avoid having to use `npx`. When `wurk` is executed, it delegates to the locally installed version, so `wurk run build` becomes equivalent to `npx wurk run build`.

```sh
npm install --global wurk
```

If you use a command that does not match an installed Wurk command package, then Wurk will run a matching root workspace.json script. This may be useful
because Wurk options (eg. selecting workspaces using the `-w` option) are inherited by spawned Wurk subprocesses, allowing package filtering to be
applied to package.json scripts that are composed of other Wurk CLI commands.

```sh
# Run the build script from the root workspace.json file.
wurk build
# Which is equivalent to the following npm command.
npm run build
```

(Optional) Delegate root workspace.json scripts to Wurk.

```json
{
  "scripts": {
    "build": "wurk run build",
    "lint": "wurk run eslint .",
    "test": "wurk build && wurk lint && wurk vitest",
    "create-release": "wurk version auto",
    "release": "wurk publish",
    "clean": "wurk clean"
  }
}
```

## Commands

The following "official" commands are available.

- [build](https://www.npmjs.com/package/@wurk/command-build): Run Rollup, Vite, TypeScript, and TypeDoc.
- [test](https://www.npmjs.com/package/@wurk/command-test): Run Depcheck, ESLint, and Vitest.
- [version](https://www.npmjs.com/package/@wurk/command-version): Set, increment, promote, and conventionally auto generate versions.
- [publish](https://www.npmjs.com/package/@wurk/command-publish): Publish or pack packages.
- [run](https://www.npmjs.com/package/@wurk/command-run): Run package scripts.
- [exec](https://www.npmjs.com/package/@wurk/command-exec): Run executables.
- [clean](https://www.npmjs.com/package/@wurk/command-clean): Remove Git ignored files, but leave dependencies and dotfiles alone.
- [list](https://www.npmjs.com/package/@wurk/command-list): List workspaces.

Run `npm install --save-dev @wurk/command-<name>` in your root workspace to install any of these commands.

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

- `--parallel`
  - Process all workspaces simultaneously without topological awaiting.
- `--stream`
  - Process workspaces concurrently with topological awaiting.
- `-c, --concurrency <count>`
  - Set the number workspaces to process simultaneously when streaming. The default is one greater than the number of CPU cores (cores + 1).
  - This option implies the `--stream` option.

> By default, workspaces are processed serially (one at a time). This is generally the slowest option, but also the safest.

### Logging Options

- `--loglevel <level>`
  - Set the log level (`silent`, `error`, `warn`, `info`, `notice`, `verbose`, or `silly`). The default is `info`.
  - Log level can also be set using the `WURK_LOG_LEVEL` environment variable. The command line option takes precedence over the environment variable.
- `--clear`
  - Clear the screen on startup. This does the same thing as the linux `clear` command, but is more CI friendly. It does not error if it is not available or `TERM` is not set, and it respects TTY availability.
