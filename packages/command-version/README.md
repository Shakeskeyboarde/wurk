# Werk Version Command

Update versions.

[![npm](https://img.shields.io/npm/v/@werk/command-version?label=NPM)](https://www.npmjs.com/package/@werk/command-version)
[![werk](https://img.shields.io/npm/v/@werk/cli?label=Werk&color=purple)](https://www.npmjs.com/package/@werk/cli)

## Install

```sh
npm i -D @werk/command-version
```

## Set Versions

```sh
werk version 1.2.3
```

## Bump Versions

```sh
werk version patch
```

This command is using the [semver](https://www.npmjs.com/package/semver#functions) package `inc()` function.

The basic bump types are as follows.

- `major`: 1.2.3 → 2.0.0 → 3.0.0
- `minor`: 1.2.3 → 1.3.0 → 1.4.0
- `patch`: 1.2.3 → 1.2.4 → 1.2.5
- `premajor`: 1.2.3 → 2.0.0-0 → 3.0.0-0
- `preminor`: 1.2.3 → 1.3.0-0 → 1.4.0-0
- `prepatch`: 1.2.3 → 1.2.4-0 → 1.2.5-0
- `prerelease`: 1.2.3 → 1.2.4-0 → 1.2.4-1

Use the `--preid` option to set the prerelease identifier.

- `premajor --preid=alpha`: 1.2.3 → 2.0.0-alpha.0 → 3.0.0-alpha.0
- `preminor --preid=alpha`: 1.2.3 → 1.3.0-alpha.0 → 1.4.0-alpha.0
- `prepatch --preid=alpha`: 1.2.3 → 1.2.4-alpha.0 → 1.2.5-alpha.0
- `prerelease --preid=alpha`: 1.2.3 → 1.2.4-alpha.0 → 1.2.4-alpha.1

Note the difference between `prepatch` and `prerelease`. The former will always bump the patch number and reset the prerelease number to zero. The later will only bump the patch number if the current version is not a prerelease, and will increment the prerelease number otherwise.

## Bump Versions Automatically

If you're using Git with [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/#summary) messages, you can use the `auto` bump type to automatically choose the correct bump level.

```sh
werk version auto
```

This will also update the `CHANGELOG.md` file, unless the `--no-changelog` flag is set.

**Note:** The `auto` bump type is intended for _releases_, so the `--preid` option is not supported. While working with prereleases, use the [basic bump command](#bump-versions) instead.

**Note:** The `auto` bump type requires a Git repository with a clean working tree.

## Dependents

When a workspace version update is _greater than a patch,_ any dependent workspaces will also be updated so that they have a minimum dependency on the new version, and the dependent's version will also be _minimally_ (prerelease or patch number) bumped.

## Graduating Prereleases

When the current version is a prerelease, the `version` command will refuse to bump the version to a non-prerelease version. This is to prevent accidentally releasing a prerelease version. You need to explicitly [set](#set-versions) or [bump](#bump-versions) the version to a non-prerelease in this case.
