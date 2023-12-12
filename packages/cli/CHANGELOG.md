## 9.2.2 (2023-12-12)

### Improvements

- Add &#96;--this-workspace&#96; option. (ab6b912)

## 9.2.1 (2023-12-09)

### Bug Fixes

- Unused dependency. (39bd445)
- Log prefix coloring should include the trailing colon. (891ce36)

### Improvements

- Add &#96;--clear&#96; option. (df5e0da)

## 9.2.0 (2023-12-09)

### Features

- Improve/refactor logging. (f6df775)

## 9.1.4 (2023-12-08)

### Bug Fixes

- Incorrect summary status (pending should be failure). (f8f0a29)

### Improvements

- Logging. (0101607)

### Chores

- Update deps. (ecc22fa)

## 9.1.3 (2023-12-07)

### Bug Fixes

- Recursion should be blocked per command. (0abd84c)

## 9.1.2 (2023-12-07)

### Improvements

- Allow nested arrays in spawn args. (d86d3c7)

## 9.1.1 (2023-12-06)

### Bug Fixes

- Summary should be printed to stderr. (a02ad34)

### Chores

- Logged notices should not be colored. (48b7692)

## 9.1.0 (2023-12-06)

### Features

- Add workspace status and command summary. (90a64c9)

### Bug Fixes

- Shouldn't fail on saveAndRestore if file doesn't exist. (303f509)

### Improvements

- Add ansi reset at the end of log messages as a precaution against dangling styles. (24908d2)
- Allow log messages to contain ansi colors. (59df362)
- saveAndRestore is a no-op if the path has already been saved. (fffa987)

### Chores

- Rename log.write to log.print. (b78e0b7)

## 9.0.5 (2023-12-05)

### Bug Fixes

- Git ignored files should be relative to the workspace directory.Ï (26fb8db)

### Documentation

- Add clean to official plugins list. (f44e0e1)

## 9.0.4 (2023-12-05)

### Improvements

- Add workspace &#96;clean()&#96; and &#96;getGitIgnored()&#96; methods. (2a533fb)
- Prevent Werk from running itself. (222a3c1)

## 9.0.3 (2023-12-04)

### Bug Fixes

- **version:** Commander passThroughOptions should not be set. (17d772a)

### Improvements

- Allow 'debug' log level alias for 'verbose'. (3c5e7a2)

## 9.0.2 (2023-11-21)

### Bug Fixes

- **cli,build,publish:** Add missing typescript declarations. (da5fe66)

### Chores

- Update deps. (f10dddf)

## 9.0.1 (2023-11-21)

### Improvements

- Add &#96;LICENSE&#96; file to workspace entrypoints. (4d2f689)

# 9.0.0 (2023-11-19)

### Breaking Changes

- Remove --git-head command line option. The current head cannot be overridden. (d3ffcff)

## 8.0.7 (2023-11-17)

### Chores

- Update deps. (a4edbac)

## 8.0.6 (2023-10-10)

### Bug Fixes

- Ignore entrypoints with wildcards. (1662c9a)

## 8.0.5 (2023-09-29)

### Documentation

- Add depcheck command to official command lists. (b16a401)

### Chores

- Remove unused deps. (59f3da8)

## 8.0.4 (2023-09-29)

### Documentation

- Readme updates. (b1de209)

## 8.0.3 (2023-09-28)

### Documentation

- Major rewrite of the readme files. (19021fe)

## 8.0.2 (2023-09-26)

### Bug Fixes

- Prefer direct over transitive in local references. (41e578a)

## 8.0.1 (2023-09-26)

### Bug Fixes

- Bug in local dependency enumeration. (57c5ba1)

# 8.0.0 (2023-09-26)

### Breaking Changes

- Major refactoring and selection options simplification. (39d52e3)

## 7.0.5 (2023-09-22)

### Chores

- Fix broken readme links. (e6a21ff)

## 7.0.4 (2023-09-21)

### Code Refactoring

- Improvements to importRelative. (f042e64)

## 7.0.3 (2023-09-19)

### Bug Fixes

- Export EntryPoint type. (378f1fb)

## 7.0.2 (2023-09-19)

### Improvements

- Add workspace.getMissingEntryPoints method. (2be8daa)

## 7.0.1 (2023-09-19)

### Improvements

- **build:** Detect vite based on &#96;vite&#96; dev dependency, so that an &#96;index.html&#96; file is not necessary for library mode. (0a18912)

# 7.0.0 (2023-09-19)

### Breaking Changes

- Removed all but the command package mapping configuration from package.json files. (e6547e4)

### Improvements

- Support importRelative() type casting. (db2e9a3)

## 6.0.3 (2023-09-18)

### Improvements

- Make a suggestion when a partial command match is ambiguous. (77f3188)

## 6.0.2 (2023-09-18)

