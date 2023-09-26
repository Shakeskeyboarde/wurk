type MutableJson<T> = T extends readonly (infer V)[]
  ? MutableJson<V>[]
  : T extends object
  ? { -readonly [K in keyof T]: MutableJson<T[K]> }
  : T;

export interface PackageExportsMap {
  readonly [key: string]: string | PackageExportsMap;
}

export interface PackageJsonKnown {
  readonly private?: boolean;
  readonly name?: string;
  readonly description?: string;
  readonly version?: string;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly keywords?: readonly string[];
  readonly type?: string;
  readonly files?: readonly string[];
  readonly directories?: { readonly bin?: string; readonly man?: string };
  readonly man?: string | readonly string[];
  readonly types?: string;
  readonly bin?: string | Readonly<Record<string, string>>;
  readonly main?: string;
  readonly module?: string;
  readonly exports?: string | PackageExportsMap;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

export interface PackageJson extends PackageJsonKnown {
  readonly [key: string]: unknown;
}

export type MutablePackageJson = MutableJson<PackageJson>;
