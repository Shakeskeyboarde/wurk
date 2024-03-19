# Wurk Publish Command

Publish workspaces.

## Getting Started

Install the command in your root workspace.

```sh
npm install --save-dev @wurk/command-publish
```

Run the command.

```sh
wurk publish
```

## Options

- `--to-archive` - Publish to local archive files.
- `--from-archive` - Publish fro local archive files.
- `--tag` - Tag for the published package (default: `latest`).
- `--otp` - One-time password for publishing.
- `--remove-package-field <field>` - Remove a field from the `package.json` file before publishing (supports dot notation).
- `--dry-run` - No permanent changes on disk and no push to the registry.

## Validation

A best attempt is made to ensure a published package will work the same way it
does locally. This includes checking for uncommitted or untracked files, invalid or unpublished dependencies, and entry points in the `package.json` file that are not included in the published package.

## Temporary `package.json` changes

The publication process makes temporary changes to `package.json` files. These changes are reset after publication, but may be left behind if the process is interrupted. The changes include adding a `gitHead` field, converting wildcard and `workspace:` dependencies to publishable ranges, and removing fields specified by the `--remove-package-fields` option.
