import { createCommand } from 'wurk';

import { depcheck } from './testers/depcheck.js';
import { eslint } from './testers/eslint.js';
import { vitest } from './testers/vitest.js';

export default createCommand('test', {
  config: (cli) => {
    return cli
      .option('--build', { hidden: true })
      .option(
        '--no-build',
        "skip running the root workspace's build script before testing",
      )
      .option('--include-dependents', { hidden: true })
      .option(
        '--no-include-dependents',
        'do not automatically build the dependents of selected workspaces',
      )
      .optionDefault('includeDependents', true)
      .optionNegation('includeDependents', 'noIncludeDependents')
      .option('--depcheck-dev', 'show depcheck unused devDependencies')
      .option(
        '--depcheck-missing',
        'show depcheck missing dependencies (all types)',
      )
      .optionDefault('build', true)
      .optionNegation('build', 'noBuild');
  },

  action: async (context) => {
    const { options, workspaces } = context;

    if (options.includeDependents) {
      // Include dependents in case there are integration tests
      workspaces.includeDependents();
    }

    if (!workspaces.iterableSize) return;

    if (options.build) {
      await workspaces.root.spawn('npm', ['run', '--if-present', 'build'], {
        env: {
          // Declare the workspaces that should be built if the build script
          // runs another Wurk command (eg. wurk build).
          WURK_WORKSPACE_EXPRESSIONS: JSON.stringify(
            Array.from(workspaces).map(({ name }) => name),
          ),
        },
        output: 'inherit',
      });
    }

    await depcheck(context);
    await eslint(context);
    await vitest(context);
  },
});
