# Werk Custom Commands

- [Implementing Commands](#implementing-commands)
  - [Command Requirements](#command-requirements)
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
  packageManager: ['npm'],
  config: (commander) => commander,
  before: async (context) => {},
  each: async (context) => {},
  after: async (context) => {},
  cleanup: (context) => {},
});
```

You can also copy the [template](https://github.com/Shakeskeyboarde/werk/blob/main/template) into your own repo to get started.

### Command Requirements

The following properties define requirements for the command (all optional).

- `packageManager`: Package managers supported by the command, or false if the command does not depend on any package manager. Defaults to `['npm']`.

### Command Hooks

A Werk command is compose of hook callbacks (all optional).

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
- `commandMain` (**before**, **each**, **after**): Main filename of the command package.
- `config`: The command configuration from the workspaces root `package.json` file `werk.<command>.config` key.
- `rootDir`: Absolute path of the workspaces root.
- `args`: Positional arguments parsed from command line.
- `opts`: Named options parsed from the command line.
- `root` (**before**, **each**, **after**): The workspaces root [workspace](#workspaces).
- `workspaces` (**before**, **each**, **after**): A map (by name) of all [workspaces](#workspaces).
- `workspace` (**each**): The current [workspace](#workspaces).
- `forceWait()` (**before**): Force dependent workspaces to wait for their dependencies (ie. ignore the CLI `--no-wait` option).
- `saveAndRestoreFile(filename)` (**before**, **each**, **after**): Save the contents of a file and restore it after the command completes.
- `spawn(cmd, args?, options?)`: Spawn a process. The working directory will be the workspaces (monorepo) root.
- `startWorker(data?)` (**before**, **each**, **after**): Re-runs the current hook in a [worker thread](https://nodejs.org/api/worker_threads.html).
- `isParallel` (**each**): True if the command is running in parallel mode.
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
- `level`: The current log level (eg. `info`).

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
- `type`
- `types`
- `bin`
- `main`
- `module`
- `exports`
- `directories`
- `man`
- `dependencies`
- `peerDependencies`
- `optionalDependencies`
- `devDependencies`
- `keywords`.

**Generated properties:**

- `dir`: Absolute root directory of the workspace.
- `selected`: True if the workspace matched the Werk [global options](README.md#command-line-options).
- `dependencyNames`: A set of the unique (deduplicated) dependency names collected from all of the dependency maps.
- `config`: The command configuration value from the workspace `package.json` file `werk.<command>.config` key.

**Package methods:**

- `readPackageJson()`: Reads the workspace `package.json` file.
- `writePackageJson(json)`: Writes the workspace `package.json` file.
- `patchPackageJson(patchFn)`: Applies a deeply merged patch to the workspace `package.json` file.

**Metadata methods:**

- `getLocalDependencies({ scopes? }?)`: Gets the workspaces which are local dependencies of this workspace. If `scopes` is not specified, dependencies from all scopes are returned.
- `getNpmIsPublished()`: Returns true if the current workspace name and version are published to the registry.
- `getGitIsRepo()`: Return true if the workspace directory is only a shallow Git checkout.
- `getGitIsShallow()`: Returns true if the workspace root directory is part of a git repository.
- `getGitHead()`: Gets the Git head commit hash. Returns undefined outside of a Git repo unless the `--git-head` global option is not set.
- `getGitFromRevision()`: Gets the "from" revision which should be used for detecting changes. Returns undefined outside of a Git repo, if the `--git-from-revision` options is not set.
- `getGitIsClean(options?)`: Returns true if the workspace's git working tree is clean. Returns true outside of a Git repo.
- `getIsModified(options?)`: Returns true if the workspace is not published, or there are uncommitted changes. Otherwise, it returns true if the workspace is part of a Git repo, and the diff of the "from" revision and the head commit is not empty.
- `getEntryPoints()`: List all the files which are considered entry points for the workspace.
- `getIsBuilt()`: Returns true if the workspace entry points exist.

**Note:** If the workspace is not part of a Git repository, the workspace will read as clean and unmodified.

## Command Line Parsing

The `config` hook is passed a [Commander](https://www.npmjs.com/package/commander) instance. You may configure it in almost any way you want. However, adding actions or sub-commands is not supported. The action will be overridden by Werk, and sub-commands will not benefit from Werk's lifecycle management.

The configured command must be returned so that Typescript can infer the `context.args` and `context.opts` types for the other hooks.

```ts
export default createCommand({
  config: (commander) => {
    return commander
      .argument('<foo>', 'A positional argument named foo.')
      .option('--bar', 'A flag option named bar.')
      .option('--baz <value>', 'An option with a value named baz.');
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

## Starting Threads

The `before`, `each`, and `after` hooks can spawn a copies of themselves in worker threads by calling the `context.startWorker(workerData?)` function.

**Note:** Using this helper is optional. However, please consider creating and using a new `Log` instance in alternatively created threads.

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

Name your package `werk-command-<name>` or `@<scope>/werk-command-<name>`. Also, add the `werk-command` keyword to make it easier for others to find on the NPM registry.
