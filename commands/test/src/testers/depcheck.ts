import { SpawnError, type WorkspaceCollection } from 'wurk';

interface DepcheckContext {
  readonly workspaces: WorkspaceCollection;
  readonly options: {
    readonly depcheckDev?: boolean;
    readonly depcheckMissing?: boolean;
  };
}

export const depcheck = async ({
  workspaces,
  options,
}: DepcheckContext): Promise<void> => {
  const isDependencyPresent = workspaces.root.config
    .at('devDependencies')
    .at('depcheck')
    .is('string');

  if (!isDependencyPresent) return;

  const workspaceDirs = Array.from(workspaces).map(({ dir }) => dir);

  if (!workspaceDirs.length) return;

  for (const dir of workspaceDirs) {
    const { exitCode, stdoutJson } = await workspaces.root.spawn(
      'depcheck',
      [
        workspaces.root.fs.relative(dir),
        !options.depcheckMissing && '--skip-missing',
        '--json',
      ],
      {
        logCommand: { mapArgs: (arg) => arg !== '--json' },
        allowNonZeroExitCode: true,
      },
    );

    if (!stdoutJson.exists()) {
      if (exitCode) {
        throw new SpawnError('depcheck', exitCode, null);
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
        workspaces.root.log.print(
          `Unused dependencies:\n- ${unused.join('\n- ')}`,
        );
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
        workspaces.root.log.print(
          `Missing dependencies:${missing.map(([dep, filenames]) => `\n- ${dep}:${filenames.map((filename) => `\n  - ${filename}`).join('')}`)}`,
        );
      }
    }

    if (!isSuccess) {
      throw new SpawnError('depcheck', exitCode || 1, null);
    }
  }
};
