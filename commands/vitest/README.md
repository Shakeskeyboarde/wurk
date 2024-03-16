# Wurk Vitest Command

Run Vitest using its built-in workspaces support.

## Getting Started

Install the command in your root workspace.

```sh
npm install --save-dev @wurk/command-vitest
```

Run the command.

```sh
wurk vitest run -- [vitest-options...]
```

## Workspaces Support

Vitest includes support for [Workspaces](https://vitest.dev/guide/#workspaces-support) which allows test coverage to be aggregated across multiple packages.

This command is a wrapper around Vitest which creates the workspaces configuration for you, based on Wurk workspace selection, and workspaces which include vitest or vite configuration files.
