export const getKeys = <T extends (object | undefined)[]>(...objects: T): ReadonlySet<keyof T[number]> => {
  const keys = new Set<keyof T[number]>();

  objects
    .filter((object): object is object => object != null)
    .forEach((object) => Object.keys(object).forEach((key) => keys.add(key as keyof T[number])));

  return keys;
};
