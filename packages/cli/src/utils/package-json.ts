type MutableJson<T> = T extends readonly (infer V)[]
  ? MutableJson<V>[]
  : T extends object
  ? { -readonly [K in keyof T]: MutableJson<T[K]> }
  : T;

export interface PackageJsonBase {
  readonly name?: string;
  readonly description?: string;
  readonly version?: string;
  readonly private?: boolean;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly man?: string | readonly string[];
  readonly directories?: { readonly bin?: string; readonly man?: string };
  readonly keywords?: readonly string[];
  readonly type?: string;
  readonly types?: string;
  readonly bin?: string | Readonly<Record<string, string>>;
  readonly main?: string;
  readonly module?: string;
  readonly exports?: string | Readonly<Record<string, string | Readonly<Record<string, string>>>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

export interface PackageJson extends PackageJsonBase {
  readonly [key: string]: unknown;
}

export type MutablePackageJson = MutableJson<PackageJson>;
