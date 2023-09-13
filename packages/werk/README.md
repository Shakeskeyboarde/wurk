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
  - [Filtering Options](#filtering-options)
  - [Parallelization Options](#parallelization-options)
  - [Logging Options](#logging-options)
  - [Git Options](#git-options)
  - [Pre-Configured Commands](#pre-configured-commands)

## Features

Werk is a framework for creating build and build-related commands as [command plugins](#custom-commands). Command implementors benefit from a well defined lifecycle, contextual information, and utilities. Command users can expect a baseline level of consistency and quality.

- Workspaces
  - Information
  - Parallelization
  - Filtering
- Helpers
  - Add command line options
  - Log with levels and formatting
  - Spawn processes
  - Start threads
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

- [list](https://www.npmjs.com/package/@werk/command-list): List workspaces as JSON with filtering applied.
- [run](https://www.npmjs.com/package/@werk/command-run): Run package scripts.
- [exec](https://www.npmjs.com/package/@werk/command-exec): Run executables.
- [build](https://www.npmjs.com/package/@werk/command-build): Build using auto-detected tools.
- [vitest](https://www.npmjs.com/package/@werk/command-vitest): Run Vitest using its built-in workspaces support.
- [version](https://www.npmjs.com/package/@werk/command-version): Update versions.
- [publish](https://www.npmjs.com/package/@werk/command-publish): Publish packages.

Run `npm i -D @werk/command-<name>` in your workspaces root to install these commands.

### Custom Commands

[Learn how to create your own custom command plugins!](https://github.com/Shakeskeyboarde/werk/blob/main/packages/werk/README_CUSTOM_COMMANDS.md)

When you run `werk <command>`, the package for the command is loaded dynamically. The corresponding command package must already be installed.

If you want to use a command package with a non-standard name, you can
map the command name to an arbitrary package name in your workspaces root `package.json` file. This will completely override the normal package resolution strategy for the command.

```json
{
  "werk": {
    "commandPackages": {
      "run": "some-package-name"
    }
  }
}
```

For personal or enterprise scoped commands, you can set a list of package prefixes that Werk will try when auto-detecting command packages. Prefixes are _prepended_ to the default list: `[...prefixes, "@werk/command-", "werk-command-"]`.

```json
{
  "werk": {
    "commandPackagePrefixes": ["@myscope/werk-command-"]
  }
}
```

## Command Line Options

Werk has global options for selecting workspaces, parallelization, and output. These global options _MUST_ come before the command name, or they will be passed through to the command and not handled by Werk.

```sh
werk [werk-options...] <command> [command-options...]
```

### Filtering Options

Options which reduce the number of workspaces that are processed.

- `-w, --workspace <name>`
  - Include a workspace by name (repeatable).
- `-k, --keyword <value>`
  - Include workspaces with a matching keyword (repeatable).
- `--include-workspace-root`
  - Include the root work workspace.
- `--not-workspace <name>`
  - Exclude a workspace by name (repeatable).
- `--not-keyword <value>`
  - Exclude workspaces with a matching keyword (repeatable).
- `--not-private`
  - Exclude private workspaces.
- `--not-public`
  - Exclude public workspaces.
- `--not-published`
  - Exclude published workspaces.
- `--not-unpublished`
  - Exclude published workspaces.
- `--not-modified`
  - Exclude modified workspaces.
- `--not-unmodified`
  - Exclude unmodified workspaces.
- `--no-dependencies`
  - Do not include dependencies when selecting workspaces.

By default, all workspaces are included. If the `--workspace` or `--keyword` options are used, then only workspaces matching any of the given workspace names or keywords will included.

From the included workspaces, any matching a `--not-*` options will be excluded. You an consider "not" to be synonym for "exclude".

And finally, unless the `--no-dependencies` option is used, any dependencies of included workspaces will be also be included, even if they were removed by a `--not-*` option.

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

### Pre-Configured Commands

You can configure Werk to automatically inject command-line arguments. This configuration must be in the workspaces root `package.json` file.

```json
{
  "werk": {
    "globalArgs": ["--no-dependencies"],
    "publish": {
      "globalArgs": ["--loglevel=warn"],
      "args": ["--remove-package-fields=devDependencies"]
    }
  }
}
```

Given the above configuration, if the `werk publish` command is run, it will be as if the following command is run.

```sh
werk --no-dependencies --loglevel=warn publish --remove-package-fields=devDependencies
```
