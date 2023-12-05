# 3.0.0 (2023-12-04)

### Breaking Changes

- Vite library output to lib/esm and lib/cjs when ESM and CJS entry points are detected (multi-target build). (0f7b015)

## 2.2.0 (2023-11-22)

### Features

- Add vite-plugin-zip-pack support. (382c327)

## 2.1.11 (2023-11-21)

### Bug Fixes

- **cli,build,publish:** Add missing typescript declarations. (da5fe66)

### Chores

- Update deps. (f10dddf)

## 2.1.10 (2023-11-21)

### Chores

- Rename entry files. (e3b082d)

## 2.1.9 (2023-11-19)

### Notes

- Updated local dependencies.

## 2.1.8 (2023-11-17)

### Chores

- Update deps. (a4edbac)

## 2.1.7 (2023-10-10)

### Improvements

- Only add output package.json if output type and package type mismatch. (37e1a1f)

## 2.1.6 (2023-10-07)

### Chores

- Add start alias to the build command. (81e22c9)

## 2.1.5 (2023-10-04)

### Improvements

- Add support for vite-plugin-rewrite-all. (47e10d7)

## 2.1.4 (2023-09-29)

### Bug Fixes

- Incorrect package github urls. (35b2a89)

## 2.1.3 (2023-09-28)

### Documentation

- Major rewrite of the readme files. (19021fe)

## 2.1.2 (2023-09-26)

### Notes

- Updated local dependencies.

## 2.1.1 (2023-09-26)

### Notes

- Updated local dependencies.

## 2.1.0 (2023-09-26)

### Features

- Update for CLI changes. (01eeb5f)

## 2.0.10 (2023-09-22)

### Improvements

- Handle no entrypoints better. (22b1bc2)

## 2.0.9 (2023-09-22)

### Notes

- Updated local dependencies.

## 2.0.8 (2023-09-22)

### Improvements

- Add &#96;--vite&#96; and &#96;--abort-on-failure&#96; options. (9fef75d)

## 2.0.7 (2023-09-21)

### Improvements

- Throw an error when typescript and vite-plugin-checker are installed, but no tsconfig exists in the workspace. (7d36b01)

## 2.0.6 (2023-09-21)

### Improvements

- Ignore vite react plugin warning about module level directives like (eg. "use client"). (228ca77)

## 2.0.5 (2023-09-21)

### Improvements

- Add optional &#96;vite-plugin-checker&#96; support for typescript and eslint. (2a60c22)

## 2.0.4 (2023-09-21)

### Chores

- Remove chmod and shebang insertion for bin entrypoints. (f7f4d79)

## 2.0.3 (2023-09-20)

### Improvements

- Add vite-plugin-bin support. (51b951f)

## 2.0.2 (2023-09-20)

### Improvements

- Add shebang and executable bit to bin file outputs. (9ec1fa3)

## 2.0.1 (2023-09-19)

### Bug Fixes

- Vite build failed in package type "commonjs" workspaces. (49c7ab9)

### Improvements

- Enable vite build target esnext. (0780aeb)

# 2.0.0 (2023-09-19)

### Breaking Changes

- Require optional vite plugins to be workspace dev dependencies. (b82cd45)

## 1.3.5 (2023-09-19)

### Improvements

- Detect and use actual vite library mode entrypoints from package.json. (6f039c6)
- More logging in the vite configuration file. (e01e982)
- Bundle dev dependencies when modules are not preserved. (2727a40)
- Copy dts files in library mode. (8c9c16f)
- Support multiple library mode entrypoints. (9b68000)
- Only warn when package entrypoints are missing after building. (be509b9)

## 1.3.4 (2023-09-19)

### Improvements

- Support bundling in library mode. (7847c49)

## 1.3.3 (2023-09-19)

### Bug Fixes

- Remove unnecessary &#96;root&#96; from vite-plugin-dts options. (2880bc6)

### Improvements

- Detect vite based on &#96;vite&#96; dev dependency, so that an &#96;index.html&#96; file is not necessary for library mode. (0a18912)
- Allow plugins to be disabled when extending the build-in configuration. (c424111)

## 1.3.2 (2023-09-19)

### Improvements

- Simplify vite optional plugins. (08e345d)

### Code Refactoring

- Directory structure. (c94eccb)

## 1.3.1 (2023-09-18)

**Note**: Updated local dependencies.

## 1.3.0 (2023-09-18)

### Features

- Allow extending the built-in vite configuration by importing '@werk/command-build/vite-config' in a custom vite config file. (bd35225)

## 1.2.1 (2023-09-17)

**Note**: Updated local dependencies.

## 1.2.0 (2023-09-17)

### Features

