# Wurk

Wurk is a lightweight and extensible build system for monorepos.

- Orchestrate tasks across multiple interrelated workspaces.
- Stay flexible and transparent without adding complexity.
- Be declarative and leverage the power of community with custom commands.

Read more about the motivation for this project [here](./README-MOTIVATION.md).

## Prerequisites

- [Node.js®](https://nodejs.org/)
- [NPM](https://www.npmjs.com/), [PNPM](https://pnpm.io/), or [Yarn v2+](https://yarnpkg.com/)
- [Git](https://git-scm.com/) (recommended but optional)

## Getting Started

Install Wurk and any [Wurk commands](#commands) you want as dev dependencies of your root workspace.

```sh
npm install --save-dev wurk @wurk/command-run
```

> **Note:** PNPM and Yarn sometimes prefer using multiple versions of a package. This can lead to Wurk not detecting command plugins. Try running `pnpm dedupe wurk` or `yarn dedupe wurk` to resolve this issue.

Run a Wurk command. For example the [run](https://npmjs.com/package/@wurk/command-run) command (installed above) runs package.json scripts in each workspace where they exist.

```sh
npx wurk run build
```

(Optional) Install Wurk globally to avoid having to use `npx`. When `wurk` is executed, it delegates to the locally installed version, so `wurk run build` becomes equivalent to `npx wurk run build`.

```sh
npm install --global wurk
```

If you use a command that is not provided by a Wurk command package, then Wurk will try to run a matching root `package.json` script. This allows root package scripts to serve as ad-hoc commands. Wurk global command line options will also be inherited by Wurk commands used in scripts.

```sh
# Run the build script from the root workspace package.json file.
wurk build
# Which is equivalent to the following npm command.
npm run build
```

(Optional) Delegate root workspace package.json scripts to Wurk.

```json
{
  "scripts": {
    "build": "wurk run build",
    "eslint": "wurk exec eslint src",
    "depcheck": "wurk exec depcheck",
    "test": "wurk build && wurk lint && wurk depcheck && wurk vitest",
    "create-release": "wurk version auto",
    "release": "wurk publish"
  }
}
```

## Commands

The following "official" commands are available.

- [run](https://www.npmjs.com/package/@wurk/command-run): Run package scripts in workspaces.
- [exec](https://www.npmjs.com/package/@wurk/command-exec): Run executables in workspaces.
- [vitest](https://www.npmjs.com/package/@wurk/command-vitest): Run Vitest on workspaces.
- [version](https://www.npmjs.com/package/@wurk/command-version): Set, increment, promote, and conventionally auto generate versions.
- [publish](https://www.npmjs.com/package/@wurk/command-publish): Publish or pack workspace packages.
- [list](https://www.npmjs.com/package/@wurk/command-list): List workspaces.

Run `npm install --save-dev @wurk/command-<name>` in your root workspace to install any of these commands.

See the [API docs](./docs/api/README.md) for information on creating your own custom commands.

## Options

Wurk has global options for selection, parallelization, logging, etc.

These options are "global" because they are defined by Wurk itself. Commands can also define their own options. In general, global options should precede the command name, and command options should follow the command name. Most commands will allow Wurk to handle global options that follow the command name, but this is not guaranteed.

```sh
wurk [global-options] <command> [command-options]
```

### Filter Options

Options which control which workspaces are affected by commands.

- `-i, --include <expression>` - Include workspaces by name, directory, keyword, etc.
- `-e, --exclude <expression>` - Exclude workspaces by name, directory, keyword, etc.

The `<expression>` can be any of the following:

- Workspace Names (glob supported)
  - Examples: `my-package` or `@my-scope/*`
- Paths (glob supported)
  - Examples: `/packages/my-package` or `./packages/*`
- Keywords
  - Examples: `#foo`
- States
  - `@public` - Public workspaces
  - `@private` - Private workspaces
  - `@published` - Published workspaces
  - `@unpublished` - Unpublished workspaces
  - `@dependency` - Dependencies of currently included workspaces
  - `@dependent` - Dependents of currently included workspaces

> Path expressions must only use forward slashes (`/`) as a directory separators, even on Windows. Any backslash (`\`) characters will be treated as glob escape characters. Paths are always relative to the root workspace directory.

> Globs are processed using the [minimatch](https://www.npmjs.com/package/minimatch) library with default options.

> Includes and excludes are processed in order. Includes can re-add workspaces that were previously excluded, and excludes can remove workspaces that were previously included.

> If no filters are provided, then all workspaces are included.

### Parallelization Options

- `--parallel`
  - Process all workspaces simultaneously without topological awaiting.
- `--stream`
  - Process workspaces concurrently with topological awaiting.
- `--concurrency <count>`
  - Set the number workspaces to process simultaneously when streaming. The default is one greater than the number of CPU cores (cores + 1).
  - This option implies the `--stream` option.
- `--delay-each-workspace <seconds>`
  - Delay before starting to process the next workspace. This can be useful for rate limiting, debugging, or working around tool limitations.

> By default, workspaces are processed serially (one at a time). This is generally the slowest option, but also the safest.

### Logging Options

- `--loglevel <level>`
  - Set the log level (`silent`, `error`, `warn`, `info`, `notice`, `verbose`, or `silly`). The default is `info`.
  - Log level can also be set using the `WURK_LOG_LEVEL` environment variable. The command line option takes precedence over the environment variable.

## Package Managers

Wurk supports NPM, PNPM, and Yarn v2+. The package manager is automatically detected based on the [Corepack](https://nodejs.org/api/corepack.html) defined `packageManager` field in your root `package.json` file.

If you're not using Corepack, then Wurk will fallback to detecting files and configuration specific to each package manager.

- PNPM: `pnpm-workspace.yaml` present.
- Yarn: `workspaces` package field and `yarn.lock` present.
- NPM: `workspaces` package field, and NO `yarn.lock` present.
