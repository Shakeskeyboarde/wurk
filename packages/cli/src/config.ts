import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getNpmWorkspaces } from './npm/get-npm-workspaces.js';
import { type PackageJson } from './utils/package-json.js';
import { type RawWorkspace } from './workspace/create-workspaces.js';

export type Config = {
  readonly version: string;
  readonly description: string;
  readonly rawRootWorkspace: RawWorkspace;
  readonly rawWorkspaces: readonly RawWorkspace[];
  readonly workspaceNames: readonly string[];
  readonly keywords: readonly string[];
  readonly commandPackageIds: Record<string, string>;
};

export const loadConfig = async (): Promise<Config> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const [packageJson, [rawRootWorkspace, rawWorkspaces]] = await Promise.all([
    await readFile(resolve(__dirname, '../package.json'), 'utf-8').then((json): PackageJson => JSON.parse(json)),
    await getNpmWorkspaces(process.cwd()),
  ]);
  const { version = '', description = '' } = packageJson;
  const workspaceNames = [
    ...new Set([rawRootWorkspace.name, ...rawWorkspaces.map((rawWorkspace) => rawWorkspace.name)]).values(),
  ];
  const keywords = [
    ...new Set([
      ...(rawRootWorkspace.keywords ?? []),
      ...rawWorkspaces.flatMap((rawWorkspace) => rawWorkspace.keywords ?? []),
    ]),
  ];

  return {
    version,
    description,
    rawRootWorkspace,
    rawWorkspaces,
    workspaceNames,
    keywords,
    commandPackageIds: (rawRootWorkspace as any)?.werk?.commands ?? {},
  };
};
