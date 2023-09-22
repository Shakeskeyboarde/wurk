# Werk

Open-minded build tooling, with opinionated plugins.

[![npm](https://img.shields.io/npm/v/@werk/cli?label=NPM)](https://www.npmjs.com/package/@werk/cli)

Werk is a framework for creating build and build-related commands. Commands are have a well defined lifecycle and context. While single package projects are supported, Werk really shines in monorepos where the built-in orchestration can be leveraged.

Read the [usage documentation](packages/cli/README.md) or learn how to build your own [custom commands](packages/cli/README_CUSTOM_COMMANDS.md).

## Packages

- [@werk/cli](packages/cli/README.md): Werk core package.
- [@werk/command-list](packages/command-list/README.md): List workspaces.
- [@werk/command-run](packages/command-run/README.md): Run package scripts.
- [@werk/command-exec](packages/command-exec/README.md): Run executables.
- [@werk/command-build](packages/command-build/README.md): Build packages.
- [@werk/command-vitest](packages/command-vitest/README.md): Run Vitest.
- [@werk/command-version](packages/command-version/README.md): Update versions.
- [@werk/command-publish](packages/command-publish/README.md): Publish packages.
