## 1.4.7 (2023-08-23)

**Note**: Updated local dependencies.

## 1.4.6 (2023-08-09)

### Bug Fixes

- Make sure the changelog was updated in the last &#95;directory&#95; commit, not the current repo HEAD commit. (22899a3)

## 1.4.5 (2023-07-14)

**Note**: Updated local dependencies.

## 1.4.4 (2023-07-14)

**Note**: Updated local dependencies.

## 1.4.3 (2023-07-12)

### Bug Fixes

- Incorrect message for shallow Git checkouts. (c263960)

## 1.4.2 (2023-07-12)

**Note**: Updated local dependencies.

## 1.4.1 (2023-07-12)

### Bug Fixes

- Error on shallow Git checkout. (735dafb)

### Chores

- Update deps. (84c3823)

## 1.4.0 (2023-06-27)

### Features

- **cli:** Add command &#96;packageManager&#96; requirement. (e8517c3)

### Code Refactoring

- **cli:** Make command &#96;packageManager&#96; property optional. (bde8365)
- Skip publishing if change log is not updated or local dependencies are outdated. (09ecaba)
- Re-add automatic building. (6bdccdb)

## 1.3.0 (2023-06-26)

### Features

- Add package file list validation step. (b9567f8)

## 1.2.16 (2023-06-26)

**Note**: Updated local dependencies.

## 1.2.15 (2023-06-26)

**Note**: Updated local dependencies.

## 1.2.14 (2023-06-26)

### Chores

- remove unnecessary &#96;main&#96; fields from package.json files (a65b2a1)

## 1.2.13 (2023-06-23)

**Note**: Updated local dependencies.

## 1.2.12 (2023-06-22)

### Chores

- remove unnecessary tsconfig.json files (f9f9a7d)

## 1.2.11 (2023-06-22)

### Documentation

- add Werk badge to each command's README (21628f2)

## 1.2.10 (2023-06-22)

**Note**: Updated local dependencies.

## 1.2.9 (2023-06-22)

### Chores

- minor update to dependencies (637b2ee)

## 1.2.8 (2023-06-21)

### Chores

- add "main" and "types" fields to package.json files so NPM shows the typescript badge (998de98)

## 1.2.7 (2023-06-21)

### Code Refactoring

- use workspace getGitIsClean and getIsModified recursion feature (1216811)

## 1.2.6 (2023-06-21)

### Documentation

- fixing npm badges (06fcbce)

## 1.2.5 (2023-06-21)

### Bug Fixes

- validate that dependencies are clean (4548d9a)

### Code Refactoring

- cleanup git validation (1e1b7e5)
- git status validation (d9b744e)
- log after validation (85700a4)

## 1.2.4 (2023-06-20)

### Documentation

- add npm badges (3bdccc6)

## 1.2.3 (2023-06-20)

### Bug Fixes

- no build when publishing from archive (e1e010e)
- only print publish message when actually publishing (6f53d5e)

### Build System

- add build config (6a6fa1a)

### Chores

- minor dependency updates (ab53f91)

## 1.2.2 (2023-06-20)

**Note:** Updated local dependencies.

## 1.2.1 (2023-06-20)

### Bug Fixes

- build root, not individual workspaces (6b5e432)

## 1.2.0 (2023-06-20)

### Features

- run build before packing or publishing from the filesystem (32486c1)

### Build System

- switch to using tsc command (fbc8e83)

### Chores

- add notice messaging. (4318eb4)

## 1.1.3 (2023-06-19)

**Note:** Updated local dependencies.

## 1.1.2 (2023-06-19)

**Note:** Updated local dependencies.

## 1.1.1 (2023-06-19)

**Note:** Updated local dependencies.

## 1.1.0 (2023-06-18)

### Features

- **cli:** before hook can return an array of matrix values to run the each hook more than once. (da6952a)

## 1.0.10 (2023-06-17)

**Note:** Updated local dependencies.

## 1.0.9 (2023-06-16)

**Note:** Updated local dependencies.

## 1.0.8 (2023-06-16)

**Note:** Updated local dependencies.

## 1.0.7 (2023-06-14)

**Note:** Updated local dependencies.

## 1.0.6 (2023-06-14)

### Build System

- include change log in packages (1e237ea)
- clean lib before build (5ef2b5f)

## 1.0.5 (2023-06-14)

### Code Refactoring

- removed package.json &#96;werk.gitHead&#96; metadata (b13da72)

## 1.0.4 (2023-06-14)

### Bug Fixes

- publish dry-run ENOENT (9de4600)

## 1.0.3 (2023-06-14)

### Bug Fixes

- use temp directory when publishing archives (fcbc8cc)

## 1.0.2 (2023-06-14)

**Note:** No significant changes.

## 1.0.1 (2023-06-14)

### Features

- add tag option to publish (43da937)

### Bug Fixes

- npm seems to remove gitHead from the archive package.json (ffea09e)

# 1.0.0

Initial release
