import { type Log, SpawnExitCodeError, type WorkspaceCollection } from 'wurk';

interface DepcheckContext {
  readonly log: Log;
  readonly workspaces: WorkspaceCollection;
  readonly options: {
    readonly depcheckDev?: boolean;
    readonly depcheckMissing?: boolean;
  };
}

export const depcheck = async ({
  log,
  workspaces,
  options,
}: DepcheckContext): Promise<void> => {
  const isDependencyPresent = workspaces.root.config
    .at('devDependencies')
    .at('depcheck')
    .is('string');

  if (!isDependencyPresent) return;
  if (!workspaces.iterableSize) return;

  const workspaceDirs = Array.from(workspaces)
    .filter(({ isSelected }) => isSelected)
    .map(({ dir }) => workspaces.root.fs.relative(dir));

  if (!workspaceDirs.length) return;

  for (const dir of workspaceDirs) {
    const { exitCode, stdoutJson } = await workspaces.root.spawn(
      'depcheck',
      [dir, !options.depcheckMissing && '--skip-missing', '--json'],
      {
        log,
        logCommand: { mapArgs: (arg) => arg !== '--json' },
        allowNonZeroExitCode: true,
      },
    );

    if (!stdoutJson.exists()) {
      if (exitCode) {
        throw new SpawnExitCodeError('depcheck', exitCode, null);
      } else {
        throw new Error('depcheck did not produce json output');
      }
    }

    let isSuccess = true;

    for (const depType of [
      'dependencies',
      'peerDependencies',
      'optionalDependencies',
      ...(options.depcheckDev ? ['devDependencies'] : []),
    ]) {
      const unused = stdoutJson.at(depType).as('array');

      if (unused?.length) {
        isSuccess = false;
        workspaces.root.log
          .print`Unused dependencies:\n- ${unused.join('\n- ')}`;
      }
    }

    if (options.depcheckMissing) {
      const missing = Object.entries(
        stdoutJson.at('missing').as('object', {}),
      ).filter((entry): entry is [string, unknown[]] => {
        return Array.isArray(entry[1]);
      });

      if (missing.length) {
        isSuccess = false;
        workspaces.root.log.print`Missing dependencies:`;
        missing.forEach(([dep, filenames]) => {
          workspaces.root.log.print`- ${dep}:`;
          filenames.forEach((filename) => {
            workspaces.root.log.print`  - ${filename}`;
          });
        });
      }
    }

    if (!isSuccess) {
      throw new SpawnExitCodeError('depcheck', exitCode || 1, null);
    }
  }
};
