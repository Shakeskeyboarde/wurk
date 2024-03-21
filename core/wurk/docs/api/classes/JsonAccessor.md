[Wurk API](../README.md) / JsonAccessor

# Class: JsonAccessor

A fluent accessor for safely reading and modifying JSON data.

## Table of contents

### Accessors

- [isModified](JsonAccessor.md#ismodified)

### Constructors

- [constructor](JsonAccessor.md#constructor)

### Methods

- [as](JsonAccessor.md#as)
- [at](JsonAccessor.md#at)
- [compose](JsonAccessor.md#compose)
- [copy](JsonAccessor.md#copy)
- [entries](JsonAccessor.md#entries)
- [exists](JsonAccessor.md#exists)
- [is](JsonAccessor.md#is)
- [keys](JsonAccessor.md#keys)
- [map](JsonAccessor.md#map)
- [set](JsonAccessor.md#set)
- [toJSON](JsonAccessor.md#tojson)
- [toString](JsonAccessor.md#tostring)
- [unwrap](JsonAccessor.md#unwrap)
- [valueOf](JsonAccessor.md#valueof)
- [values](JsonAccessor.md#values)
- [parse](JsonAccessor.md#parse)

### Properties

- [immutable](JsonAccessor.md#immutable)
- [parent](JsonAccessor.md#parent)

## Accessors

### isModified

• `get` **isModified**(): `boolean`

True if the set method has been used to change the underlying value.

#### Returns

`boolean`

## Constructors

### constructor

• **new JsonAccessor**(`value?`, `options?`): [`JsonAccessor`](JsonAccessor.md)

Construct a new JSON accessor for the given value.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value?` | `unknown` |
| `options?` | `Object` |
| `options.immutable?` | `boolean` |
| `options.parent?` | `JsonAccessorParent` |

#### Returns

[`JsonAccessor`](JsonAccessor.md)

## Methods

### as

▸ **as**\<`TJsonType`, `TValue`, `TAltValue`\>(`types`, `alt?`): `TValue` \| `NoInfer`\<`TAltValue`\>

Returns the underlying value if it matches one of the types. Otherwise
return undefined or the alternative value.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TJsonType` | extends `JsonType` |
| `TValue` | `JsonValue`\<`TJsonType`\> |
| `TAltValue` | `undefined` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `types` | `TJsonType` \| [`TJsonType`, ...TJsonType[]] \| (`value`: `unknown`) => value is TValue |
| `alt?` | `TAltValue` \| () => `TAltValue` |

#### Returns

`TValue` \| `NoInfer`\<`TAltValue`\>

___

### at

▸ **at**(`key`): [`JsonAccessor`](JsonAccessor.md)

Returns a new sub-accessor for the value at the given key of the current
accessor.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` \| `number` |

#### Returns

[`JsonAccessor`](JsonAccessor.md)

___

### compose

▸ **compose**\<`TValue`\>(`callback`): `TValue`

Convenience method which creates a closure that receives the current
accessor, and can return a value derived from it. This is useful for
to avoid accessing the same nested value multiple times.

```ts
const value = accessor.at('values').at('data').compose((data) => {
  return {
    foo: data.at('foo').unwrap(),
    bar: data.at('bar').unwrap(),
  };
});

// Instead of accessing values.data multiple times.

const value = {
  foo: accessor.at('values').at('data').at('foo').unwrap(),
  bar: accessor.at('values').at('data').at('bar').unwrap(),
}
```

#### Type parameters

| Name |
| :------ |
| `TValue` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`self`: [`JsonAccessor`](JsonAccessor.md)) => `TValue` |

#### Returns

`TValue`

___

### copy

▸ **copy**(`options?`): [`JsonAccessor`](JsonAccessor.md)

Create a copy of the current accessor. The underlying value will be
deep copied, and the copy will be mutable by default. You can provide
an initializer function to modify the copy before it is returned.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `Object` |
| `options.immutable?` | `boolean` |
| `options.initializer?` | (`copy`: [`JsonAccessor`](JsonAccessor.md)) => `void` |

#### Returns

[`JsonAccessor`](JsonAccessor.md)

___

### entries

▸ **entries**(`type`): [`number`, `unknown`][]

Returns the entry tuples of the underlying value if it is an array.
Otherwise, it returns an empty array.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | ``"array"`` |

#### Returns

[`number`, `unknown`][]

▸ **entries**(`type`): [`string`, `unknown`][]

Returns the entry tuples of the underlying value if it is an object.
Otherwise, it returns an empty array.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | ``"object"`` |

#### Returns

[`string`, `unknown`][]

▸ **entries**(`type?`): [`string` \| `number`, `unknown`][]

Returns the entry tuples of the underlying value if it is an array or
object. Returns an empty array if the value is not an array or object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type?` | ``"object"`` \| ``"array"`` |

#### Returns

[`string` \| `number`, `unknown`][]

___

### exists

▸ **exists**(): `boolean`

Returns true if the underlying value is not undefined.

#### Returns

`boolean`

___

### is

▸ **is**(`types`): `boolean`

Returns true if the underlying value matches one of the types.

#### Parameters

| Name | Type |
| :------ | :------ |
| `types` | `JsonType` \| [`JsonType`, ...JsonType[]] \| (`value`: `unknown`) => `boolean` |

#### Returns

`boolean`

___

### keys

▸ **keys**(`type`): `string`[]

Returns the keys of the underlying value if it is an object. Otherwise, it
returns an empty array.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | ``"object"`` |

#### Returns

`string`[]

▸ **keys**(`type`): `number`[]

Returns the keys of the underlying value if it is an array. Otherwise, it
returns an empty array.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | ``"array"`` |

#### Returns

`number`[]

▸ **keys**(`type?`): `number`[] \| `string`[]

Returns the keys of the underlying value if it is an array or object.
Returns an empty array if the value is not an array or object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type?` | ``"object"`` \| ``"array"`` |

#### Returns

`number`[] \| `string`[]

___

### map

▸ **map**\<`TValue`\>(`callback`): `undefined` \| `TValue`[]

Apply a mapping callback to all values of the underlying value if it is
an array, and return the mapped results. Returns undefined if the value
is not an array.

#### Type parameters

| Name |
| :------ |
| `TValue` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`value`: [`JsonAccessor`](JsonAccessor.md), `index`: `number`) => `TValue` |

#### Returns

`undefined` \| `TValue`[]

___

### set

▸ **set**(`factory`): `void`

Derive and set the underlying value of the current accessor using a
factory function. If the accessor is immutable, an error will be thrown.

NOTE: You should only set JSON serializable values, or `undefined` to
remove the current value from the parent accessor.

#### Parameters

| Name | Type |
| :------ | :------ |
| `factory` | (`self`: [`JsonAccessor`](JsonAccessor.md)) => `unknown` |

#### Returns

`void`

▸ **set**(`value`): `void`

Set the underlying value of the current accessor. If the accessor is
immutable, an error will be thrown.

NOTE: You should only set JSON serializable values, or `undefined` to
remove the current value from the parent accessor.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `unknown` |

#### Returns

`void`

___

### toJSON

▸ **toJSON**(): `unknown`

Alias for the `unwrap` method.

#### Returns

`unknown`

___

### toString

▸ **toString**(`space?`): `string`

Return a JSON string of the `value` property of this object.

Equivalent to `JSON.stringify(this, null, <space>) ?? ''`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `space?` | `string` \| `number` |

#### Returns

`string`

___

### unwrap

▸ **unwrap**(): `unknown`

Return the underlying value of the accessor.

#### Returns

`unknown`

___

### valueOf

▸ **valueOf**(): `Object`

Delegates the `valueOf` method to the underlying value.

#### Returns

`Object`

___

### values

▸ **values**(): `unknown`[]

Returns the values of the underlying value if it is an array or object.
Returns an empty array if the value is not an array or object.

#### Returns

`unknown`[]

___

### parse

▸ **parse**(`jsonData`, `options?`): [`JsonAccessor`](JsonAccessor.md)

Parse the given JSON string and return a new JSON accessor for the
parsed value. This will never throw an error, and will always return
a new accessor instance. If the JSON string was invalid, the accessor's
underlying value will be `undefined`, and the `.exists()` method will
return false.

#### Parameters

| Name | Type |
| :------ | :------ |
| `jsonData` | `undefined` \| ``null`` \| `string` |
| `options?` | `Object` |
| `options.immutable?` | `boolean` |

#### Returns

[`JsonAccessor`](JsonAccessor.md)

## Properties

### immutable

• `Readonly` **immutable**: `boolean`

True if the accessor is immutable. The `set` method will throw an error
when used if this is true.

___

### parent

• `Readonly` **parent**: `undefined` \| `JsonAccessorParent`

The accessor's parent accessor reference, if any.
