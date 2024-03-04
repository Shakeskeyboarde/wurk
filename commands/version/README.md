# Wurk Version Command

Update versions.

## Set Versions

Set workspace versions to a specific version.

```sh
wurk version 1.2.3
```

## Bump Versions

Increment workspace versions given a change/release type.

```sh
wurk version patch
```

The `--preid` option can be used with `pre*` bump types to set a prerelease identifier.

```sh
wurk version prepatch --preid alpha
```

This command is using the [semver](https://www.npmjs.com/package/semver#functions) package `inc()` function.

## Promote Versions

Remove the prerelease identifier from workspace prerelease versions. Has no effect on non-prerelease versions.

```sh
wurk version promote
```

## Automatic Versions

Automatically increment each workspace based on Git [conventional commits](https://www.conventionalcommits.org).

```sh
wurk version auto
```

The previous commit ID used to select Git log messages is retrieved from the NPM registry for the current version (see the `gitHead` field returned by `git show <package>@<version> --json`)

> **Note:** The `auto` bump type does not support prerelease versions.

> **Note:** The `auto` bump type requires a Git repository with a clean working tree that is not shallow cloned.

## Local Dependents

If a valid semver range is used for a local dependency version spec (eg. `^1.2.3` or `npm:some-package@^1.2.3`) and it is not a wildcard range (`*`), it will be updated as necessary during versioning. Updating dependency versions is deemed unnecessary if all of the following are true.

- The dependent workspace version is not being updated (ie. released).
- All local dependency version ranges are already satisfied by local workspace versions.
