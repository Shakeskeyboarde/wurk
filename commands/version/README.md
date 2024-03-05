# Wurk Version Command

Update workspace versions.

## Getting Started

Install the command in your root workspace.

```sh
npm install --save-dev @wurk/command-version
```

## Set Versions

Set workspace versions to a specific version.

```sh
wurk version 1.2.3
```

## Increment Versions

Increment workspace versions given a change/release type.

```sh
wurk version patch
```

The `--preid` option can be used with `pre*` strategies to set a prerelease identifier.

```sh
wurk version prepatch --preid alpha
```

This command is using the [semver](https://www.npmjs.com/package/semver#functions) package `inc()` function. See the function documentation
for more information about how version incrementing works.

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

> **Note:** The `auto` strategy does not support prerelease versions.

> **Note:** The `auto` strategy requires a Git repository with a clean working tree that is not shallow cloned.
