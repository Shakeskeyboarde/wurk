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

## Publishing Archives

To create package archives instead of publishing them to an NPM registry, set the `--to-archive` option.

```sh
wurk publish --to-archive
```

The resulting archives can be published later by setting the `--from-archive` option. This will skip most validation, only checking for the existence of archives with a name and version matching the adjacent `package.json` file.

```sh
wurk publish --from-archive
```

## Multi-Factor Authentication

Use the `--otp` option to set a one-time password for publishing.

```sh
wurk publish --otp=123456
```

## Remove Package Fields

Use the `--remove-package-fields` option to remove fields from the `package.json` file before publishing. This is useful for removing fields that are only used for local development, such as `devDependencies` and `scripts`.

```sh
wurk publish --remove-package-fields devDependencies scripts
```

The fields can be dot notated to remove nested fields.

```sh
wurk publish --remove-package-fields scripts.test
```

## Publish Tag

Use the `--tag` option to set the tag for the published package. The default tag is `latest`.

```sh
wurk publish --tag=next
```

## Dry run

Use the `--dry-run` option to validate without making any permanent changes on disk (temporary only) or pushing to the registry. The `--dry-run` option will be passed through to the `npm publish` or `npm pack` command.

```sh
wurk publish --dry-run
```

## Validation

A best attempt is made to ensure a published package will work the same way it
does locally. This includes checking for uncommitted or untracked files, invalid or unpublished dependencies, and entry points in the `package.json` file that are not included in the published package.

## Temporary `package.json` changes

The publication process makes temporary changes to `package.json` files. These changes are reset after publication, but may be left behind if the process is interrupted. The changes include adding a `gitHead` field, converting wildcard and `workspace:` dependencies to publishable ranges, and removing fields specified by the `--remove-package-fields` option.
