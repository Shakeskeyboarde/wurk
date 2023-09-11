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
