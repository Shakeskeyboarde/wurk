[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / GitLog

# Interface: GitLog

A single Git log entry.

## Properties

### author

> `readonly` **author**: `string`

The author's name.

***

### authorDate

> `readonly` **authorDate**: `string`

The date the commit was authored. This is when the commit was created.

***

### authorEmail

> `readonly` **authorEmail**: `string`

The author's email.

***

### body

> `readonly` **body**: `string`

The commit message body. Everything after the subject.

***

### committer

> `readonly` **committer**: `string`

The committer's name.

***

### committerDate

> `readonly` **committerDate**: `Date`

The date the commit was last modified. For example, if the commit is
rebased, this date will change.

***

### committerEmail

> `readonly` **committerEmail**: `string`

The committer's email.

***

### hash

> `readonly` **hash**: `string`

The commit hash.

***

### subject

> `readonly` **subject**: `string`

The commit message subject (ie. the first line of the commit message).
