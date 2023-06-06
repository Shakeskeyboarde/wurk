# Werk

Modular and extensible monorepo command framework.

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Official Commands](#official-commands)
- [Custom Commands](#custom-commands)
- [Command Line Options](#command-line-options)

## Prerequisites

A monorepo using NPM (v8 or higher) workspaces is required. Werk would serve little or no purpose in a single package repository. There are no current plans to support other package managers. But, that decision may be revisited in the future if there is interest.

## Getting Started

Install Werk globally. It should also be locally installed in each workspaces repo, but we'll come back to that.

```sh
npm i -g @werk/cli
```

All commands are modular and must be installed separately. Commands can be installed either globally or locally in a workspaces root package. Installing them as local dev dependencies in projects is recommended.

```sh
npm i -D @werk/command-run
```

Now, the `run` command is available.

```sh
werk run test --pass-with-no-tests
werk run build
```

It's generally a good idea to also install Werk as a local dev dependency of your workspaces root package. The globally installed version will delegate to a locally installed version if it exists. This ensures all monorepo collaborators and CI runners will use a predictable version.

```sh
npm i -D @werk/cli
```

## Official Commands

Commands are modular and must be installed individually. The following "official" commands are provided to get you started.

- run: [@werk/command-run](https://www.npmjs.com/package/@werk/command-run)
- exec: [@werk/command-exec](https://www.npmjs.com/package/@werk/command-exec)
- version: [@werk/command-version](https://www.npmjs.com/package/@werk/command-version)
- publish: [@werk/command-publish](https://www.npmjs.com/package/@werk/command-publish)

## Custom Commands

[Custom commands](README_CUSTOM_COMMANDS.md) are supported and encouraged. Werk is designed first as a _framework_ for developing monorepo management tooling.

Just install a package named `werk-command-<name>`, and the `<name>` command will be available.

If you want to use a command package with a non-standard name, you can
map command names to packages names in your workspaces root `package.json` file.

```json
{
  "werk": {
    "commands": {
      "run": "some-package-name"
    }
  }
}
```

## Command Line Options

Werk provides workspace and task orchestration through a set of options which are global to all commands. These options are for selecting workspaces, workspace ordering, command parallelization, and output formatting.

- `-l, --log-level <level>`
  - Set the logging level. The default is the `LOG_LEVEL` environment variable, or "info".
- `-p, --parallel`
  - Process workspaces in parallel.
- `-c, --concurrency <count>`
  - Limit workspace processing concurrency (number or "auto"). If the count is "auto", the number of CPU cores + 1 will be used.
- `-w, --workspace <name>`
  - Include a workspace by name (repeatable).
- `-k, --keyword <value>`
  - Include workspaces with a matching keyword (repeatable).
- `--not-keyword <value>`
  - Exclude workspaces with a matching keyword (repeatable).
- `--no-private`
  - Exclude private workspaces.
- `--no-public`
  - Exclude public workspaces.
- `--no-order`
  - Do not order workspaces by interdependency. This should not be used for build-like or publish-like commands where interdependency matters. It may be useful for watch-like commands which need to run simultaneously in all (selected) workspaces.
- `--no-prefix`
  - Do add prefixes to command output.

These global options _MUST_ come before the command name, or they will be passed through to the command and not handled by Werk.

**Example:** Werk executes the `run build` command in _parallel_.

```sh
# werk [werk-options...] <command> [command-options...]
werk -p run build
```

**Example:** Werk executes the `run build -p` command _serially_.

```sh
werk run build -p
```

Commands may have their own options. Lookup the documentation for the command package and/or run `werk <command> --help` to see the command usage text.
