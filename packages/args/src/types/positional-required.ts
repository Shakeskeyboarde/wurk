export type PositionalRequired<TUsage extends string> = TUsage extends `<${string}` ? true : false;
