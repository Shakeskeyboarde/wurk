# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.2.0 (2024-03-18)

This is just a test note.

This is another test note,
with multiple lines.

### Features

- add --note CLI option (5f7b1f5)

### Bug Fixes

- changelog update should replace the current unpublished entry as well as any entry for the updated version (241e427)
- ignore blank notes (6b3144b)

### Improvements

- log warning if --note option is used when changelogs are disabled (bf0c77c)
- handle changelog notes (7bc260a)
- version should keep already incremented versions and rewrite changelog if necessary (41083fc)
- always use h2 for changelog version headings, and h3 for change groups (a940a83)

### Chores

- remove "note" change type (667f1df)

## 0.1.6 (2024-03-16)

### Bug Fixes

- not writing changelog (1501bf6)
- publish skipped if any previous version was published (already published) (05b4487)
- workspace protocol support and publish validation (cde77b4)
- only run npm update after versioning if the package manager is npm. (a471b67)
- incorrect version commit message (0e91d3d)
- version command tried to modify immutable json accessor (e66547c)
- require explicit directories for git commands (daba51f)
- publish warnings that should be errors (c83aac0)

### Improvements

- workspace link generation, env handling, and other incidentals (5879942)
- spawning (c530730)

### Chores

- Simplify workspace selection. (b22f564)
- simplify spawn stdio options (6e38e84)
- remove status mechanism (79c8d5c)
- remove @wurk/fs and use Node's fs core lib directly (7d3d6a0)
- updated linting (153c8b1)
- just hacking on all the things (d20dcfc)

## 0.1.5 (2024-03-05)

### Improvements

- remove dependency syncing from the version command (overly complex) (8f65aea)

## 0.1.4 (2024-03-05)

### Notes

- local dependencies updated (wurk)

## 0.1.3 (2024-03-04)

### Notes

- local dependencies updated (wurk)

## 0.1.2 (2024-03-04)

### Notes

- local dependencies updated (wurk)

## 0.1.1 (2024-03-04)

### Bug Fixes

- incorrect versions in suggested commit message (d51b4a0)

### Notes

- local dependencies updated (wurk)

## 0.1.0

Initial release
