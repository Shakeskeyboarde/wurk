# Werk

Open-minded build tooling, with opinionated plugins.

[![npm](https://img.shields.io/npm/v/@werk/cli?label=NPM)](https://www.npmjs.com/package/@werk/cli)

Werk is a framework for creating build and build-related commands. Commands are have a well defined lifecycle and context. While single package projects are supported, Werk really shines in monorepos where the built-in orchestration can be leveraged.

Read the [usage documentation](packages/werk/README.md) or learn how to build your own [custom commands](packages/werk/README_CUSTOM_COMMANDS.md).

## Packages

- [@werk/cli](packages/werk/README.md): Werk core package.
- [@werk/command-list](packages/werk-command-list/README.md): List workspaces.
- [@werk/command-run](packages/werk-command-run/README.md): Run package scripts.
- [@werk/command-exec](packages/werk-command-exec/README.md): Run executables.
- [@werk/command-build](packages/werk-command-build/README.md): Build packages.
- [@werk/command-vitest](packages/werk-command-vitest/README.md): Run Vitest.
- [@werk/command-version](packages/werk-command-version/README.md): Update versions.
- [@werk/command-publish](packages/werk-command-publish/README.md): Publish packages.
