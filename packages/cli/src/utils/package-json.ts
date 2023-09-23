import { type IPackageJson as IPackageJsonBase, type IScriptsMap as IScriptsMapBase } from 'package-json-type';

interface IScriptsMap extends IScriptsMapBase {
  [key: string]: string;
}

type IndexType<T> = T extends Record<any, infer V> ? V : never;
type OmitIndex<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};
type OmitWithIndex<T, K extends keyof OmitIndex<T>> = Omit<OmitIndex<T>, K> & Record<string, IndexType<T>>;
type ReadonlyJson<T> = T extends (infer V)[]
  ? readonly ReadonlyJson<V>[]
  : T extends object
  ? { +readonly [K in keyof T]: ReadonlyJson<T[K]> }
  : T;
type MutableJson<T> = T extends readonly (infer V)[]
  ? MutableJson<V>[]
  : T extends object
  ? { -readonly [K in keyof T]: MutableJson<T[K]> }
  : T;

export interface PackageJson extends ReadonlyJson<OmitWithIndex<IPackageJsonBase, 'scripts'>> {
  readonly scripts?: ReadonlyJson<IScriptsMap>;
  readonly werk?: {
    readonly commands?: {
      readonly [key: string]: string;
    };
  };
  readonly [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MutablePackageJson extends MutableJson<PackageJson> {}
