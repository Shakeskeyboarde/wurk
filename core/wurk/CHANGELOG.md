# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.4.3 (2024-03-22)

### Documentation

- readme improvements (da54295)

## 0.4.2 (2024-03-21)

### Chores

- update node requirement to 20 (04dffb0)

## 0.4.1 (2024-03-21)

### Documentation

- readme typo (dff16fe)

## 0.4.0 (2024-03-21)

Release candidate.

## 0.1.14 (2024-03-21)

### Code Refactoring

- exports to better support doc generation (05260f2)

### Documentation

- add/update doc comments on all the exported things (62184d4)

## 0.1.13 (2024-03-19)

Dependencies updated.

## 0.1.12 (2024-03-19)

### Improvements

- don't log package manager "run" command (ef9b212)

## 0.1.11 (2024-03-19)

### Code Refactoring

- rewrap some long string literals (a93413f)

## 0.1.10 (2024-03-19)

### Improvements

- cli usage error if filter expressions are invalid (e3a44ae)

### Code Refactoring

- small type simplifications made possible by @wurk/cli update (d5a4791)

### Documentation

- readme updates (411825b)

### Chores

- move the --delay-each-workspace option from the run command to (9c9b3e1)

## 0.1.9 (2024-03-18)

### Chores

- disallow plugin commands setting themselves as default (cb0a039)

## 0.1.8 (2024-03-18)

### Documentation

- fix changelog heading levels (7ad1e83)
- Add note about PNPM and Yarn dedupe for command resolution (d3c9c3a)
- update motivation readme (090ee5a)

## 0.1.7 (2024-03-18)

### Improvements

- handle yarn special case better, only spawning an extra node process if necessary, and handling errors more correctly (0f18257)

## 0.1.6 (2024-03-16)

### Bug Fixes

- workspace protocol support and publish validation (cde77b4)
- getPublished accepts a version, not a version range (ca081e0)
- publish warnings that should be errors (c83aac0)

### Improvements

- workspace link generation, env handling, and other incidentals (5879942)
- spawning (c530730)

### Code Refactoring

- publish and package managers (0214924)
- command test to vitest (e496345)

### Documentation

- updated motivation readme (829326a)
- update motivation info about pnpm (23a411f)

### Chores

- theoretical support for pnpm and yarn (9d118bd)
- remove yarn classic support stub (ca50823)
- made it easier to support different package managers (1b172dd)
- Simplify workspace selection. (b22f564)
- simplify spawn stdio options (6e38e84)
- simplify cli options (ebb65e3)
- remove status mechanism (79c8d5c)
- remove @wurk/fs and use Node's fs core lib directly (7d3d6a0)
- updated linting (153c8b1)
- just hacking on all the things (d20dcfc)
- normalizing workspace terminology (6b1f632)
- updates for @wurk/import changes (69d3a6f)

## 0.1.5 (2024-03-05)

### Documentation

- update version command terminology (9dc0a82)

## 0.1.4 (2024-03-05)

### Notes

- local dependencies updated (@wurk/cli)

## 0.1.3 (2024-03-04)

### Notes

- local dependencies updated (@wurk/log, @wurk/spawn, @wurk/workspace)

## 0.1.2 (2024-03-04)

### Chores

- only allow tsc builder to find config (tsconfig&#42;.json) files in the src directory (34c31d3)

### Notes

- local dependencies updated (@wurk/fs, @wurk/import, @wurk/spawn, @wurk/workspace)

## 0.1.1 (2024-03-04)

### Bug Fixes

- use locally installed instance (675e74e)

### Notes

- local dependencies updated (@wurk/log, @wurk/spawn, @wurk/workspace)

## 0.1.0

Initial release
