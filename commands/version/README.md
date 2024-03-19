# Wurk Version Command

Update workspace versions.

## Getting Started

Install the command in your root workspace.

```sh
npm install --save-dev @wurk/command-version
```

Automatically version workspaces based on Git [conventional commits](https://www.conventionalcommits.org).

```sh
wurk version auto
# This is the default mode, so the "auto" argument is optional.
wurk version
```

Increment workspace versions given a change/release type.

```sh
wurk version major
wurk version minor
wurk version patch
wurk version premajor
wurk version preminor
wurk version prepatch
wurk version prerelease
```

Promote prerelease versions.

```sh
wurk version promote
```

Set workspace versions to a specific version.

```sh
wurk version 1.2.3
```

## Options

- `--note <message>` - Add a note to the version commit message.
- `--preid <identifier>` - Set the prerelease identifier.
- `--changelog` - Write a changelog for versioned workspaces (default if auto versioning).
- `--no-changelog` - Do not write a changelog for versioned workspaces (default if not auto versioning).

## Updating Dependency Version Ranges

The version command does not update dependency version ranges in locally dependent `package.json` files.

**Why not?**

In most cases, the local dependent will have a wildcard (`*`) or (better yet) a Workspace (`workspace:^`) specifier (PNPM and Yarn only). These should be updated just-in-time for publishing, and not during versioning.

Using a non-wildcard version range for a local dependency should be a special case. Therefore, the appropriate behavior is to leave it alone and let the special case be handled externally until it can be resolved back into the general case.

