[Wurk API](../README.md) / GitLogOptions

# Interface: GitLogOptions

Options for getting Git log entries.

## Hierarchy

- [`GitHeadOptions`](GitHeadOptions.md)

  ↳ **`GitLogOptions`**

## Table of contents

### Properties

- [allowShallow](GitLogOptions.md#allowshallow)
- [end](GitLogOptions.md#end)
- [start](GitLogOptions.md#start)

## Properties

### allowShallow

• `Optional` `Readonly` **allowShallow**: `boolean`

If true, do not throw an error if the repository is a shallow clone.

#### Inherited from

[GitHeadOptions](GitHeadOptions.md).[allowShallow](GitHeadOptions.md#allowshallow)

___

### end

• `Optional` `Readonly` **end**: `string`

The commit-ish to end at.

___

### start

• `Optional` `Readonly` **start**: ``null`` \| `string`

The commit-ish to start from.
