import { createCommand } from 'wurk';

import { depcheck } from './testers/depcheck.js';
import { eslint } from './testers/eslint.js';
import { vitest } from './testers/vitest.js';

export default createCommand('test', {
  config: (cli) => {
    return cli
      .option('--fix', 'fix any problems which are automatically fixable')
      .option('--build', { hidden: true })
      .option('--no-build', 'skip building before testing')
      .optionDefault('build', () => true)
      .optionNegation('build', 'noBuild');
  },

  action: async (context) => {
    if (context.workspaces.selectedSize === 0) return;

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
