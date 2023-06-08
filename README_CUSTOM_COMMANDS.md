# Werk Command Development

Custom commands are supported and encouraged.

The first goal of Werk is to make it easier to build or choose the monorepo orchestration patterns that make sense for you. You shouldn't have to jump through hoops to do things the way you want and need to do them in your own repos and pipelines. Werk should be to monorepos what Rollup, Vite, and Webpack are to bundling.

- [Overview](#overview)
  - [Implementing Commands](#implementing-commands)
  - [Command Hooks](#command-hooks)
  - [Hook Contexts](#hook-contexts)
  - [Workspaces](#workspaces)
- [Patching Workspace `package.json` Files](#patching-workspace-packagejson-files)
- [Command Line Parsing](#command-line-parsing)
- [Spawning Processes](#spawning-processes)
- [Starting Threads](#starting-threads)
- [Logging](#logging)
- [Publishing Commands](#publishing-commands)

## Overview

Werk provides the following capabilities so that your custom command can focus on doing its job.

- **Resolve** NPM workspaces with **filtering** and interdependency **ordering**.
- **Read** and **patch** workspace `package.json` files.
- **Parse** CLI **options** and **arguments** using [commander](https://www.npmjs.com/package/commander).
- **Spawn** processes and consume their output.
- **Parallelize** with or without [threading](https://nodejs.org/api/worker_threads.html).
- **Log** messages with decoration, prefixing, and level filtering.

### Implementing Commands

A custom command is just an NPM package with a Werk Command default export. Using Typescript is strongly recommended.

Import the `@werk/cli` package and use the `createCommand` function to define your command hooks.

```ts
import { createCommand } from '@werk/cli';

export default createCommand({
  init: (context) => {},
  before: async (context) => {},
  each: async (context) => {},
  after: async (context) => {},
  cleanup: (context) => {},
});
```

### Command Hooks

A Werk command consists of several different hook callbacks, which are all optional.

- `init`: Called when the command is loaded. Intended for configuration of command options, arguments, and help text.
- `before`: Run once before handling individual workspaces.
- `each`: Run once for each workspace in order of interdependency ( dependencies before dependents).
- `after`: Run once after handling individual workspaces.
- `cleanup`: Run once after handling all workspaces. Intended for synchronous cleanup of temporary files.

### Hook Contexts

A context object is passed to each hook callback. The properties attached to those contexts are as follows.

- `log`: A logger which should be preferred over `console.*` logging.
- `command`: Package information about the command.
  - `main`: Main filename of the command package.
  - `dir`: Root directory of the command package.
  - `name`: Name from the command's `package.json` file.
  - `description`: Description from the command's `package.json` file.
  - `version`: Version from the command's `package.json` file.
- `rootDir`: Absolute path of the workspaces root.
- `commander` (**init** hook only): Configurable [Commander](https://www.npmjs.com/package/commander) instance for defining command options, arguments, and help text.
- `args` (**before**, **each**, **after**, and **cleanup** hooks only): Positional arguments parsed from command line.
- `opts` (**before**, **each**, **after**, and **cleanup** hooks only): Named options parsed from the command line.
- `workspaces` (**before**, **each**, and **after** hooks only): A map (by name) of all [workspaces](#workspaces).
- `workspace` (**each** hook only): The current [workspace](#workspaces).
- `spawn` (**before**, **each**, **after**, and **cleanup** hooks only): Spawn a process. The working directory will be the root of the current workspace if available (`each` hook), or the workspaces root otherwise.
- `startWorker(data?)` (**before**, **each**, and **after** hooks only): Re-runs the current hook in a [worker thread](https://nodejs.org/api/worker_threads.html).
- `isWorker` (**before**, **each**, and **after** hooks only): True if the hook is running in a worker thread.
- `workerData` (**before**, **each**, and **after** hooks only): Data passed to the `startWorker(data?)` function, or undefined if `isWorker` is false.
- `exitCode` (**cleanup** hook only): Exit code of the command.

### Workspaces

The context `workspaces` and `workspace` properties contain instances of the `Workspace` class.

Each `Workspace` instance has the following properties extracted from the workspace `package.json` file.

- `name`
- `version`
- `private`
- `dependencies`
- `peerDependencies`
- `optionalDependencies`
- `devDependencies`
- `keywords`.

The following additional properties are also included.

- `dir`: Absolute root directory of the workspace.
- `selected`: True if the workspace matched the Werk [global options](README.md#command-line-options)
- `dependencyNames`: A set of the unique (deduplicated) dependency names collected from all of the dependency maps.
- `readPackageJson()`: Reads the workspace's full `package.json` file.
- `writePackageJson(json)`: Writes the workspace `package.json` file.
- `patchPackageJson(patchFn)`: Applies a deeply merged patch to the workspace `package.json` file.
- `getLocalDependencies({ scopes? })`: Gets the workspaces which are local dependencies of this workspace. If scopes is not specified, dependencies from all scopes are returned.
- `getNpmMetadata(version?)`: Gets the NPM metadata for the workspace. If a version is not specified, the workspace's version is used.
- `getGitHead()`: Gets the commit hash of the workspace's git HEAD.
- `getIsGitClean()`: Returns true if the workspace's git working tree is clean.
- `getIsGitModified(commit?)`: Returns true if there is a difference between the commit and the current HEAD. If a commit is not specified, the workspace's git HEAD is used.

## Patching Workspace `package.json` Files

The [workspace](#workspaces) `patchPackageJson(patchFn)` function takes a callback which receives the current package object, and returns an updated partial package object. The returned value is deeply merged into the original package, and written back to the workspace `package.json` file.

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

## Command Line Parsing

The `init` hook context contains a `commander` property, which is just a [Commander](https://www.npmjs.com/package/commander) command. This command can be configured in any way you would like, The configured command must be returned so that Typescript can infer the `args` and `opts` context types for the later hooks.

```ts
export default createCommand({
  init: (context) => {
    return context.commander
      .description('My awesome Werk command.')
      .argument('<foo>', 'A positional argument named foo.')
      .option('--bar', 'A flag option named bar.')
      .option('--baz <value>', 'An option with a value named baz.')
      .version('1.2.3');
  },
});
```

See the Commanders documentation for the full API.

The `description` and `version` from your command's `package.json` file will be used if they are not overridden in the `init` hook.

## Spawning Processes

The context `spawn(cmd, args?, options?)` function is a promise based helper for running child processes.

- Based on [cross-spawn](https://www.npmjs.com/package/cross-spawn), so spawning be fairly consistent on Windows, Mac, and Linux.
- Adds `node_modules/.bin` directories to the environment `PATH`, so locally installed binaries can be executed.

**NOTE:** Using this helper is optional. However, please consider piping output from alternatively spawned processes to `log.stdout` and `log.stderr`.

```ts
const spawnPromise = spawn('git', ['status', '--porcelain'], {
  // Pass through output streams.
  //  Default: false
  echo: true,

  // Buffer stdout and stderr data.
  //  Default: false
  capture: true,

  // Pipe stdout and stderr streams for streaming.
  //  Default: false
  stream: true,

  // Pipe stdin so that data can be written to the process.
  //  Default: false
  input: true,

  // Throw an error on non-zero exit codes.
  //  Default: false
  errorThrow: true,

  // Echo all output to stderr (if echo is not set) on non-zero
  // exit codes.
  //  Default: false
  errorEcho: true,

  // Log an error message on non-zero exit codes.
  //  Default: undefined
  errorMessage: (error, exitCode) => `Something went wrong`,

  // Working directory of the child process.
  //  Default: context.workspace.dir or context.rootDir
  cwd: '/current/working/directory',

  // Environment variables set for the child process.
  //  Default: process.env
  env: {},
});
```

If you don't care about the result, you can just wait for the process to finish.

```ts
await spawnPromise;
```

If you do care about the output, the spawn promise is decorated with helpful properties.

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

## Starting Threads

Any hook except `init` can spawn a copy of itself in a worker thread by calling the context `startWorker(data?)` function.

**NOTE:** Using this helper is optional. However, please consider piping output from alternatively created threads to `log.stdout` and `log.stderr`.

The simplest case is to always run a hook in a separate thread.

```ts
export default createCommand({
  each: async (context): Promise<void> => {
    if (await context.startWorker()) return;

    // Do stuff in the worker thread.
  },
});
```

If the `startWorker()` function is called from the main thread, it starts a worker thread and returns true. If it's called from a worker thread, it does nothing and returns false.

You can pass data to the worker thread. The data must be compatible with the [Structured Clone](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) algorithm.

```ts
if (await context.startWorker({ timestamp: Data.now() })) {
  return;
}

context.log.info(`Current Timestamp: ${context.data.timestamp}`);
```

More complicated scenarios where some processing happens in the main thread, and some happens in one or more workers, can be achieved by checking the `context.isWorker` value.

If you need access to the [NodeJS Worker](https://nodejs.org/api/worker_threads.html#class-worker), it's attached to the returned promise.

```ts
const workerPromise = context.startWorker();

if (workerPromise.isStarted) {
  workerPromise.worker.on('message', handleMessage);
}

// Don't forget to await the promise.
await workerPromise;
```

## Logging

Please avoid using the global `console` object. The `log`, `warn`, and `error` methods are monkey patched to pipe through the context `log`, and using them will print a warning.

The context `log` has the following properties.

- `trace`: Print a dimmed log message to stderr. This is intended to be useful only to developers.
- `debug`: Print a dimmed log message to stderr. This is intended to help users do their own troubleshooting.
- `info`: Print an undecorated log message to stdout. This is intended for informational details about the progress or results of a command.
- `notice`: Print a bold log message to stderr. This is intended for messages that need to stand out a little, and are possibly unexpected.
- `warn`: Print a yellow log message to stderr. This is intended for problems that are not immediate failures, but may indicate something unexpected or incorrect.
- `error`: Print a red log message to stderr. This is intended for things that are definitely wrong, and are probably immediate failures.
- `writeOut`: Print an undecorated log message to stdout. This is mostly intended for internal use, but is guaranteed never to be decorated.
- `writeErr`: Print an undecorated log message to stderr. This is mostly intended for internal use, but is guaranteed never to be decorated.
- `stdout`: Writable stream which can be used for piping.
- `stderr`: Writable stream which can be used for piping.
- `getLevel()`: Function which returns the current log level (eg. `{ name: 'info', value: 40 }`).

Any logged messages may be modified in the following ways:

- ANSI escape sequences are stripped.
- Workspace name prefixes may be added.
- Blank lines may be removed.
- Message may be omitted based on log level.

No hard wrapping is ever added.

## Publishing Commands

If possible, name your package following the `werk-command-<name>` pattern. Add the `werk-command` keyword to make it easier for others to find on the NPM registry.
