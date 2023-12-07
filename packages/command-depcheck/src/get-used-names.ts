/**
 * Given a package name, return all package names (eg. types) which are
 * used when it is imported or required.
 */
export const getUsedNames = (name: string): [types: string] | [types: string, implementation: string] => {
  return name.startsWith('@types/')
    ? // The name is already a types package, so no other packages are used.
      [name]
    : // The name is an implementation package, so the types packages is also used.
      [`@types/${name.startsWith('@') ? name.slice(1).replace('/', '__') : name}`, name];
};
