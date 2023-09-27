# Werk

Open-minded build tooling, with opinionated plugins.

[![npm](https://img.shields.io/npm/v/@werk/cli?label=NPM)](https://www.npmjs.com/package/@werk/cli)

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Command Plugins](#command-plugins)
  - [Official Commands](#official-commands)
  - [Custom Commands](#custom-commands)
- [Command Line Options](#command-line-options)
  - [Selection Options](#selection-options)
  - [Parallelization Options](#parallelization-options)
  - [Logging Options](#logging-options)
  - [Git Options](#git-options)

## Features

Werk is a framework for creating build and build-related commands as [command plugins](#custom-commands). Command implementors benefit from a well defined lifecycle, contextual information, and utilities. Command users can expect a baseline level of consistency and quality.

- Workspaces
  - Information
  - Parallelization
  - Selection
- Helpers
  - Add command line options
  - Log with levels and formatting
  - Spawn processes
  - Manipulate `package.json` files
  - Look up registry metadata (NPM)
  - Detect changes (Git)

## Prerequisites

Werk supports projects based on NPM (version 8+). There are no current plans to support other package managers.

Git is used if available, but is not required. If Git is not available, Werk will not be able to detect changes.

## Getting Started

Install Werk globally so you can use the `werk` command anywhere and without `npx`. Don't worry, the global install will delegate to the locally installed version of Werk in your projects.

```sh
npm i -g @werk/cli
```

All [commands](#official-commands) are modular and must be installed separately. Install them locally (not globally) in the root package of your repository.

```sh
npm i -D @werk/command-list
```

**Note:** Because Werk command packages should depend on the `@werk/cli` package, you have effectively pinned your project to a specific version of Werk (it's a feature)!

Now, the `list` command is available.

```sh
werk list
```

## Command Plugins

All commands are modular and must be installed individually. By itself, Werk can only print its own help text.

### Official Commands

The following "official" commands are provided to get you started.

- [list](https://www.npmjs.com/package/@werk/command-list): List workspaces.
- [run](https://www.npmjs.com/package/@werk/command-run): Run package scripts.
- [exec](https://www.npmjs.com/package/@werk/command-exec): Run executables.
- [build](https://www.npmjs.com/package/@werk/command-build): Build using auto-detected tools.
- [vitest](https://www.npmjs.com/package/@werk/command-vitest): Run Vitest using its built-in workspaces support.
- [version](https://www.npmjs.com/package/@werk/command-version): Update versions.
- [publish](https://www.npmjs.com/package/@werk/command-publish): Publish packages.

Run `npm i -D @werk/command-<name>` in your workspaces root to install these commands.

### Custom Commands

[Learn how to create your own custom command plugins!](https://github.com/Shakeskeyboarde/werk/blob/main/packages/cli/README_CUSTOM_COMMANDS.md)

Werk scans the `package.json` file in your repo root for command plugin package dependencies. By default, any packages that start with `*/werk-command-`, `werk-command-` or `@werk/command-` will be loaded as command plugins.

You can also force command names to resolve to specific packages by mapping the command name to an arbitrary package name in your `package.json` file.

```json
{
  "werk": {
    "commands": {
      "run": "arbitrary-package-name"
    }
  }
}
```

## Command Line Options

Werk has global options for selecting workspaces, parallelization, and output. These global options _MUST_ come before the command name, or they will be passed through to the command and not handled by Werk.

```sh
werk [werk-options...] <command> [command-options...]
```

### Selection Options

Options which reduce the number of workspaces that are processed.

- `-w, --workspace <patterns>`
  - Select workspaces by name (glob, csv, repeatable).
- `--no-dependencies`
  - Do not automatically include dependencies of selected workspaces.
- `--include-root-workspace`
  - Include the root workspace in the selection. _This is strongly discouraged due to the potential for unexpected behavior!_

**Note:** It is entirely up to each command to honor the "selected" workspaces. They are strongly encouraged to do so, but may choose not to if it doesn't make sense to the command.

### Parallelization Options

- `-p, --parallel`
  - Process workspaces in parallel.
- `-c, --concurrency <count>`
  - Set the number workspaces to process in parallel (number or "all"). If not set, the number of CPU cores + 1 will be used.
- `--no-wait`
  - Do not wait for workspace dependencies to finish processing before processing dependents.

By default, workspaces are processed serially. This is generally the slowest option, but also the safest.

### Logging Options

- `-l, --loglevel <level>`
  - Set the log level (`silent`, `error`, `warn`, `info`, `notice`, `verbose`, or `silly`). The default is `info`.
- `--no-prefix`
  - Do not add prefixes to command output.

The log level can also be set using the `WERK_LOG_LEVEL` environment variable. The command line option takes precedence over the environment variable.

### Git Options

- `--git-head <sha>`
  - Provide a default Git "HEAD" commit in non-Git environments. This has no effect if Git is available.
- `--git-from-revision <rev>`
  - Use a specific Git revision when detecting modifications. If not specified, it will be detected from the registry metadata of the current version.
