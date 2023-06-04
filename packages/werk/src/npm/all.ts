export const [globalNodeModules, workspacesRoot, workspaces] = await Promise.all([
  import('./global-node-modules.js').then((exports) => exports.default),
  import('./workspaces-root.js').then((exports) => exports.default),
  import('./workspaces.js').then((exports) => exports.default),
]);
