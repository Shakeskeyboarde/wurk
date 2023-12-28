import { type Positional } from './positional.js';

export type ResultPositional<
  TPositional extends readonly Positional<any, any>[],
  TCurrent extends any[] = [],
  TAllowRequired extends boolean = true,
> = TPositional extends readonly [infer T0, ...infer TRest extends readonly Positional<any, any>[]]
  ? T0 extends { required: infer TRequired; variadic: infer TVariadic; parse: (...args: any[]) => infer TValue }
    ? TRequired extends false | TAllowRequired
      ? ResultPositional<
          // Stop after a variadic positional, which must be last.
          // Commands will throw a validation error if a variadic
          // positional is not last.
          TVariadic extends true ? [] : TRest,
          [...TCurrent, ...(TRequired extends true ? [TValue] : [TValue?])],
          TRequired
        >
      : // Stop if a required positional follows a non-required
        // positional. Commands will throw a validation error if a
        // required positional follows a non-required positional.
        TCurrent
    : ResultPositional<TRest, TCurrent, TAllowRequired>
  : TCurrent;
