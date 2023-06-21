# Werk Version Command

Update versions.

[![npm version](https://badge.fury.io/js/@werk%2Fcommand-version.svg)](https://badge.fury.io/js/@werk%2Fcommand-version)

## Install

```sh
npm i -D @werk/command-version
```

## Set Version

```sh
# In all workspaces
werk version 1.2.3

# Only in a specific workspace
werk -w my-workspace version 1.2.3
```

## Bump Versions

```sh
# In all workspaces
werk version patch

# Only in modified workspaces
werk --not-unmodified version patch
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

When a workspace version is updated, any dependent workspaces will also be updated so that they have a minimum dependency on the new version, and the dependent's version will also be _minimally_ (prerelease or patch number) bumped.

This is important because testing is (usually) done against local versions of dependencies. So, when a dependency is updated, the dependent is only really _guaranteed_ to work with the new version of the dependency. This is explicitly the case for major version changes.

Of course, if your versioning hygiene is good, then dependents should continue to work through patch and minor updates. But, it's a good idea to test them and update their minimum versions anyway.

## Graduating Prereleases

When the current version is a prerelease, the `version` command will refuse to bump the version to a non-prerelease version. This is to prevent accidentally releasing a prerelease version. Explicitly [setting the version](#set-version) will still work, but manual intervention of some kind is required.

In the case of the [auto bump command](#bump-versions-automatically), you can restore the versions to their original (or latest) non-prerelease values, and then perform the automatic bump. This will ensure that all changes in the prerelease are accounted for in the version and in the changelog. Your mileage may vary depending on your prerelease workflow.
