[Wurk API](../README.md) / WorkspacePrintStatusOptions

# Interface: WorkspacePrintStatusOptions

Options for printing the status summary of the workspaces.

## Table of contents

### Properties

- [condition](WorkspacePrintStatusOptions.md#condition)
- [prefix](WorkspacePrintStatusOptions.md#prefix)

## Properties

### condition

• `Optional` `Readonly` **condition**: `SelectCondition`

Selection conditions for workspaces to include in the status summary.
If omitted, all workspaces will be included. If provided, selected
workspaces will be included, as well as any workspace with a non-skipped
status.

___

### prefix

• `Optional` `Readonly` **prefix**: `string`

Prefix for status summary headers (eg. `${prefix} summary:`,
`${prefix} success`).
