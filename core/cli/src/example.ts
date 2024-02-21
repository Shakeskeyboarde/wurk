import { Cli } from './cli.js';

const a = Cli.create('a')
  .alias('aa')
  .description('description')
  .trailer('trailer')
  .option('-a [value...]', {
    description: 'one value or more',
    key: 'abc',
    parse: () => 1,
    // key: null,
    // parse: (value) => {},
  })
  .option('-b, --foo-bar', {
    group: 'Filter Options',
    mapped: true,
    required: true,
    parse: (value, prev: Record<string, boolean> | undefined) => ({ ...prev, ...value }),
  })
  .option('--foo [value]', 'foo option')
  .option('--no-foo', {
    hidden: true,
  })
  .option('--no-foo-really')
  .option('<required-value>', {
    parse: (value) => value,
  })
  .option('[optional-value...]', {
    description: 'catch-all',
    hidden: true,
    parse: (value) => value,
  })
  .optionNegation('foo', 'noFoo', 'noFooReally')
  .optionConflict('abc', 'foo')
  .optionAction('foo', ({ result, key, value }) => {
    result.options;
    key;
    value;
  })
  .setUnknownNamedOptionAllowed()
  .setShortOptionMergingAllowed()
  .setCommandOptional()
  .setGreedy()
  .setDefault()
  .setParent(null)
  .setHelpFormatter(null)
  .action((result) => {
    result.options.foo = true;
    result.command;
  });

const b = Cli.create('b').option('-a', { required: true }).command(a);

const c = Cli.create('c');

const d = Cli.create('d')
  .option('-b')
  .command(a)
  .command(b)
  .command(c)
  .optionAction('b', ({ result, key, value }) => {
    result.options;
    result.command;
    result.options[key] = value;
    result.parsed;

    if (result.command.b) {
      result.command.b.options;
      result.command.b.command;
    } else {
      result.command;
    }
  });

d.getHelpText();
d.printHelp();

const result = await d.parse();

if (result.command.a) {
  result.command.a.options.fooBar;
}

if (result.command.b) {
  result.command.b.options;
} else {
  result.command;
}
