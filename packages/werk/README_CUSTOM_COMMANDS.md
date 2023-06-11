# Werk Custom Commands

- [Implementing Commands](#implementing-commands)
  - [Command Hooks](#command-hooks)
  - [Hook Contexts](#hook-contexts)
  - [Log](#log)
  - [Workspaces](#workspaces)
- [Command Line Parsing](#command-line-parsing)
- [Spawning Processes](#spawning-processes)
- [Starting Threads](#starting-threads)
- [Patching Workspace `package.json` Files](#patching-workspace-packagejson-files)
- [Publishing Commands](#publishing-commands)

## Implementing Commands

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

You can also copy the [template](https://github.com/Shakeskeyboarde/werk/blob/main/template) into your own repo to get started.

### Command Hooks

A Werk command is compose of hook callbacks (all optional).

- `init`: Called when the command is loaded. Intended for configuring command options, arguments, and help text.
- `before`: Run once before handling individual workspaces.
- `each`: Run once for each workspace in order of interdependency ( dependencies before dependents).
  - _Please honor the `context.workspace.selected` property if possible!_
- `after`: Run once after handling individual workspaces.
- `cleanup`: Run once after handling all workspaces. Intended for synchronous cleanup of temporary files.

If you set `process.exitCode` to a number (including zero) in any hook, the command will exit with that code after the hook completes. This _STRONGLY_ is preferred to forcing an exit with `process.exit()`.

### Hook Contexts

A context object is passed to each hook callback. The properties attached to those contexts are as follows.

- `log`: A logger which should be preferred over `console.*` logging.
- `command`: Package information about the command.
  - `main`: Main filename of the command package.
  - `dir`: Root directory of the command package.
  - `packageJson`: Contents of the command package's `package.json` file.
- `rootDir`: Absolute path of the workspaces root.
- `commander` (**init**): Configurable [Commander](https://www.npmjs.com/package/commander) instance for defining command options, arguments, and help text.
- `args` (**before**, **each**, **after**, **cleanup**): Positional arguments parsed from command line.
- `opts` (**before**, **each**, **after**, **cleanup**): Named options parsed from the command line.
- `workspaces` (**before**, **each**, **after**): A map (by name) of all [workspaces](#workspaces).
- `workspace` (**each**): The current [workspace](#workspaces).
- `spawn` (**before**, **each**, **after**, **cleanup**): Spawn a process. The working directory will be the root of the current workspace if available (`each` hook), or the workspaces root otherwise.
- `startWorker(data?)` (**before**, **each**, **after**): Re-runs the current hook in a [worker thread](https://nodejs.org/api/worker_threads.html).
- `isWorker` (**before**, **each**, **after**): True if the hook is running in a worker thread.
- `workerData` (**before**, **each**, **after**): Data passed to the `startWorker(data?)` function, or undefined if `isWorker` is false.
- `exitCode` (**cleanup**): Exit code of the command.

### Log

The `context.log` should be used for all logging. Please don't use the global `console` object.

- `silly`: Print a dimmed log message to stderr. This is intended to be useful only to developers.
- `verbose`: Print a dimmed log message to stderr. This is intended to help users do their own troubleshooting.
- `info`: Print an undecorated log message to stdout. This is intended for informational details about the progress or results of a command.
- `notice`: Print a bold log message to stderr. This is intended for messages that need to stand out a little, and are possibly unexpected.
- `warn`: Print a yellow log message to stderr. This is intended for problems that are not immediate failures, but may indicate something unexpected or incorrect.
- `error`: Print a red log message to stderr. This is intended for things that are definitely wrong, and are probably immediate failures.
- `stdout`: Writable stream which can be used for piping.
- `stderr`: Writable stream which can be used for piping.
- `getLevel()`: Function which returns the current log level (eg. `{ name: 'info', value: 40 }`).

Any logged messages may be modified in the following ways:

- ANSI escape sequences are stripped.
- Workspace name prefixes may be added.
- Blank lines may be removed.
- Message may be omitted based on log level.

No hard wrapping is ever added.

### Workspaces

The `context.workspaces` and `context.workspace` properties contain instances of the `Workspace` class. These instances provide informational properties and helper methods for interacting with workspaces.

**Normalized package properties:**

- `name`
- `version`
- `private`
- `dependencies`
- `peerDependencies`
- `optionalDependencies`
- `devDependencies`
- `keywords`.

**Generated properties:**

- `dir`: Absolute root directory of the workspace.
- `selected`: True if the workspace matched the Werk [global options](README.md#command-line-options).
- `dependencyNames`: A set of the unique (deduplicated) dependency names collected from all of the dependency maps.

**Package methods:**

- `readPackageJson()`: Reads the workspace `package.json` file.
- `writePackageJson(json)`: Writes the workspace `package.json` file.
- `patchPackageJson(patchFn)`: Applies a deeply merged patch to the workspace `package.json` file.

**Metadata methods:**

- `getLocalDependencies(scopes?)`: Gets the workspaces which are local dependencies of this workspace. If scopes is not specified, dependencies from all scopes are returned.
- `getNpmMetadata()`: Gets the registry metadata for the workspace. This method is memoized.
- `getNpmIsPublished()`: Returns true if the current workspace name and version are published to the registry.
- `getGitIsRepo()`: Returns true if the workspace root directory is part of a git repository.
- `getGitHead()`: Gets the commit hash of the workspace's git HEAD.
- `getGitIsClean()`: Returns true if the workspace's git working tree is clean.
- `getGitIsModified()`: Returns true the workspace is not published, the published `gitHead` metadata is missing, or if there is a difference between the `gitHead` commit and the current HEAD.

**NOTE:** All Git methods except `getGitIsRepo()` will throw if the workspace is not part of a git repository.

## Command Line Parsing

The `init` hook `context.commander` property is just a [Commander](https://www.npmjs.com/package/commander) command. You may configure it in any way you want. The configured command must be returned so that Typescript can infer the `context.args` and `context.opts` types for the other hooks.

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

The `description` and `version` from your command's `package.json` file will be used if they are not overridden in the `init` hook.

## Spawning Processes

The `context.spawn(cmd, args?, options?)` function is a promise based helper for running child processes.

- Based on [cross-spawn](https://www.npmjs.com/package/cross-spawn), so spawning should be fairly consistent on Windows, Mac, and Linux.
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

  // Setup stdout and stderr streams.
  //  Default: false
  stream: true,

  // Setup the stdin stream.
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

  // Set the process working directory.
  //  Default: context.workspace.dir or context.rootDir
  cwd: '/current/working/directory',

  // Set the process environment variables (replaces process.env).
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

## Starting Threads

The `before`, `each`, and `after` hooks can spawn a copies of themselves in worker threads by calling the `context.startWorker(workerData?)` function.

**NOTE:** Using this helper is optional. However, please consider creating and using a new `Log` instance in alternatively created threads.

The simplest case is to always run a hook in a separate thread.

```ts
export default createCommand({
  each: async (context): Promise<void> => {
    if (await context.startWorker()) return;

    // Do stuff in the worker thread.
  },
});
```

If the `context.startWorker()` function is called from the main thread, it starts a worker thread and returns true. If it's called from a worker thread, it does nothing and returns false.

You can pass data to the worker thread. The data must be compatible with the [Structured Clone](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) algorithm.

```ts
if (await context.startWorker({ timestamp: Data.now() })) {
  return;
}

context.log.info(`Current Timestamp: ${context.workerData.timestamp}`);
```

If you need access to the [NodeJS Worker](https://nodejs.org/api/worker_threads.html#class-worker) instance (eg. for messaging), it is attached to the returned promise.

```ts
const workerPromise = context.startWorker();

if (workerPromise.isStarted) {
  workerPromise.worker.on('message', handleMessage);
}

// Don't forget to await the promise.
await workerPromise;
```

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

If possible, name your package following the `werk-command-<name>` pattern. Add the `werk-command` keyword to make it easier for others to find on the registry.
