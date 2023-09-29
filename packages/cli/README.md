# Werk

Werk is "low-configuration" build and project tooling. It's not zero configuration, because that implies more assumptions than can reasonably be made about any project. But, simply choosing the correct Werk command should be all the configuration you need in most cases.

Let's get to werk!

[![npm](https://img.shields.io/npm/v/@werk/cli?label=NPM)](https://www.npmjs.com/package/@werk/cli)

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Step 1: Create the monorepo root.](#step-1-create-the-monorepo-root)
  - [Step 2: Change to the monorepo root directory.](#step-2-change-to-the-monorepo-root-directory)
  - [Step 3: Add the first monorepo workspace.](#step-3-add-the-first-monorepo-workspace)
  - [Step 4: Install the Werk `build` command.](#step-4-install-the-werk-build-command)
  - [Step 5: Run the Werk `build` command.](#step-5-run-the-werk-build-command)
- [Commands](#commands)
  - [Official Commands](#official-commands)
  - [Command Discovery](#command-discovery)
- [Options](#options)
  - [Global Selection Options](#global-selection-options)
  - [Global Parallelization Options](#global-parallelization-options)
  - [Global Logging Options](#global-logging-options)
  - [Global Git Options](#global-git-options)

## Prerequisites

- [Node.js](https://nodejs.org/) (version 18+) is required.
- [NPM](https://www.npmjs.com/) (version 8+) is required.
- [Git](https://git-scm.com/) is optional, but strongly recommended.
- [Typescript](https://www.typescriptlang.org/) is optional, but strongly recommended.

## Getting Started

Install the Werk CLI globally. Global installs might be scary, but don't worry, Werk always delegates to the locally installed version of itself in your projects. The global install is just an easy way of making the `werk` command accessible anywhere without using `npx`.

```sh
npm install --global @werk/cli
```

(Optional) Test it out by calling the `werk` command with no arguments. You should see a message about using the "globally installed" version of Werk, and then usage (help) text.

### Step 1: Create the monorepo root.

For simplicity, let's start a new monorepo project using [create-minimal-monorepo](https://www.npmjs.com/package/create-minimal-monorepo). Monorepos can even be useful with small projects that have only a single workspace. It's not any more complex than a single package, and it will be easier to add more packages later if necessary.

```sh
npm init minimal-monorepo -- my-project
```

### Step 2: Change to the monorepo root directory.

This is simple, but important. From here on, assume any commands are run from the monorepo root directory.

```sh
cd my-project
```

### Step 3: Add the first monorepo workspace.

Again, we're using an init script to keep it simple, this time ([create-minimal-workspace](https://www.npmjs.com/package/create-minimal-monorepo)).

```sh
npm init minimal-workspace -- packages/my-lib
```

You can edit the `src` later to add the real library implementation.For now, we should be able to continue with without modifying any source files.

### Step 4: Install the Werk `build` command.

What!? The `build` command has to be installed? Yes, because Werk is extensible and modular, following in the footsteps of great tools like [Vite](https://vitejs.dev/), [Rollup](https://rollupjs.org/), and [ESLint](https://eslint.org/). All commands are separate packages, and which ones you choose to install and use is completely up to you. This is how we achieve "low-config" while still allowing complete flexibility. You can even build your own [custom commands](https://github.com/Shakeskeyboarde/werk/blob/main/packages/cli/README_CUSTOM_COMMANDS.md)!

```sh
npm install --save-dev @werk/command-build
```

The `build` command is one of several [Official Werk Commands](#official-commands) which are maintained as part of the Werk project itself. But, these are special only in that they had to exist to make Werk useful at the beginning. You can also search the NPM registry for keyword `werk-command` to find other commands that have been published by the community.

(Optional) Test it out by running the `werk build --help` command to see the command's help text.

### Step 5: Run the Werk `build` command.

Drumroll, please...

```sh
werk build
```

Congratulations! Your monorepo is built 🎉. If you want to publish it, you can continue by following the instructions of the Werk [publish](https://www.npmjs.com/package/@werk/command-publish) command.

## Commands

Werk is made up of commands which you must install separately. In monorepos, they must be installed in the root workspace.

[Learn how to create your own custom command plugins!](https://github.com/Shakeskeyboarde/werk/blob/main/packages/cli/README_CUSTOM_COMMANDS.md)

### Official Commands

The following "official" commands are provided to get you started.

- [list](https://www.npmjs.com/package/@werk/command-list): List workspaces.
- [run](https://www.npmjs.com/package/@werk/command-run): Run package scripts.
- [exec](https://www.npmjs.com/package/@werk/command-exec): Run executables.
- [build](https://www.npmjs.com/package/@werk/command-build): Build using auto-detected tools.
- [vitest](https://www.npmjs.com/package/@werk/command-vitest): Run Vitest using its built-in workspaces support.
- [version](https://www.npmjs.com/package/@werk/command-version): Update versions.
- [publish](https://www.npmjs.com/package/@werk/command-publish): Publish packages.

Run `npm install --save-dev @werk/command-<name>` in your workspaces root to install any of these commands.

### Command Discovery

When Werk starts, it scans the `package.json` file in your repo root for command plugin dependencies. By default, any package that starts with `*/werk-command-`, `werk-command-` or `@werk/command-` will be loaded as a command plugin.

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

## Options

Werk has global options for selecting workspaces, parallelization, and output. These global options _MUST_ come before the command name, or they will be passed through to the command and not handled by Werk.

```sh
werk [global-options] <command> [command-options]
```

### Global Selection Options

Options which reduce the number of workspaces that are processed.

- `-w, --workspace <patterns>`
  - Select workspaces by name (glob, csv, repeatable).
- `--no-dependencies`
  - Do not automatically include dependencies of selected workspaces.
- `--include-root-workspace`
  - Include the root workspace in the selection. _This is strongly discouraged due to the potential for unexpected behaviors like accidental recursion!_

**Note:** It is entirely up to each command to honor the "selected" workspaces. They are strongly encouraged to do so, but may choose not to if it doesn't make sense to the command.

### Global Parallelization Options

- `-p, --parallel`
  - Process workspaces in parallel.
  - This option implies the `--concurrency=auto` option.
- `-c, --concurrency <count>`
  - Set the number workspaces to process in parallel. The count can be a number, "auto", or "all". The default is is "auto", which is equivalent to one greater than the number of CPU cores (cores + 1).
  - This option implies the `--parallel` option.

By default, workspaces are processed serially. This is generally the slowest option, but also the safest.

### Global Logging Options

- `-l, --loglevel <level>`
  - Set the log level (`silent`, `error`, `warn`, `info`, `notice`, `verbose`, or `silly`). The default is `info`.
  - Log level can also be set using the `WERK_LOG_LEVEL` environment variable. This option takes precedence over the environment variable.
- `--no-prefix`
  - Do not add prefixes to command output.

### Global Git Options

- `--git-head <sha>`
  - Provide a default Git "HEAD" commit in non-Git environments. This has no effect if Git is available.
- `--git-from-revision <rev>`
  - Use a specific Git revision when detecting modifications. If not specified, it will be detected from the registry metadata of the current version.
