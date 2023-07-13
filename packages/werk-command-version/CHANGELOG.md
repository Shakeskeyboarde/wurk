## 1.3.4 (2023-07-12)

**Note**: Updated local dependencies.

## 1.3.3 (2023-07-12)

### Chores

- Update deps. (84c3823)

## 1.3.2 (2023-07-05)

### Code Refactoring

- Use null chars for log separators instead of arbitrary unicode chars. (441695d)

## 1.3.1 (2023-06-27)

### Bug Fixes

- Prevent bump to non-prerelease version. (c2f8f6c)

## 1.3.0 (2023-06-27)

### Features

- **cli:** Add command &#96;packageManager&#96; requirement. (e8517c3)

### Code Refactoring

- **cli:** Make command &#96;packageManager&#96; property optional. (bde8365)

## 1.2.8 (2023-06-26)

**Note**: Updated local dependencies.

## 1.2.7 (2023-06-26)

**Note**: Updated local dependencies.

## 1.2.6 (2023-06-26)

**Note**: Updated local dependencies.

## 1.2.5 (2023-06-26)

### Chores

- remove unnecessary werk.tsc.config from package.json files (80f02f1)
- remove unnecessary &#96;main&#96; fields from package.json files (a65b2a1)

## 1.2.4 (2023-06-23)

**Note**: Updated local dependencies.

## 1.2.3 (2023-06-22)

### Chores

- remove unnecessary tsconfig.json files (f9f9a7d)

## 1.2.2 (2023-06-22)

### Documentation

- add Werk badge to each command's README (21628f2)

## 1.2.1 (2023-06-22)

**Note**: Updated local dependencies.

## 1.2.0 (2023-06-22)

### Features

- add --note option (95a5f63)

### Bug Fixes

- **changelog:** change log entry deduplication not matching correctly (1a8fc2b)
- **changelog:** skip versioning if all changes are omitted as duplicates (831e2a7)

### Code Refactoring

- update change hash handling (c6f1cf5)

**Note**: You can add notes now.

## 1.1.0 (2023-06-22)

### Features

- **changelog:** skip duplicate change log entries when the previous version is unpublished (b7fefe9)

## 1.0.26 (2023-06-21)

### Chores

- add "main" and "types" fields to package.json files so NPM shows the typescript badge (998de98)

## 1.0.25 (2023-06-21)

### Code Refactoring

- use workspace getGitIsClean recursion feature (949f0b6)

## 1.0.24 (2023-06-21)

### Documentation

- fixing npm badges (06fcbce)

## 1.0.23 (2023-06-21)

### Bug Fixes

- ignore uncommitted changes made by versioning dependencies (ccf0abb)
- **auto:** assert dependencies clean (30260c9)

## 1.0.22 (2023-06-20)

### Documentation

- add npm badges (3bdccc6)

## 1.0.21 (2023-06-20)

### Chores

- minor dependency updates (ab53f91)

## 1.0.20 (2023-06-20)

**Note:** Updated local dependencies.

## 1.0.19 (2023-06-20)

**Note:** Updated local dependencies.

## 1.0.18 (2023-06-20)

### Bug Fixes

- info log should be notice (911bc34)

### Build System

- switch to using tsc command (fbc8e83)

### Chores

- include from and to version in logs (77b838a)
- cleanup version usage (5f311d1)
- add notice messaging (3721bf2)

## 1.0.17 (2023-06-19)

**Note:** Updated local dependencies.

## 1.0.16 (2023-06-19)

**Note:** Updated local dependencies.

## 1.0.15 (2023-06-19)

**Note:** Updated local dependencies.

## 1.0.14 (2023-06-18)

### Bug Fixes

- **auto:** feature and breaking change not bumping the version correctly (e3ad11b)

## 1.0.13 (2023-06-17)

### Chores

- **changelog:** omit scopes that match all or part of the workspace name. (d256af3)

## 1.0.12 (2023-06-17)

### Chores

- warn on auto version with non-conventional commits. (1b84df3)

## 1.0.11 (2023-06-17)

**Note:** Updated local dependencies.

## 1.0.10 (2023-06-16)

**Note:** Updated local dependencies.

## 1.0.9 (2023-06-16)

**Note:** Updated local dependencies.

## 1.0.8 (2023-06-14)

**Note:** Updated local dependencies.

## 1.0.7 (2023-06-14)

### Bug Fixes

- **version:** shouldn't skip private by default (a06ec71)

### Documentation

- correction to version command readme (ebda41d)

## 1.0.6 (2023-06-14)

### Build System

- include change log in packages (1e237ea)
- clean lib before build (5ef2b5f)

## 1.0.5 (2023-06-14)

**Note:** Updated local dependencies.

## 1.0.4 (2023-06-14)

**Note:** Updated local dependencies.

## 1.0.3 (2023-06-14)

### Bug Fixes

- don't auto version if no conventional commit messages are present. (29056ca)
- run npm update after versioning to sync the package lock. (c6a7ace)

### Code Refactoring

- add a placeholder changelog on non-auto version updates. (636aa27)

## 1.0.2 (2023-06-14)

### Bug Fixes

- version range prefix not being applied by versioning (ef03cf2)

## 1.0.1 (2023-06-14)

### Bug Fixes

- **version:** not keeping caret ^ range in dependency updates. (edfcf29)
- changelog headings incorrect (84fe50b)
- local dependency changelog message contains undefined hash (c816640)

# 1.0.0

Initial release
