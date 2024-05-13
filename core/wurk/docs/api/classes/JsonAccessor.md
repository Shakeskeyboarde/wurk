[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / JsonAccessor

# Class: JsonAccessor

A fluent accessor for safely reading and modifying JSON data.

## Accessors

### isModified

> `get` **isModified**(): `boolean`

True if the set method has been used to change the underlying value.

#### Returns

`boolean`

## Constructors

### new JsonAccessor()

> **new JsonAccessor**(`value`?, `options`?): [`JsonAccessor`](JsonAccessor.md)

Construct a new JSON accessor for the given value.

#### Parameters

• **value?**: `unknown`

• **options?**

• **options.immutable?**: `boolean`

• **options.parent?**: `JsonAccessorParent`

#### Returns

[`JsonAccessor`](JsonAccessor.md)

## Methods

### as()

> **as**\<`TJsonType`, `TValue`, `TAltValue`\>(`types`, `alt`?): `TValue` \| `NoInfer`\<`TAltValue`\>

Returns the underlying value if it matches one of the types. Otherwise
return undefined or the alternative value.

#### Type parameters

• **TJsonType** *extends* `JsonType`

• **TValue** = `JsonValue`\<`TJsonType`\>

• **TAltValue** = `undefined`

#### Parameters

• **types**: `TJsonType` \| [`TJsonType`, `...TJsonType[]`] \| (`value`) => `value is TValue`

• **alt?**: `TAltValue` \| () => `TAltValue`

#### Returns

`TValue` \| `NoInfer`\<`TAltValue`\>

***

### at()

> **at**(`key`): [`JsonAccessor`](JsonAccessor.md)

Returns a new sub-accessor for the value at the given key of the current
accessor.

#### Parameters

• **key**: `string` \| `number`

#### Returns

[`JsonAccessor`](JsonAccessor.md)

***

### compose()

> **compose**\<`TValue`\>(`callback`): `TValue`

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

• **TValue**

#### Parameters

• **callback**

#### Returns

`TValue`

***

### copy()

> **copy**(`options`?): [`JsonAccessor`](JsonAccessor.md)

Create a copy of the current accessor. The underlying value will be
deep copied, and the copy will be mutable by default. You can provide
an initializer function to modify the copy before it is returned.

#### Parameters

• **options?**

• **options.immutable?**: `boolean`

• **options.initializer?**

#### Returns

[`JsonAccessor`](JsonAccessor.md)

***

### entries()

#### entries(type)

> **entries**(`type`): [`number`, `unknown`][]

Returns the entry tuples of the underlying value if it is an array.
Otherwise, it returns an empty array.

##### Parameters

• **type**: `"array"`

##### Returns

[`number`, `unknown`][]

#### entries(type)

> **entries**(`type`): [`string`, `unknown`][]

Returns the entry tuples of the underlying value if it is an object.
Otherwise, it returns an empty array.

##### Parameters

• **type**: `"object"`

##### Returns

[`string`, `unknown`][]

#### entries(type)

> **entries**(`type`?): [`string` \| `number`, `unknown`][]

Returns the entry tuples of the underlying value if it is an array or
object. Returns an empty array if the value is not an array or object.

##### Parameters

• **type?**: `"object"` \| `"array"`

##### Returns

[`string` \| `number`, `unknown`][]

***

### exists()

> **exists**(): `boolean`

Returns true if the underlying value is not undefined.

#### Returns

`boolean`

***

### is()

> **is**(`types`): `boolean`

Returns true if the underlying value matches one of the types.

#### Parameters

• **types**: `JsonType` \| [`JsonType`, `...JsonType[]`] \| (`value`) => `boolean`

#### Returns

`boolean`

***

### keys()

#### keys(type)

> **keys**(`type`): `string`[]

Returns the keys of the underlying value if it is an object. Otherwise, it
returns an empty array.

##### Parameters

• **type**: `"object"`

##### Returns

`string`[]

#### keys(type)

> **keys**(`type`): `number`[]

Returns the keys of the underlying value if it is an array. Otherwise, it
returns an empty array.

##### Parameters

• **type**: `"array"`

##### Returns

`number`[]

#### keys(type)

> **keys**(`type`?): `number`[] \| `string`[]

Returns the keys of the underlying value if it is an array or object.
Returns an empty array if the value is not an array or object.

##### Parameters

• **type?**: `"object"` \| `"array"`

##### Returns

`number`[] \| `string`[]

***

### map()

> **map**\<`TValue`\>(`callback`): `undefined` \| `TValue`[]

Apply a mapping callback to all values of the underlying value if it is
an array, and return the mapped results. Returns undefined if the value
is not an array.

#### Type parameters

• **TValue**

#### Parameters

• **callback**

#### Returns

`undefined` \| `TValue`[]

***

### set()

#### set(factory)

> **set**(`factory`): `void`

Derive and set the underlying value of the current accessor using a
factory function. If the accessor is immutable, an error will be thrown.

NOTE: You should only set JSON serializable values, or `undefined` to
remove the current value from the parent accessor.

##### Parameters

• **factory**

##### Returns

`void`

#### set(value)

> **set**(`value`): `void`

Set the underlying value of the current accessor. If the accessor is
immutable, an error will be thrown.

NOTE: You should only set JSON serializable values, or `undefined` to
remove the current value from the parent accessor.

##### Parameters

• **value**: `unknown`

##### Returns

`void`

***

### toJSON()

> **toJSON**(): `unknown`

Alias for the `unwrap` method.

#### Returns

`unknown`

***

### toString()

> **toString**(`space`?): `string`

Return a JSON string of the `value` property of this object.

Equivalent to `JSON.stringify(this, null, <space>) ?? ''`.

#### Parameters

• **space?**: `string` \| `number`

#### Returns

`string`

***

### unwrap()

> **unwrap**(): `unknown`

Return the underlying value of the accessor.

#### Returns

`unknown`

***

### valueOf()

> **valueOf**(): `Object`

Delegates the `valueOf` method to the underlying value.

#### Returns

`Object`

***

### values()

> **values**(): `unknown`[]

Returns the values of the underlying value if it is an array or object.
Returns an empty array if the value is not an array or object.

#### Returns

`unknown`[]

***

### parse()

> `static` **parse**(`jsonData`, `options`?): [`JsonAccessor`](JsonAccessor.md)

Parse the given JSON string and return a new JSON accessor for the
parsed value. This will never throw an error, and will always return
a new accessor instance. If the JSON string was invalid, the accessor's
underlying value will be `undefined`, and the `.exists()` method will
return false.

#### Parameters

• **jsonData**: `undefined` \| `null` \| `string`

• **options?**

• **options.immutable?**: `boolean`

#### Returns

[`JsonAccessor`](JsonAccessor.md)

## Properties

### immutable

> `readonly` **immutable**: `boolean`

True if the accessor is immutable. The `set` method will throw an error
when used if this is true.

***

### parent

> `readonly` **parent**: `undefined` \| `JsonAccessorParent`

The accessor's parent accessor reference, if any.
