import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { type Workspace } from 'wurk';

import { getPackBasename } from '../pack.js';
import { publish } from '../publish.js';

interface Context {
  readonly options: {
    readonly tag?: string;
    readonly otp?: string;
    readonly dryRun?: boolean;
  };
  readonly pm: string;
}

export const publishFromArchive = async ({ options, pm }: Context, workspace: Workspace): Promise<void> => {
  const { tag, otp, dryRun } = options;
  const { log, dir, name, version } = workspace;

  if (!version) {
    log.info`workspace is unversioned`;
    log.info`not publishing`;
    return;
  }

  const archiveFilename = nodePath.resolve(dir, getPackBasename(pm, name, version));
  const exists = await nodeFs.access(archiveFilename)
    .then(() => true, () => false);

  if (!exists) {
    log.info`workspace has no archive`;
    log.info`not publishing`;
    return;
  }

  await publish({ pm, workspace, archiveFilename, tag, otp, dryRun });

  log.info`published version ${version} from archive`;
};
