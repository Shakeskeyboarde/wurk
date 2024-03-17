# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.1.5 (2024-03-16)

### Bug Fixes

- publish skipped if any previous version was published (already published) (05b4487)
- workspace protocol support and publish validation (cde77b4)
- publish from filesystem (157b748)
- require explicit directories for git commands (daba51f)
- improve error message when dependency Git head does not match published head (b90d15a)
- publish warnings that should be errors (c83aac0)

### Code Refactoring

- publish and package managers (0214924)
- command test to vitest (e496345)

### Chores

- improve publish logging (7775bd4)
- remove yarn classic support stub (ca50823)
- made it easier to support different package managers (1b172dd)
- Simplify workspace selection. (b22f564)
- simplify spawn stdio options (6e38e84)
- better comment on npm pack output json handling (1500d62)
- remove pre-publish and pre-test auto building (a682e29)
- remove (skipped) suffix on log messages (1b025ac)
- remove status mechanism (79c8d5c)
- remove @wurk/fs and use Node's fs core lib directly (7d3d6a0)
- updated linting (153c8b1)
- just hacking on all the things (d20dcfc)
- add build scripts to command packages (d44abd0)

## 0.1.4 (2024-03-05)

### Notes

- local dependencies updated (wurk)

## 0.1.3 (2024-03-04)

### Notes

- local dependencies updated (wurk)

## 0.1.2 (2024-03-04)

### Improvements

- **fs:** resolve temp prefix against os temp dir instead of joining, allowing for local temp dirs (4c9a687)

### Notes

- local dependencies updated (wurk)

## 0.1.1 (2024-03-04)

### Bug Fixes

- incorrectly print changelog outdated message (fe52c08)

### Notes

- local dependencies updated (wurk)

## 0.1.0

Initial release
