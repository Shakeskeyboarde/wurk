# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.1.4 (2024-03-16)

### Bug Fixes

- workspace protocol support and publish validation (cde77b4)
- publish from filesystem (157b748)
- importRelative&#42; can return null (10a9f18)

### Improvements

- workspace link generation, env handling, and other incidentals (5879942)

### Code Refactoring

- publish and package managers (0214924)

### Chores

- Simplify workspace selection. (b22f564)
- remove status mechanism (79c8d5c)
- remove @wurk/fs and use Node's fs core lib directly (7d3d6a0)
- updated linting (153c8b1)
- just hacking on all the things (d20dcfc)
- normalizing workspace terminology (6b1f632)

## 0.1.3 (2024-03-04)

### Notes

- local dependencies updated (@wurk/log, @wurk/spawn)

## 0.1.2 (2024-03-04)

### Bug Fixes

- spawn relative cwd should be resolved relative to the workspace dir (ecbf805)

### Notes

- local dependencies updated (@wurk/fs, @wurk/import, @wurk/spawn)

## 0.1.1 (2024-03-04)

### Bug Fixes

- incorrectly detecting workspace head (1a8a4d6)

### Notes

- local dependencies updated (@wurk/log, @wurk/spawn)

## 0.1.0

Initial release
