import { type NamedNames } from './named-names.js';
import { type KebobToCamelCase } from './utilities.js';

export type NamedKeys<TUsage extends string> = readonly KebobToCamelCase<NamedNames<TUsage>[number]>[];
