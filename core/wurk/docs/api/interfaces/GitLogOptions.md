[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / GitLogOptions

# Interface: GitLogOptions

Options for getting Git log entries.

## Extends

- [`GitHeadOptions`](GitHeadOptions.md)

## Properties

### allowShallow?

> `optional` `readonly` **allowShallow**: `boolean`

If true, do not throw an error if the repository is a shallow clone.

#### Inherited from

[`GitHeadOptions`](GitHeadOptions.md).[`allowShallow`](GitHeadOptions.md#allowshallow)

***

### end?

> `optional` `readonly` **end**: `string`

The commit-ish to end at.

***

### start?

> `optional` `readonly` **start**: `null` \| `string`

The commit-ish to start from.