- Updates for the new CLI version. (ad5a6f9)

## 1.1.34 (2023-09-13)

### Bug Fixes

- Regexp problems exposed by new linter rules. (9d7274f)

## 1.1.33 (2023-09-13)

### Bug Fixes

- Always use explicit spawn cwd. (0656a47)

## 1.1.32 (2023-09-12)

**Note**: Updated local dependencies.

## 1.1.31 (2023-09-12)

### Chores

- Avoid infinite build script recursion. (bb28be5)

## 1.1.30 (2023-09-11)

### Bug Fixes

- Don't display optional plugin warning when using custom config. (699742d)

### Chores

- Update vite-plugin-refresh. (a63873c)

## 1.1.29 (2023-09-11)

### Bug Fixes

- Lint error. (589078a)

## 1.1.28 (2023-09-11)

### Chores

- Use vite-plugin-refresh if available. (f934201)

## 1.1.27 (2023-09-11)

### Code Refactoring

- Remove vite-plugin-full-reload, replaced with custom solution. Use vite config merging. Move optional plugin warnings out of vite config. (4906c28)

## 1.1.26 (2023-09-09)

### Chores

- Add warnings when optional dependencies are not installed. (d86135d)

## 1.1.25 (2023-09-09)

### Documentation

- Update readme. (37e2f2e)

## 1.1.24 (2023-09-08)

### Chores

- Add SVG-to-JSX (SVGR) support to default vite config. (40513fe)

## 1.1.23 (2023-09-08)

### Bug Fixes

- Disable Vite emptying output directory when running in watch mode. (c569212)

## 1.1.22 (2023-09-08)

### Bug Fixes

- Remove invalid &#96;--host&#96; option in Vite library watch mode. (4269e69)

### Chores

- Add --watch alias for --start option. (4aaf813)

## 1.1.21 (2023-09-08)

### Bug Fixes

- Match external packages with sub-path imports. (429bc39)

## 1.1.20 (2023-09-08)

### Bug Fixes

- Remove rollup-plugin-node-externals because it doesn't work as configured and is unnecessary. (c0e1641)

## 1.1.19 (2023-09-07)

### Bug Fixes

- Add src/&#42;&#42; to package files for default vite config imports. (39e253a)

## 1.1.18 (2023-09-07)

### Bug Fixes

- Fix rootDir if tsconfig exists, but does not have a rootDir configured. (8d62d42)

## 1.1.17 (2023-09-07)

### Chores

- Vite library mode improvements. (09950df)

## 1.1.16 (2023-08-31)

**Note**: Updated local dependencies.

## 1.1.15 (2023-08-31)

**Note**: Updated local dependencies.

## 1.1.14 (2023-08-30)

### Chores

- Create temp files under node&#95;modules. (9175022)

## 1.1.13 (2023-08-24)

### Chores

- Use module=ESNext for auto esm builds. (6c9b934)

## 1.1.12 (2023-08-24)

### Bug Fixes

- Automatic TSC CommonJS build failing after updating Typescript to 5.2.x. (70f1e01)

## 1.1.11 (2023-08-24)

### Chores

- Update deps. (751ae09)

## 1.1.10 (2023-08-23)

**Note**: Updated local dependencies.

## 1.1.9 (2023-08-09)

**Note**: Updated local dependencies.

## 1.1.8 (2023-07-21)

### Bug Fixes

- Error if workspace entry points are missing after build. (44689fa)

### Chores

- Add description to &#96;--start&#96; option. (d268e13)

## 1.1.7 (2023-07-14)

**Note**: Updated local dependencies.

## 1.1.6 (2023-07-14)

**Note**: Updated local dependencies.

## 1.1.5 (2023-07-12)

**Note**: Updated local dependencies.

## 1.1.4 (2023-07-12)

**Note**: Updated local dependencies.

## 1.1.3 (2023-06-29)

### Bug Fixes

- Default config files not included in package. (746a99e)

## 1.1.2 (2023-06-29)

### Bug Fixes

- Script mode runs wrong script (build and start switched). (bba61c4)

## 1.1.1 (2023-06-29)

### Bug Fixes

- Only build if the package has at an entry point. (f57a88a)

## 1.1.0 (2023-06-27)

### Features

- **cli:** Add command &#96;packageManager&#96; requirement. (e8517c3)

### Code Refactoring

- **cli:** Make command &#96;packageManager&#96; property optional. (bde8365)

## 1.0.3 (2023-06-26)

**Note**: Updated local dependencies.

## 1.0.2 (2023-06-26)

**Note**: Updated local dependencies.

## 1.0.1 (2023-06-26)

**Note**: Updated local dependencies.

# 1.0.0

Initial release