### Bug Fixes

- Shouldn't use require.resolve to import plugins relatively. (f6b6f01)

## 6.0.1 (2023-09-17)

### Improvements

- Add partial command name matching. (ec95902)

# 6.0.0 (2023-09-17)

### Breaking Changes

- Detect, load, and configure all commands, instead of only the command entered in the command line. (a293ae8)

## 5.0.1 (2023-09-13)

### Bug Fixes

- Regexp problems exposed by new linter rules. (9d7274f)

# 5.0.0 (2023-09-13)

### Breaking Changes

- Always use root workspace (repo root) directory for context.spawn default working directory. (716a5cb)

## 4.0.1 (2023-09-12)

### Documentation

- Improve Werk description. (ac2b969)

# 4.0.0 (2023-09-12)

### Breaking Changes

- Remove support for globally installed command plugins. (e70567b)

### Chores

- Support non-mono-repos. (1b4a5e5)
- Improve PackageJson type safety. (4f66efb)

## 3.0.2 (2023-09-07)

### Chores

- Update deps. (d1dd514)

## 3.0.1 (2023-08-31)

### Chores

- Change --log-level option to --loglevel to match NPM. (174f2f6)
- Add additional messaging when Werk commands cannot be loaded. (bbb1ac3)

# 3.0.0 (2023-08-31)

### Breaking Changes

- Workspace getIsModified method no longer checks dependencies. (362a6c3)

## 2.0.2 (2023-08-31)

### Documentation

- Prefer block comments for multiline. (91ae520)

## 2.0.1 (2023-08-30)

### Chores

- Create temp files under node&#95;modules. (9175022)

# 2.0.0 (2023-08-23)

### Breaking Changes

- Changed --with-dependencies to --no-dependencies. (92b0a29)

## 1.7.2 (2023-08-09)

### Bug Fixes

- Add workspace getGitLastChangeCommit method. (bafd8a1)

## 1.7.1 (2023-07-14)

### Bug Fixes

- **log:** Don't add extra line endings (ever). (309d14d)

## 1.7.0 (2023-07-14)

### Features

- Add &#96;isParallel&#96; to each context. (0261fa0)

## 1.6.2 (2023-07-12)

**Note**: Updated to version "1.6.2".

## 1.6.1 (2023-07-12)

### Bug Fixes

- **publish:** Error on shallow Git checkout. (735dafb)

### Chores

- Update deps. (84c3823)

## 1.6.0 (2023-06-27)

### Features

- Add command &#96;packageManager&#96; requirement. (e8517c3)

### Code Refactoring

- Make command &#96;packageManager&#96; property optional. (bde8365)
- **publish:** Skip publishing if change log is not updated or local dependencies are outdated. (09ecaba)

## 1.5.3 (2023-06-26)

### Bug Fixes

- **workspace:** Entry point filenames should be absolute. (8f7f785)

### Code Refactoring

- **workspace:** Rename workspace entry point &#96;pattern&#96; field to &#96;filename&#96;. (fe7e6fa)
- **workspace:** Remove &#96;files&#96; from the workspace class and &#96;getIsBuilt&#96; check. (6f05def)

## 1.5.2 (2023-06-26)

### Code Refactoring

- **workspace:** getIsBuilt shouldn't treat all entry points as globs (only files). (df95c48)

## 1.5.1 (2023-06-26)

### Documentation

- Replace tsc with build command in readme files. (172ebfa)

## 1.5.0 (2023-06-26)

### Features

- **workspace:** Add package entry point properties and helper methods. (291054e)

### Code Refactoring

- Context and Log no longer support destruction (a74ed2f)
- **workspace:** Add entry point fields from each workspace package.json (eedd10d)
- **log:** separate log prefix from prefix formatting (9ffaa0d)
- **workspace:** add &#96;type&#96; from package.json (acc80e5)

### Documentation

- **workspace:** fix incorrect doc comment on the workspace.config property (80788e1)

## 1.4.2 (2023-06-23)

### Bug Fixes

- wrong error message for commands that aren't installed (31b876b)

## 1.4.1 (2023-06-22)

### Documentation

- **readme:** fixed NPM badge label (e9e9cc8)

### Chores

- remove unnecessary tsconfig.json files (f9f9a7d)

## 1.4.0 (2023-06-22)

### Features

- add @werk/command-vitest (a88b196)
- **spawn:** add errorSetExitCode option. (3f3f602)
- **spawn:** add support for inheriting stdio streams (29e65af)

## 1.3.1 (2023-06-21)

### Bug Fixes

- don't error when -v or -h options are used with no workspaces (2ca4687)

### Chores

- add "main" and "types" fields to package.json files so NPM shows the typescript badge (998de98)

## 1.3.0 (2023-06-21)

### Features

- workspace clean and modified detection methods support recursion. (3fdeed0)

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
