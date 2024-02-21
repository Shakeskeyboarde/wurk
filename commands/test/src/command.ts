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
      .option('--vitest', { hidden: true })
      .option('--no-vitest', 'skip testing with Vitest')
      .optionNegation('vitest', 'noVitest')
      .option('--eslint', { hidden: true })
      .option('--no-eslint', 'skip testing with ESLint')
      .optionNegation('eslint', 'noEslint')
      .option('--depcheck', { hidden: true })
      .option('--no-depcheck', 'skip testing with @wurk/command-depcheck')
      .optionNegation('depcheck', 'noDepcheck')
      .optionNegation('build', 'noBuild');
  },

  run: async (context) => {
    if (context.workspaces.selectedSize === 0) return;

    const { options, workspaces } = context;
    const defaultEnabled = ![options.depcheck, options.eslint, options.vitest].some(Boolean);
    const { build = true, depcheck = defaultEnabled, eslint = defaultEnabled, vitest = defaultEnabled } = options;

    if (build) {
      await workspaces.root.spawn('npm', ['run', '--if-present', 'build'], { output: 'inherit' });
    }

    if (depcheck) await runDepcheck(context);
    if (eslint) await runEslint(context);
    if (vitest) await runVitest(context);
  },
});
