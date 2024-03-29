# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.4.0 (2024-03-21)

Release candidate.

## 0.1.7 (2024-03-21)

### Code Refactoring

- exports to better support doc generation (05260f2)

### Documentation

- add/update doc comments on all the exported things (62184d4)

## 0.1.6 (2024-03-19)

### Bug Fixes

- **help:** line wrapping was not working (c406b8b)

## 0.1.5 (2024-03-19)

### Bug Fixes

- **error:** CliUsageError should inherit error message from cause (be0f9b0)
- named variadic parser input type should be a string, not a string array (10ffef3)

## 0.1.4 (2024-03-18)

### Bug Fixes

- broken tests (27088b5)

### Documentation

- add changelog note for 0.1.3 (67e358c)

### Chores

- named options should consume at most one trailing positional argument when variadic (d59bfad)

## 0.1.3 (2024-03-16)

Bumping because 0.1.2 was accidentally released using NPM which published the wrong gitHead metadata.

## 0.1.2 (2024-03-16)

### Bug Fixes

- accidentally removed reduce callback (6d67b78)

### Code Refactoring

- command test to vitest (e496345)

### Chores

- Simplify workspace selection. (b22f564)
- simplify cli options (ebb65e3)
- updated linting (153c8b1)
- just hacking on all the things (d20dcfc)

## 0.1.1 (2024-03-05)

### Documentation

- add very simple getting started section to readme (fb3b18d)

## 0.1.0

Initial release.
