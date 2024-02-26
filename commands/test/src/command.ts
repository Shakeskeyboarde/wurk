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
      .option('--depcheck-dev', 'show depcheck unused devDependencies')
      .option(
        '--depcheck-missing',
        'show depcheck missing dependencies (all types)',
      )
      .optionDefault('build', () => true)
      .optionNegation('build', 'noBuild');
  },

  action: async (context) => {
    if (context.workspaces.iterableSize === 0) return;

    const { options, workspaces } = context;

    if (options.build) {
      await workspaces.root.spawn('npm', ['run', '--if-present', 'build'], {
        output: 'inherit',
      });
    }

    await depcheck(context);
    await eslint(context);
    await vitest(context);
  },
});
