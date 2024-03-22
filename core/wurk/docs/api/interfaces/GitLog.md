[Wurk API](../README.md) / GitLog

# Interface: GitLog

A single Git log entry.

## Table of contents

### Properties

- [author](GitLog.md#author)
- [authorDate](GitLog.md#authordate)
- [authorEmail](GitLog.md#authoremail)
- [body](GitLog.md#body)
- [committer](GitLog.md#committer)
- [committerDate](GitLog.md#committerdate)
- [committerEmail](GitLog.md#committeremail)
- [hash](GitLog.md#hash)
- [subject](GitLog.md#subject)

## Properties

### author

• `Readonly` **author**: `string`

The author's name.

___

### authorDate

• `Readonly` **authorDate**: `string`

The date the commit was authored. This is when the commit was created.

___

### authorEmail

• `Readonly` **authorEmail**: `string`

The author's email.

___

### body

• `Readonly` **body**: `string`

The commit message body. Everything after the subject.

___

### committer

• `Readonly` **committer**: `string`

The committer's name.

___

### committerDate

• `Readonly` **committerDate**: `Date`

The date the commit was last modified. For example, if the commit is
rebased, this date will change.

___

### committerEmail

• `Readonly` **committerEmail**: `string`

The committer's email.

___

### hash

• `Readonly` **hash**: `string`

The commit hash.

___

### subject

• `Readonly` **subject**: `string`

The commit message subject (ie. the first line of the commit message).
