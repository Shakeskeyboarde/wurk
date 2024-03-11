import { createCommand } from 'wurk';

import { depcheck } from './testers/depcheck.js';
import { eslint } from './testers/eslint.js';
import { vitest } from './testers/vitest.js';

export default createCommand('test', {
  config: (cli) => {
    return cli
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
      );
  },

  action: async (context) => {
    const { options, workspaces } = context;

    if (options.includeDependents) {
      workspaces.includeDependents();
    }

    if (!workspaces.iterableSize) return;

    await depcheck(context);
    await eslint(context);
    await vitest(context);
  },
});
