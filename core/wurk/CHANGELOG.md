# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
