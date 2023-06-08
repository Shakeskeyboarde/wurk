import {
  type IEngines as IEnginesBase,
  type IPackageJson as IPackageJsonBase,
  type IScriptsMap as IScriptsMapBase,
} from 'package-json-type';

type OmitIndex<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};
type IndexType<T> = T extends Record<any, infer I> ? I : never;
type ReadonlyJson<T> = T extends unknown | string | number | boolean | null
  ? T
  : T extends (infer A)[]
  ? readonly ReadonlyJson<A>[]
  : { +readonly [K in keyof OmitIndex<T>]: ReadonlyJson<T[K]> } & {
      readonly [key: string]: ReadonlyJson<IndexType<T>>;
    };

interface IScriptsMap extends IScriptsMapBase {
  [key: string]: string;
}

interface IEngines extends OmitIndex<IEnginesBase> {
  [key: string]: unknown;
}

interface IPackageJson extends Omit<OmitIndex<IPackageJsonBase>, 'engines' | 'scripts'> {
  scripts?: IScriptsMap;
  engines?: IEngines;
  gitHead?: string;
  [key: string]: unknown;
}

export type PackageJson = ReadonlyJson<IPackageJson>;
