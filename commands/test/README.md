# Wurk Test Command

Test workspaces using auto-detected tools.

- [Depcheck](https://npmjs.com/package/depcheck)
- [ESLint](https://npmjs.com/package/eslint)
- [Vitest](https://npmjs.com/package/vitest)

## Getting Started

Install the command in your root workspace.

```sh
npm install --save-dev @wurk/command-test
```

Run the command.

```sh
wurk test
```

Test tools are only invoked if they are present in the root workspace `package.json` file `devDependencies` map. Vitest will only include workspaces that contain a `vitest.config.*` or `vite.config.*` file.

## Options

- `--no-build`
  - Do not run the root workspace `build` script before testing.
  - In a monorepo it is usually required to build before testing so that dependencies can successfully be imported.
- `--no-include-dependents`
  - Do not include dependents of selected workspaces.
  - It's a good idea to test dependents which may include integration testing with their dependencies.
- `--depcheck-dev`
  - Show Depcheck unused devDependencies.
  - Development dependencies are both more difficult to check reliably, and less important to remove.
- `--depcheck-missing`
  - Show Depcheck missing dependencies.
  - Missing dependencies are better checked by ESLint, and dev dependencies are commonly maintained at the root workspace level which causes Depcheck to report false positives.
