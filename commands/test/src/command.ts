import { createCommand } from 'wurk';

import { runDepcheck } from './depcheck.js';
import { runEslint } from './eslint.js';
import { runVitest } from './vitest.js';

export default createCommand('test', {
  config: (cli) => {
    return cli
      .option('--fix', 'fix any problems which are automatically fixable')
      .option('--build', { hidden: true })
      .option('--no-build', 'skip building before testing')
      .optionDefault('build', () => true)
      .optionNegation('build', 'noBuild');
  },

  run: async (context) => {
    if (context.workspaces.selectedSize === 0) return;

    const { options, workspaces } = context;

    if (options.build) {
      await workspaces.root.spawn('npm', ['run', '--if-present', 'build'], {
        output: 'inherit',
      });
    }

    await runDepcheck(context);
    await runEslint(context);
    await runVitest(context);
  },
});
