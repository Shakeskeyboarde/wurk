# Wurk Custom Commands

- [Philosophy](#philosophy)
  - [Low-configuration](#low-configuration)
  - [Auto-detection](#auto-detection)
  - [Auto-backoff](#auto-backoff)
- [Creating Commands](#creating-commands)
  - [Command Hooks](#command-hooks)
  - [Hook Contexts](#hook-contexts)
  - [Log](#log)
  - [Workspaces](#workspaces)
  - [Workspace References](#workspace-references)
- [Command Line Parsing](#command-line-parsing)
- [Spawning Processes](#spawning-processes)
- [Patching Workspace `package.json` Files](#patching-workspace-packagejson-files)
- [Publishing Commands](#publishing-commands)

## Philosophy

Wurk is a framework for creating custom build and project management commands. As a command creator, you will benefit from a well defined lifecycle, easy access to workspace information, and helpful utilities. The improved developer experience in turn helps give users a higher baseline level of consistency and quality.

### Low-configuration

Choosing a Wurk command to run should be 95% of the configuration required to accomplish a goal (eg. building a project). In order to achieve this, commands should follow these guidelines.

- Do one thing well.
- Be opinionated in how you do the thing.
- Avoid required options, arguments, or file based configuration.

This is important for a monorepo, because any configuration is almost certain to be multiplied by the number of workspaces. If I have the option of trying to write configuration for 10 workspaces, or choosing a different command that just works, I would rather choose a different command.

### Auto-detection

Sometimes, the scope of the "one thing" a command does is fairly broad, because it can't reasonably be narrowed. When this is the case, then the command should try to detect the correct method to use based on what dependencies are installed in a workspace, the package configuration, or the presence of certain files.

The [build](https://www.npmjs.com/package/@wirkjs/command-build) command is a good example of this. It does one thing, but there are lots of ways to build. Building can't easily be broken into multiple commands, because (in a monorepo) workspaces are frequently interdependent, which means they need to be built in a specific order. So, the `build` command knows how to build in several different ways. It detects what build tools and configurations to use based on the dev dependencies of the workspace, the entrypoints defined in the package configuration, and the presence of configuration files.

### Auto-backoff

Commands should make life easier. One thing that doesn't make life easier, is having to work around a command that is doing more than you want it to.

For instance, if a command uses a 3rd party tool that requires a configuration, then it may include or generate the configuration as needed. However, if the configuration already exists in the workspace, then it should use that configuration instead.

There are cases where specific configuration options are required for a command to do its job correctly. In these cases, a command should take one or more of the following approaches.

- Skip the workspace if there's no way to work with the custom configuration.
- Allow users to extend the automatic configuration in their own custom configuration.
- Read the custom configuration and adapt to it.
- Extend the custom configuration and override specific options only if absolutely necessary, and warn the user that it's happening.

Again, the [build](https://www.npmjs.com/package/@wirkjs/command-build) command is a good example. If `vite` is a dev dependency of the workspace, but there is no Vite configuration file, then it will use its own built-in configuration. However, if a custom Vite configuration is present, it is used. The built-in configuration can be extended by importing `@wirkjs/command-build/config`.

## Creating Commands

A custom command is just an NPM package with a Wurk Command default export. Using Typescript is strongly recommended.

Import the `wurk` package and use the `createCommand` function to define your command.

```ts
import { createCommand } from 'wurk';

export default createCommand('my-command', {
  config: (cli) => cli,
  action: (context) => {},
});
```

You can also copy the [template](https://github.com/Shakeskeyboarde/wurk/blob/main/template) into your own repo to get started.

The `config` callback must configure and return the command's command line interface. The `cli` parameter is an unconfigured `Cli` instance from the [@wurk/cli](https://www.npmjs.com/package/@wurk/cli) package.

The `action` callback is called if the command name is matched. The `context` parameter is an object which provides access to the parsed command line results, workspaces, and helper methods.

### Command Hooks

A Wurk command is compose of hook callbacks (all optional).

- `config`: Called once when the command is loaded to configure the command line interface.
- `before`: Run once before handling individual workspaces.
- `each`: Run once for each workspace in order of interdependency ( dependencies before dependents).
  - _Please honor the `context.workspace.selected` property if possible!_
- `after`: Run once after handling individual workspaces.
- `cleanup`: Run once after all other hooks, even if an error occurs in the `before`, `each`, or `after` hooks.

If you set `process.exitCode` to a number (including zero) in any hook, the command will exit with that code after the hook completes. This _STRONGLY_ is preferred to forcing an exit with `process.exit()`.

### Hook Contexts

A context object is passed to all hooks, _except for `config`_ which only receives a Commander instance to configure. The properties attached to contexts are as follows.

- `log`: A logger which should be preferred over `console.*` logging.
- `args`: Positional arguments parsed from command line.
- `opts`: Named options parsed from the command line.
- `root` (**before**, **each**, **after**): The workspaces root [workspace](#workspaces).
- `workspaces` (**before**, **each**, **after**): A map (by name) of all [workspaces](#workspaces).
- `workspace` (**each**): The current [workspace](#workspaces).
- `setWaitForDependencies()` (**before**): Force dependent workspaces to wait for their dependencies.
- `setPrintSummary()` (**before**): Print a workspace status summary after the command completes.
- `spawn(cmd, args?, options?)`: Spawn a process. The working directory will be the workspaces (monorepo) root.
- `saveAndRestoreFile(...pathParts)` (**before**, **each**, **after**): Save the contents of a file and restore it after the command completes. If multiple path parts are given, they will be resolved into a single path.
- `isParallel` (**each**): True if the command is running in parallel mode.
- `exitCode` (**cleanup**): Exit code of the command.

**Note:** Context operations (eg. `spawn`, `saveAndRestoreFile`) are always relative to the root workspace, NOT the current workspace!

### Log

The `context.log` should be used for all logging. Please don't use the global `console` object.

- `stdout`: Writable stream which can be used for piping.
- `stderr`: Writable stream which can be used for piping.
- `level`: The current log level (eg. `info`).
- `isLevel(level)`: Returns true if the current log level is at least the given level.
- `silly(message?)`: Print a dimmed log message to stderr. This is intended to be useful only to developers.
- `verbose(message?)`: Print a dimmed log message to stderr. This is intended to help users do their own troubleshooting.
- `info(message?)`: Print an uncolored log message to stdout. This is intended for informational details about the progress or results of a command.
- `notice(message?)`: Print an uncolored log message to stderr. This is intended for messages that are important, but not necessarily problems.
- `warn(message?)`: Print a yellow log message to stderr. This is intended for problems that are not immediate failures, but may indicate something unexpected or incorrect.
- `error(message?)`: Print a red log message to stderr. This is intended for things that are definitely wrong, and are probably immediate failures.
- `print(message?)`: Print an uncolored message to stdout, regardless of the current log level. This is intended for informational commands, where the command has no purpose but to print a message.

### Workspaces

The `context.root` and `context.workspaces` provide instances of the `Workspace` class. These instances provide informational properties and helper methods for interacting with workspaces.

**Normalized package properties:**

- `name`
- `description`
- `version`
- `scripts`
- `keywords`
- `type`
- `files`
- `directories`
- `man`
- `types`
- `bin`
- `main`
- `module`
- `exports`
- `dependencies`
- `peerDependencies`
- `optionalDependencies`
- `devDependencies`
- `isPrivate`

**Generated properties:**

- `localDependencies`: Map of local dependency [workspace references](#workspace-references) (by name). This includes direct and indirect dependencies.
- `localDependents`: Map of local dependent [workspace references](#workspace-references) (by name). This includes direct and indirect dependents.
- `dir`: Absolute root directory of the workspace.
- `isRoot`: True if the workspace is the root workspace.
- `isSelected`: True if the workspace matched the [Wurk global selection options](README.md#global-selection-options). _This property is mutable._

**Utility methods:**

- `clean()`: Remove files and directories from the workspace which are ignored by Git, _except_ for `node_modules` and dot-files (eg. `.gitignore`, `.vscode`, etc.).
- `import(id)`: Dynamically import an optional dependency, _relative to the workspace directory._

**Package methods:**

- `readPackageJson()`: Reads the workspace `package.json` file.
- `writePackageJson(json)`: Writes the workspace `package.json` file.
- `patchPackageJson(patchFn)`: Applies a deeply merged patch to the workspace `package.json` file.

**Metadata methods:**

- `getNpmMetadata()`: Returns NPM registry metadata for the current version of the workspace.
- `getNpmIsPublished()`: Returns true if the current workspace name and version are published to the registry.
- `getNpmHead()`: Returns the "from" revision which should be used for detecting changes. Returns undefined if no published commit can be resolved from an NPM registry and the `--git-from-revision` option is not set.
- `getGitIsRepo()`: Returns true if the workspace root directory is part of a git repository.
- `getGitIsShallow()`: Return true if the workspace directory is only a shallow Git checkout. Returns false outside of a Git repo.
- `getGitHead()`: Returns the hash of the most recent commit which modified the workspace directory. Returns undefined outside of a Git repo.
- `getGitIgnored(options?)`: Returns a list of files which are ignored by the workspace's gitignore rules. Returns an empty list outside of a Git repo.
- `getGitIsDirty()`: Returns true if the workspace's git working tree is dirty. Returns false outside of a Git repo.
- `getIsModified()`: Returns true if the workspace's published commit and current commit are different, or if one or both commits cannot be detected (eg. not a Git repo).
- `getEntryPoints()`: List all the files which are considered entry points for the workspace.
- `getMissingEntryPoints()`: List of all the workspace entry points that are missing.
- `setStatus(status, detail?)`: Set the workspace status which will be printed if summary printing is enabled (See the `before` hook context `setPrintSummary()` method). Set the status to `pending` before starting work that may throw errors. If the status is pending at the end of the command, it will be changed to `failed`.

**Note:** If the workspace is not part of a Git repository, the workspace will read as clean and unmodified.

### Workspace References

The `workspace.localDependencies` and `workspace.localDependents` properties contain instances of `WorkspaceReference` interface. These instances provide informational properties about the related workspace.

- `workspace`: The referenced [workspace](#workspaces).
- `isDirect`: True if the reference is direct (ie. listed in the `package.json` file), rather than indirect (ie. a dependency of a dependency).
- `scope`: The scope of reference (ie. production, peer, optional, or development).

## Command Line Parsing

The `config` hook is passed a [Cli](https://www.npmjs.com/package/@wurk/cli) instance for configuration.

The configured command must be returned so that Typescript can infer the
correct type for `context.options`.

```ts
export default createCommand({
  name: 'my-command',
  config: (cli) => {
    return cli
      .option('--bar', 'A flag option named bar')
      .option('--baz <value>', 'An option with a value named baz')
      .option('<foo>', 'A positional argument named foo');
  },
});
```

The `description` and `version` from your command's `package.json` file will be used if they are not overridden in the `config` hook.

## Spawning Processes

The `context.spawn(cmd, args?, options?)` function is a promise based helper for running child processes.

- Based on [cross-spawn](https://www.npmjs.com/package/cross-spawn), so spawning should be fairly consistent on Windows, Mac, and Linux.
- Adds `node_modules/.bin` directories to the environment `PATH`, so locally installed binaries can be executed.

**Note:** Using this helper is optional. However, please consider piping output from alternatively spawned processes to `log.stdout` and `log.stderr`.

```ts
const spawnPromise = context.spawn('git', ['status', '--porcelain'], {
  // Pass through output streams.
  //  Default: false
  echo: true,

  // Buffer stdout and stderr data.
  //  Default: false
  capture: true,

  // Setup stdout and stderr streams.
  //  Default: false
  stream: true,

  // Setup the stdin stream.
  //  Default: false
  input: true,

  // Set `process.exitCode` on error.
  //  Default: false
  errorSetExitCode: true,

  // Return on error instead of throwing.
  //  Default: false
  errorReturn: true,

  // Echo all output to stderr (if echo is not set) on error.
  //  Default: false
  errorEcho: true,

  // Log an error message on error.
  //  Default: undefined
  errorMessage: (error, exitCode) => `Something went wrong`,

  // Set the process working directory.
  //  Default: context.root.dir
  cwd: '/current/working/directory',

  // Set the process environment variables (merged with process.env).
  //  Default: process.env
  env: {},
});
```

Get the process output as bytes, text, or decoded JSON.

```ts
const stdoutBytes = await spawnPromise.getStdout();
const stdoutText = await spawnPromise.getStdout('utf-8');
const stderrBytes = await spawnPromise.getStderr();
const stderrText = await spawnPromise.getStderr('utf-8');

// Both stdout and stderr as one combined value.
const outputBytes = await spawnPromise.getOutput();
const outputText = await spawnPromise.getOutput('utf-8');

// JSON parsed stdout.
const json = await spawnPromise.getJson();
const jsonOrUndefined = await spawnPromise.tryGetJson();
```

Wait for the process to exit, and get the error or error code.

```ts
const exitCode = await spawnPromise.getExitCode();
const error = await spawnPromise.getError();
const isSuccessful = await spawnPromise.succeeded();
const isFailed = await spawnPromise.failed();
```

Write to stdin (if `input = true`).

```ts
spawnPromise.stdin?.write(data);
```

Stream from stdout and stderr (if `stream = true`).

```ts
spawnPromise.stdout?.on('data', handleData);
spawnPromise.stderr?.on('data', handleData);
```

As a last resort, the [NodeJS ChildProcess](https://nodejs.org/api/child_process.html#class-childprocess) is also available.

```ts
spawnPromise.childProcess.on('close', handleClose);
```

The returned object is a promise. You can await it to get a synchronous result object if that meets your needs better.

```ts
const result = await spawnPromise;

// Output buffers, not streams
result.stdout.toString('utf-8').trim();
result.stderr.toString('utf-8').trim();
result.output.toString('utf-8').trim();

// Get values, not promises.
result.getJson().field;
result.tryGetJson()?.field;

// Properties, not getters.
result.exitCode;
result.error;
result.succeeded;
result.failed;
```

The synchronous result doesn't include the `childProcess` or `stdin`.

## Patching Workspace `package.json` Files

The `workspace.patchPackageJson(patch)` function takes a partial package object and deeply merges it with the current package, before writing the merged value to the disk.

The following example adds the `cowsay` dependency if it is missing. All existing dependencies will be left as-is.

```ts
await context.workspace.writePackageJson((packageJson) => {
  return {
    dependencies: {
      cowsay: packageJson.dependencies?.cowsay ?? '^1.5.0',
    },
  };
});
```

## Publishing Commands

Name your package `wurk-command-<name>` or `@<scope>/wurk-command-<name>`. Also, add the `wurk-command` keyword to make it easier for others to find on the NPM registry.
