## 1.2.4 (2023-06-21)

### Documentation

- fixing npm badges (06fcbce)

## 1.2.3 (2023-06-21)

### Bug Fixes

- get local dependencies includes transitive (85f4848)
- error if git shallow (1b242bd)

### Code Refactoring

- **modified:** use assert instead of throw (4d709d8)
- get local dependencies always honors versions (d3e2c60)

### Chores

- **workspace:** filter out falsy package.json patches (3f26ac4)

## 1.2.2 (2023-06-20)

### Chores

- major dependency updates (829782a)
- minor dependency updates (ab53f91)

## 1.2.1 (2023-06-20)

### Documentation

- update official packages lists (0e5dd2b)

## 1.2.0 (2023-06-20)

### Features

- add workspace.scripts field (0411055)
- add context.root workspace reference (aafecb3)

### Bug Fixes

- npm metadata error when only one version published (e886551)

## 1.1.4 (2023-06-20)

### Bug Fixes

- per workspace config from correct package.json path (2dfddbd)

### Documentation

- add NPM badge to readme (cad01d0)

### Chores

- log notice bright instead of bold (e9d550f)
- flatten config structure (17584a8)
- add workspace.config (74c0150)

## 1.1.3 (2023-06-19)

### Chores

- use the most recent (by version) gitHead if the current version is unpublished or doesn't have a gitHead (17cd5ce)

## 1.1.2 (2023-06-19)

### Chores

- add per-command config support (6652a9a)

## 1.1.1 (2023-06-19)

### Bug Fixes

- incorrect werk bin (db08a3f)

## 1.1.0 (2023-06-18)

### Features

- before hook can return an array of matrix values to run the each hook more than once. (da6952a)

### Bug Fixes

- **log:** calling spawn twice with the same log and the echo option enabled caused the log streams to throw errors. (ed69101)

## 1.0.9 (2023-06-17)

### Code Refactoring

- **cli:** default to cpus+1 concurrency when parallel (09c1c62)

## 1.0.8 (2023-06-16)

### Bug Fixes

- log level handling (c69cdb6)
- restore files should happen after cleanup and on exit (5b1793a)

### Chores

- add logging (783a673)

## 1.0.7 (2023-06-16)

### Bug Fixes

- **cli:** allow workspace paths and throw if a workspace doesn't exist. (2ce9e18)

## 1.0.6 (2023-06-14)

### Bug Fixes

- **cli:** --git-head should only provide a default, not an override. (d92247e)

### Documentation

- **cli:** readme correction (11faa97)

## 1.0.5 (2023-06-14)

### Build System

- include change log in packages (1e237ea)
- clean lib before build (5ef2b5f)

## 1.0.4 (2023-06-14)

### Bug Fixes

- cli description (a9c0040)

### Code Refactoring

- removed package.json &#96;werk.gitHead&#96; metadata (b13da72)

### Documentation

- fix work->werk typo (cc53fac)

## 1.0.3 (2023-06-14)

### Code Refactoring

- spawn enhancements (265db84)

## 1.0.2 (2023-06-14)

**Note:** No significant changes.

## 1.0.1 (2023-06-14)

### Bug Fixes

- npm seems to remove gitHead from the archive package.json (ffea09e)

# 1.0.0

Initial release
