# Werk Command Development

Custom commands are supported and encouraged. Werk is designed first as a framework for enabling the development of monorepo management commands.

## Command Package Discovery

Command packages which are named `werk-command-<name>` (or `@werk/command-<name>`) will be automatically resolved. They just need to be installed either locally in a workspaces root package, or globally.

Other package names can also be mapped to commands by using the `werk` key in your workspaces root `package.json` file.

```json
{
  "werk": {
    "commands": {
      "run": "@myorg/werk-run"
    }
  }
}
```

## Command Implementation

Your command package should have a dependency on [@werk/cli](https://www.npmjs.com/package/@werk/cli).

The package should have a command module default export.

```ts
import { createCommand } from '@werk/cli';

export default createCommand({
  // Optional description of your command.
  description: 'My custom command',

  // Optional
  init: (command, context) => {
    // Configure Commander options and arguments. Return the configured
    // command so that Typescript knows what options and arguments exist.
    return command
      .argument('<zort>', 'What we do every night, Pinky.')
      .option('--foo <bar>', 'Foo your bars.')
      .option('--flag', 'Wave the flag');
  },

  // Optional
  before: async (context) => {
    // Do stuff at the workspaces root, before handling workspaces.
  },

  // Optional
  each: async (workspace, context) => {
    // Please honor the Werk workspace filtering common options, unless
    // there is a compelling reason not to.
    if (!workspace.selected) {
      // Do stuff at each workspace.
    }
  },

  // Optional
  after: async (context) => {
    // Do stuff at the workspaces root, after handling workspaces.
  },
});
```

## Command

## Context

## Workspace
