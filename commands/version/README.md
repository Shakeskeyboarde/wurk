# Wurk Version Command

Update workspace versions.

## Getting Started

Install the command in your root workspace.

```sh
npm install --save-dev @wurk/command-version
```

## Strategies

There a are several strategies for updating workspace versions.

```sh
wurk version <strategy> [options]
```

### Setting

Set workspace versions to a specific version.

```sh
wurk version 1.2.3
```

### Incrementing

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

### Promoting

Remove the prerelease identifier from workspace prerelease versions. Has no effect on non-prerelease versions.

```sh
wurk version promote
```

### Automatic Incrementing

Automatically increment each workspace based on Git [conventional commits](https://www.conventionalcommits.org).

```sh
wurk version auto
```

The previous commit ID used to select Git log messages is retrieved from the NPM registry for the current version (see the `gitHead` field returned by `git info <package>@<version> --json`).

When creating the release commit, you should use the `chore(release):` conventional commit prefix. This helps indicate to future auto versioning that the commit is a release commit, which should not contribute to future version incrementing or changelog generation.

> **Note:** The `auto` strategy does not support prerelease versions.

> **Note:** The `auto` strategy requires a Git repository with a clean working tree that is not shallow cloned.

## Updating Dependency Version Ranges

The version command does not update dependency version ranges in locally dependent `package.json` files.

**Why not?**

In most cases, the local dependent will have a wildcard (`*`) or (better yet) a Workspace (`workspace:^`) specifier (PNPM and Yarn only). These should be updated just-in-time for publishing, and not during versioning.

Using a non-wildcard version range for a local dependency should be a special case. Therefore, the appropriate behavior is to leave it alone and let the special case be handled externally until it can be resolved back into the general case.

