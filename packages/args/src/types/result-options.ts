import { type Named } from './named.js';
import { type IfNever, type SimplifyObject } from './utilities.js';

export type ResultOptions<
  TNamed extends readonly Named<any, any, any, any>[],
  TCurrent extends {} = {},
> = TNamed extends readonly [infer T0, ...infer TRest extends readonly Named<any, any, any, any>[]]
  ? T0 extends {
      keys: readonly (infer TKeys extends string)[];
      required: infer TRequired;
      map: infer TMap;
      parse: (...args: any[]) => infer TValue;
    }
    ? ResultOptions<
        TRest,
        IfNever<
          // Stop if the option keys conflict with an existing option's
          // keys. Commands will throw a validation error if multiple
          // options would set the same key.
          Extract<keyof TCurrent, TKeys>,
          TCurrent & {
            [P in TKeys]:
              | (TMap extends true ? Record<string, TValue> : TValue)
              | (TRequired extends true ? never : undefined);
          },
          TCurrent
        >
      >
    : ResultOptions<TRest, TCurrent>
  : SimplifyObject<TCurrent>;
