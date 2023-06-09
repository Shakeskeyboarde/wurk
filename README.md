# Werk

An open-minded monorepo tool, with opinionated plugins.

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Command Plugins](#command-plugins)
  - [Official Commands](#official-commands)
  - [Custom Commands](#custom-commands)
- [Command Line Options](#command-line-options)
  - [Filtering Options](#filtering-options)
  - [Parallelization Options](#parallelization-options)
  - [Logging Options](#logging-options)

## Prerequisites

A monorepo using NPM (v8 or higher) workspaces is required. Werk would serve little or no purpose in a single package repository. There are no current plans to support other package managers. But, that decision may be revisited in the future if there is interest.

## Getting Started

Install Werk globally. It should also be locally installed in each workspaces repo, but we'll come back to that.

```sh
npm i -g @werk/cli
```

All [commands](#official-commands) are modular and must be installed separately. Commands can be installed either globally or locally in a workspaces root package. Installing them as local dev dependencies in projects is recommended.

```sh
npm i -D @werk/command-list
```

Now, the `list` command is available.

```sh
werk list
```

It's generally a good idea to also install Werk as a local dev dependency of your workspaces root package. The globally installed version will delegate to a locally installed version if it exists. This ensures all monorepo collaborators and CI runners will use a predictable version.

```sh
npm i -D @werk/cli
```

## Command Plugins

All commands are modular and must be installed individually. By itself, Werk can only print its own help and usage text.

### Official Commands

The following "official" commands are provided to get you started.

- list: [@werk/command-list](https://www.npmjs.com/package/@werk/command-publish)
  - List workspaces.
- run: [@werk/command-run](https://www.npmjs.com/package/@werk/command-run)
  - Run package scripts.
- exec: [@werk/command-exec](https://www.npmjs.com/package/@werk/command-exec)
  - Run arbitrary executables.
- version: [@werk/command-version](https://www.npmjs.com/package/@werk/command-version)
  - Bump and set versions.
- publish: [@werk/command-publish](https://www.npmjs.com/package/@werk/command-publish)
  - Publish package to registries.

### Custom Commands

[Custom commands](README_CUSTOM_COMMANDS.md) are supported and encouraged. In fact, Werk is first a framework for developing monorepo tools.

When you run `werk <command>`, the package for the command will be looked up and loaded dynamically. The package must be installed, either globally or locally to a workspaces root.

Packages will be resolved as follows.

- Local: `@werk/command-<command>`
- Local: `werk-command-<command>`
- Global: `@werk/command-<command>`
- Global: `werk-command-<command>`

If you want to use a command package with a non-standard name, you can
map command names to packages names in your workspaces root `package.json` file. This will completely override the normal package resultion strategy.

```json
{
  "werk": {
    "commands": {
      "run": "some-package-name"
    }
  }
}
```

For personal or enterprise scoped commands, you can also set a list of package prefixes that Werk will try when auto-detecting command packages. Prefixes are _prepended_ to the default list: `[...prefixes, "@werk/command-", "werk-command-"]`.

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

- `-d, --with-dependencies`
  - Always include dependencies when selecting workspaces.
- `-w, --workspace <name>`
  - Include a workspace by name (repeatable).
- `-k, --keyword <value>`
  - Include workspaces with a matching keyword (repeatable).
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

By default, all workspaces are included.

If the `--workspace` or `--keyword` options are used, then only workspaces matching any of the given workspace names or keywords will included.

From the remaining workspaces, any matching a `--not` option will be removed. You an consider "not" to be synonymous with "exclude".

And finally, if the `--with-dependencies` option is used, any dependencies of the remaining workspaces will be included, even if they were removed by a `--not` option.

**Note:** It is entirely up to each command to honor the "selected" workspaces. Commands receive all workspaces, with a tag indicating whether they were selected or not. They are strongly encouraged to use that information, but may not if it doesn't make sense to the command.

### Parallelization Options

- `-p, --parallel`
  - Process workspaces in parallel.
- `-c, --concurrency <count>`
  - Limit workspace processing concurrency (number or "auto"). If the count is "auto", the number of CPU cores + 1 will be used.
- `--no-wait`
  - Do not wait for workspace dependencies to finish processing before processing dependents.

By default, workspaces are processed in series. This is generally the slowest option, but also the safest.

### Logging Options

- `-l, --log-level <level>`
  - Set the logging level. The default is the `LOG_LEVEL` environment variable, or "info".
  - Levels: `silent`, `error`, `warn`, `info`, `notice`, `verbose`, and `silly`
- `--no-prefix`
  - Do not add prefixes to command output.

By default, the log level is "info", and messages which are specific to a workspace will be prefixed with the workspace name.
