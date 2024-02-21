# Wurk Test Command

Run tests using the following tools.

- [eslint](https://npmjs.com/package/eslint)
- [vitest](https://npmjs.com/package/vitest)
- [@wurk/command-depcheck](https://npmjs.com/package/@wurk/command-depcheck)

[![npm](https://img.shields.io/npm/v/@wurk/command-test?label=NPM)](https://www.npmjs.com/package/@wurk/command-test)
[![wurk](https://img.shields.io/npm/v/wurk?label=Wurk&color=purple)](https://www.npmjs.com/package/wurk)

## Vitest

Run Vitest in each selected workspaces using its built-in [workspaces support](https://vitest.dev/guide/workspace.html).

If Vitest is not installed at the root, Vitest will be skipped. Workspaces which do not contain a Vitest configuration file will be skipped. Vitest can be explicitly skipped by using the `--no-vitest` option.

NOTE: Any static workspaces configuration file (eg. `vitest.workspace.ts`) is ignored. A temporary workspaces configuration is always generated from selected workspaces.

## ESLint

Run ESLint in each selected workspace. If available, the ESLint configuration
in the workspace is used. Otherwise, the configuration in the root workspace
is used.

If ESLint is not installed at the root or no configuration is found, ESLint will be skipped. ESLint can be skipped by using the `--no-eslint` option.

## Depcheck

Run the Wurk `depcheck` command (ie. [@wurk/command-depcheck](https://npmjs.com/package/@wurk/command-depcheck)) to check for unused dependencies in each selected workspace.

If the `depcheck` command is not installed, depcheck will be skipped. Depcheck can be skipped by using the `--no-depcheck` option.
