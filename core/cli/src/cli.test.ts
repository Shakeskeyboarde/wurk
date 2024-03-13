import { parse } from 'shell-quote';
import {
  type Assertion,
  beforeEach,
  describe,
  expect,
  test,
  vitest,
} from 'vitest';

import {
  Cli,
  CliUsageError,
  type InferCliResult,
  type InferResultOptions,
  type UnknownResult,
} from './index.js';

interface Expectation<TResult extends UnknownResult = UnknownResult> {
  readonly options?: InferResultOptions<TResult>;
  readonly parsed?: (keyof InferResultOptions<TResult>)[];
  readonly commandResult?: {
    readonly [P in keyof TResult['commandResult']]?: Expectation<
      Exclude<TResult['commandResult'][P], undefined>
    >;
  };
}

const checkResult = <TResult extends UnknownResult>(
  result: TResult,
  expectation: Expectation<TResult>,
): void => {
  if (expectation.options) {
    expect(result.options)
      .toEqual(expectation.options);
  }

  if (expectation.parsed) {
    expect(new Set(expectation.parsed))
      .toEqual(result.parsed);
  }

  if (expectation.commandResult) {
    for (const [name, subExpectation] of Object.entries(expectation.commandResult ?? {})) {
      expect(result.commandResult)
        .toHaveProperty(name);
      checkResult(result.commandResult[name]!, subExpectation);
    }
  }
};

const check = <const TCli extends Cli>(
  cli: TCli,
  shellString: string,
): Assertion<Promise<InferCliResult<TCli>>> & {
  result: (expectation: Expectation<InferCliResult<TCli>>) => Promise<void>;
} => {
  const args = parse(shellString)
    .map((arg) => String(arg));
  const promise = cli.parse(args);

  return Object.assign(expect(promise), {
    result: async (expectation: Expectation): Promise<void> => {
      return checkResult(await promise, expectation);
    },
  });
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const cli = (name = 'test') => Cli.create(name);

beforeEach(() => {
  vitest.spyOn(process, 'exit')
    .mockImplementation(() => {
      throw new Error('process.exit');
    });
});

test('smoke', async () => {
  await check(cli(), '')
    .result({ options: {}, parsed: [], commandResult: {} });
});

describe('named', () => {
  test('boolean', async () => {
    await check(cli()
      .option('-a'), '')
      .result({
        options: { a: undefined },
        parsed: [],
      });
    await check(cli()
      .option('-a'), '-a')
      .result({
        options: { a: true },
        parsed: ['a'],
      });
    await check(cli()
      .option('-a'), '-a -a')
      .result({
        options: { a: true },
        parsed: ['a'],
      });
  });

  test('required', async () => {
    await check(cli()
      .option('-a', { required: true }), '').rejects.toThrow(CliUsageError);
    await check(cli()
      .option('-a', { required: true }), '-a')
      .result({
        options: { a: true },
        parsed: ['a'],
      });
  });

  test('optional value', async () => {
    await check(cli()
      .option('--foo [value]'), '--foo')
      .result({
        options: { foo: true },
        parsed: ['foo'],
      });
    await check(cli()
      .option('--foo [value]'), '--foo=bar')
      .result({
        options: { foo: 'bar' },
        parsed: ['foo'],
      });
    await check(cli()
      .option('--foo [value]'), '--foo bar')
      .result({
        options: { foo: 'bar' },
        parsed: ['foo'],
      });
  });

  test('required value', async () => {
    await check(cli()
      .option('--foo <value>'), '--foo').rejects.toThrow(CliUsageError);
    await check(cli()
      .option('--foo <value>'), '--foo=bar')
      .result({
        options: { foo: 'bar' },
        parsed: ['foo'],
      });
    await check(
      cli()
        .option('--foo <value>')
        .option('<other>'),
      '--foo bar baz',
    )
      .result({
        options: { foo: 'bar', other: 'baz' },
        parsed: ['foo', 'other'],
      });
  });

  test('variadic value', async () => {
    await check(cli()
      .option('--foo <value...>'), '--foo').rejects.toThrow(CliUsageError);
    await check(cli()
      .option('--foo <value...>'), '--foo=bar')
      .result({
        options: { foo: ['bar'] },
        parsed: ['foo'],
      });
    await check(cli()
      .option('--foo <value...>'), '--foo=bar --foo=baz')
      .result({ options: { foo: ['bar', 'baz'] }, parsed: ['foo'] });
    await check(
      cli()
        .option('--foo <value...>')
        .option('-b'),
      '--foo bar baz -b',
    )
      .result({
        options: { foo: ['bar', 'baz'], b: true },
        parsed: ['foo', 'b'],
      });
  });

  test('parser', async () => {
    await check(
      cli()
        .option('-a <value>', {
          parse: (value, prev) => (prev ?? '') + value,
        }),
      '-a foo -a bar -a baz',
    )
      .result({
        options: { a: 'foobarbaz' },
        parsed: ['a'],
      });
  });

  test('merging', async () => {
    await check(
      cli()
        .option('-a')
        .option('-b')
        .option('-c')
        .option('-bc'),
      '-ab -bc',
    )
      .result({
        options: { a: true, b: true, c: undefined, bc: true },
        parsed: ['a', 'b', 'bc'],
      });
  });

  test('alias', async () => {
    await check(cli()
      .option('-f, --foo'), '-f')
      .result({
        options: { foo: true },
        parsed: ['foo'],
      });
    await check(cli()
      .option('-f, --foo'), '--foo')
      .result({
        options: { foo: true },
        parsed: ['foo'],
      });
  });

  test('unknown', async () => {
    await check(cli()
      .option('-a'), '-b').rejects.toThrow(CliUsageError);
  });

  test('key override', async () => {
    await check(cli()
      .option('-a', { key: 'b' }), '-a')
      .result({
        options: { b: true },
        parsed: ['b'],
      });
  });

  test('mapped', async () => {
    await check(
      cli()
        .option('-a <value>', { mapped: true }),
      '-a foo',
    ).rejects.toThrow(CliUsageError);
    await check(
      cli()
        .option('-a <value>', { mapped: true }),
      '-a.a foo -a.b bar',
    )
      .result({
        options: { a: { a: 'foo', b: 'bar' } },
        parsed: ['a'],
      });
  });

  test('mapped variadic', async () => {
    await check(
      cli()
        .option('-a <value...>', { mapped: true }),
      '-a.b foo bar -a.b baz',
    )
      .result({
        options: { a: { b: ['foo', 'bar', 'baz'] } },
        parsed: ['a'],
      });
  });
});

describe('positional', () => {
  test('optional', async () => {
    await check(cli()
      .option('[foo]'), '')
      .result({
        options: { foo: undefined },
        parsed: [],
      });
    await check(cli()
      .option('[foo]'), 'bar')
      .result({
        options: { foo: 'bar' },
        parsed: ['foo'],
      });
  });

  test('required', async () => {
    await check(cli()
      .option('<foo>'), '').rejects.toThrow(CliUsageError);
    await check(cli()
      .option('<foo>'), 'bar')
      .result({
        options: { foo: 'bar' },
        parsed: ['foo'],
      });
  });

  test('variadic', async () => {
    await check(cli()
      .option('<foo...>'), '').rejects.toThrow(CliUsageError);
    await check(cli()
      .option('<foo...>'), 'bar')
      .result({
        options: { foo: ['bar'] },
        parsed: ['foo'],
      });
    await check(cli()
      .option('<foo...>'), 'bar baz')
      .result({
        options: { foo: ['bar', 'baz'] },
        parsed: ['foo'],
      });
    await check(cli()
      .option('[foo...]'), '')
      .result({
        options: { foo: undefined },
        parsed: [],
      });
    await check(cli()
      .option('[foo...]'), 'bar')
      .result({
        options: { foo: ['bar'] },
        parsed: ['foo'],
      });
    await check(cli()
      .option('[foo...]'), 'bar baz')
      .result({
        options: { foo: ['bar', 'baz'] },
        parsed: ['foo'],
      });
  });

  test('parser', async () => {
    await check(
      cli()
        .option('<foo>', { parse: (value) => `(${value})` }),
      'bar',
    )
      .result({
        options: { foo: '(bar)' },
        parsed: ['foo'],
      });
  });

  test('unknown', async () => {
    await check(cli()
      .option('<foo>'), 'bar baz').rejects.toThrow(CliUsageError);
  });

  test('key override', async () => {
    await check(cli()
      .option('<foo>', { key: 'bar' }), 'baz')
      .result({
        options: { bar: 'baz' },
        parsed: ['bar'],
      });
  });

  test('from named unknown', async () => {
    await check(
      cli()
        .option('<foo>')
        .setUnknownNamedOptionAllowed(),
      '-a',
    )
      .result({
        options: { foo: '-a' },
        parsed: ['foo'],
      });
    await check(cli()
      .option('<foo>'), '-a').rejects.toThrow(CliUsageError);
  });
});

describe('actions', () => {
  test('negation', async () => {
    await check(
      cli()
        .option('--foo')
        .option('--no-foo')
        .optionNegation('foo', 'noFoo'),
      '--foo',
    )
      .result({
        options: { foo: true, noFoo: false },
        parsed: ['foo'],
      });
    await check(
      cli()
        .option('--foo')
        .option('--no-foo')
        .optionNegation('foo', 'noFoo'),
      '--no-foo',
    )
      .result({
        options: { foo: false, noFoo: true },
        parsed: ['noFoo'],
      });
    await check(
      cli()
        .option('--foo')
        .option('--no-foo')
        .optionNegation('foo', 'noFoo'),
      '--foo --no-foo',
    )
      .result({
        options: { foo: false, noFoo: true },
        parsed: ['foo', 'noFoo'],
      });
    await check(
      cli()
        .option('--foo')
        .option('--no-foo')
        .optionNegation('foo', 'noFoo'),
      '--no-foo --foo',
    )
      .result({
        options: { foo: true, noFoo: false },
        parsed: ['foo', 'noFoo'],
      });
  });

  test('conflict', async () => {
    await check(
      cli()
        .option('-a')
        .option('-b')
        .optionConflict('a', 'b'),
      '-a -b',
    ).rejects.toThrow(CliUsageError);
    await check(
      cli()
        .option('-a')
        .option('-b')
        .optionConflict('a', 'b'),
      '-b -c',
    ).rejects.toThrow(CliUsageError);
    await check(
      cli()
        .option('-a')
        .option('-b')
        .optionConflict('a', 'b'),
      '-a',
    ).resolves.toEqual(expect.anything());
    await check(
      cli()
        .option('-a')
        .option('-b')
        .optionConflict('a', 'b'),
      '-b',
    ).resolves.toEqual(expect.anything());
  });

  test('per option', async () => {
    const spy = vitest.fn()
      .mockImplementation(({ key, value, result }) => {
        result.options[key] = value + value;
        result.options.b = 'bar';
      });

    await check(
      cli()
        .option('-a <value>')
        .option('-b <value>')
        .optionAction('a', spy),
      '-a foo',
    )
      .result({
        options: { a: 'foofoo', b: 'bar' },
        parsed: ['a'],
      });

    expect(spy)
      .toHaveBeenCalledTimes(1);
    expect(spy)
      .toHaveBeenCalledWith({
        key: 'a',
        value: 'foo',
        result: expect.any(Object),
      });
  });

  test('after parse', async () => {
    const spyCleanup = vitest.fn();
    const spy = vitest.fn()
      .mockImplementation(({ options }) => {
        options.a = 'foo';
        return spyCleanup;
      });

    await check(cli()
      .option('-a <value>')
      .action(spy), '')
      .result({
        options: { a: 'foo' },
        parsed: [],
      });

    expect(spy)
      .toHaveBeenCalledTimes(1);
    expect(spyCleanup)
      .toHaveBeenCalledTimes(1);
  });

  test('error', async () => {
    const cause = new Error('test');

    await check(
      cli()
        .action(async () => {
          throw cause;
        }),
      '',
    ).rejects.toThrow(cause);
  });
});

describe('command', () => {
  test('optional', async () => {
    const b = vitest.fn();
    const a = vitest
      .fn()
      .mockImplementation(() => void expect(b).not.toHaveBeenCalled());

    await check(
      cli()
        .option('-a')
        .action(a)
        .setCommandOptional()
        .command(Cli.create('b')
          .option('-b')
          .action(b)),
      '-a b -b',
    )
      .result({
        options: { a: true },
        parsed: ['a'],
        commandResult: { b: { options: { b: true }, parsed: ['b'], commandResult: {} } },
      });

    expect(a)
      .toHaveBeenCalledTimes(1);
    expect(b)
      .toHaveBeenCalledTimes(1);

    a.mockReset();
    b.mockReset();

    await check(
      cli()
        .option('-a')
        .action(a)
        .setCommandOptional()
        .command(Cli.create('b')
          .option('-b')
          .action(b))
        .command(Cli.create('c')),
      '-a',
    )
      .result({
        options: { a: true },
        parsed: ['a'],
        commandResult: {},
      });

    expect(a)
      .toHaveBeenCalledTimes(1);
    expect(b)
      .toHaveBeenCalledTimes(0);
  });

  test('required', async () => {
    const b = vitest.fn();
    const a = vitest
      .fn()
      .mockImplementation(() => void expect(b).not.toHaveBeenCalled());

    await check(
      cli()
        .option('-a')
        .action(a)
        .command(Cli.create('b')
          .option('-b')
          .action(b))
        .command(Cli.create('c')),
      '-a b -b',
    )
      .result({
        options: { a: true },
        parsed: ['a'],
        commandResult: { b: { options: { b: true }, parsed: ['b'], commandResult: {} } },
      });

    expect(a)
      .toHaveBeenCalledTimes(1);
    expect(b)
      .toHaveBeenCalledTimes(1);

    a.mockReset();
    b.mockReset();

    await check(
      cli()
        .option('-a')
        .action(a)
        .command(Cli.create('b')
          .option('-b')
          .action(b)),
      '-a',
    ).rejects.toThrow();
  });

  test('default', async () => {
    const root = vitest.fn();
    const a = vitest.fn();
    const b = vitest.fn();

    await check(
      cli()
        .action(root)
        .command(Cli.create('a')
          .action(a)
          .setDefault())
        .command(Cli.create('b')
          .action(b)),
      '',
    )
      .result({
        commandResult: { a: { options: {} } },
      });

    expect(root)
      .toHaveBeenCalledTimes(1);
    expect(a)
      .toHaveBeenCalledTimes(1);
    expect(b)
      .toHaveBeenCalledTimes(0);

    root.mockReset();
    a.mockReset();
    b.mockReset();

    await check(
      cli()
        .action(root)
        .command(Cli.create('a')
          .action(a)
          .setDefault())
        .command(Cli.create('b')
          .action(b)),
      'b',
    )
      .result({
        commandResult: { b: { options: {} } },
      });

    expect(root)
      .toHaveBeenCalledTimes(1);
    expect(a)
      .toHaveBeenCalledTimes(0);
    expect(b)
      .toHaveBeenCalledTimes(1);
  });

  test('not after first positional', async () => {
    await check(
      cli()
        .option('[foo...]')
        .setCommandOptional()
        .command(cli()
          .name('a')),
      'foo a',
    )
      .result({
        options: { foo: ['foo', 'a'] },
        parsed: ['foo'],
        commandResult: {},
      });
  });
});

describe('validation', () => {
  test('invalid command name', () => {
    expect(() => Cli.create('' as string))
      .toThrow();
    expect(() => Cli.create(' test' as string))
      .toThrow();
    expect(() => Cli.create('-test' as string))
      .toThrow();
    expect(() => Cli.create('foo|bar' as string))
      .toThrow();
  });

  test('conflicting two positional options', () => {
    expect(() => {
      cli()
        .option('[foo]')
        .option('[bar]')
        .optionConflict('foo', 'bar');
    })
      .toThrow();
  });

  test('non-unique option names', () => {
    expect(() => cli()
      .option('-a')
      .option('-a'))
      .toThrow();
    expect(() => cli()
      .option('-a, --aa')
      .option('-b, --aa'))
      .toThrow();
  });

  test('non-unique option key', () => {
    expect(() => cli()
      .option('-a', { key: 'b' })
      .option('-b'))
      .toThrow();
  });

  test('variadic positional option not last', () => {
    expect(() => cli()
      .option('[foo...]')
      .option('[bar]'))
      .toThrow();
    expect(() => cli()
      .option('<foo...>')
      .option('[bar]'))
      .toThrow();
    expect(() => cli()
      .option('[foo...]')
      .option('[bar...]'))
      .toThrow();
    expect(() => cli()
      .option('<foo...>')
      .option('[bar...]'))
      .toThrow();
  });

  test('required positional option not first', () => {
    expect(() => cli()
      .option('[foo]')
      .option('<bar>'))
      .toThrow();
    expect(() => {
      cli()
        .option('<foo>')
        .option('[bar]')
        .option('<baz>');
    })
      .toThrow();
  });

  test('required positional option with commands', () => {
    expect(() => cli()
      .option('<foo>')
      .command(cli()))
      .toThrow();
    expect(() => cli()
      .command(cli())
      .option('<foo>'))
      .toThrow();
  });

  test('non-unique command name', () => {
    expect(() => {
      cli()
        .command(cli()
          .name('a'))
        .command(cli()
          .name('a'));
    })
      .toThrow();
    expect(() => {
      cli()
        .command(cli()
          .name('a'))
        .command(cli()
          .name('b')
          .alias('a'));
    }).not.toThrow();
  });

  test('default command with positional option', () => {
    expect(() => cli()
      .command(cli()
        .setDefault())
      .option('[foo]'))
      .toThrow();
    expect(() => cli()
      .option('[foo]')
      .command(cli()
        .setDefault()))
      .toThrow();
  });
});

describe('double hyphen', () => {
  test('prevents named parsing', async () => {
    await check(
      cli()
        .option('-a')
        .option('-b')
        .option('[rest...]'),
      '-a foo -- -b --',
    )
      .result({
        options: { a: true, b: undefined, rest: ['foo', '-b', '--'] },
        parsed: ['a', 'rest'],
      });
  });

  test('allows command matching', async () => {
    await check(
      cli()
        .option('-a')
        .option('-b')
        .command(cli()
          .name('a')
          .option('[rest...]')
          .setUnknownNamedOptionAllowed()),
      '-a -- a -a -- -b --',
    )
      .result({
        options: { a: true, b: undefined },
        parsed: ['a'],
        // The '-a' arg is used as a positional and not handled as a named parent option, because the first '--' passed
        // to the parent prevents the parent from parsing named options, even when the child is still parsing named
        // options.
        commandResult: {
          a: {
            options: { rest: ['-a', '-b', '--'] },
            parsed: ['rest'],
            commandResult: {},
          },
        },
      });
  });
});

describe('exit', () => {
  test('default', async () => {
    const errorSpy = vitest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    await check(Cli.create('test')
      .setExitOnError(true), '-a').rejects.toThrow('process.exit');
    expect(errorSpy.mock.calls.at(0)
      ?.at(0))
      .toMatchInlineSnapshot(`
      "Usage: test 

      Error: unknown option "-a""
    `);
  });

  test('action error', async () => {
    const errorSpy = vitest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    await check(
      Cli.create('test')
        .setExitOnError(true)
        .action(() => {
          throw new Error('test');
        }),
      '',
    ).rejects.toThrow('process.exit');
    expect(errorSpy.mock.calls.at(0)
      ?.at(0))
      .toMatchInlineSnapshot(`"Error: test"`);
  });
});

test('help', () => {
  const logSpy = vitest.spyOn(console, 'log')
    .mockImplementation(() => {});
  const errorSpy = vitest.spyOn(console, 'error')
    .mockImplementation(() => {});
  const command = cli()
    .alias('t')
    .description('foo')
    .description('bar')
    .version('1.2.3')
    .option('-a, --aa', { description: 'option aa', group: 'Bar Options' })
    .option('-b, --bb <value>', 'option bb')
    .option('[value]', {
      description: 'optional positional value',
      group: 'Other Arguments',
    })
    .option('[values...]', 'optional positional values')
    .optionHelp('--help', { group: 'Foo Options' })
    .optionVersion('--version')
    .trailer('oof')
    .trailer('rab')
    .command(Cli.create('a')
      .alias('aa')
      .description('command a'))
    .command(Cli.create('b')
      .alias('bb')
      .description('command b'));

  command.printHelp();
  command.printHelp(new Error('foo'));

  expect(logSpy.mock.calls.at(0)
    ?.at(0))
    .toMatchInlineSnapshot(`
    "Usage: test|t [options] <command>
           test|t [options] [value] [values...]
           test|t --help
           test|t --version

    foo

    bar

    Bar Options:
      -a, --aa  option aa

    Options:
      -b, --bb <value>  option bb
      --version         print the version number

    Other Arguments:
      [value]  optional positional value

    Arguments:
      [values...]  optional positional values

    Foo Options:
      --help  print this help text

    Commands:
      a|aa  command a
      b|bb  command b

    oof

    rab
    "
  `);

  expect(errorSpy.mock.calls.at(0)
    ?.at(0))
    .toMatchInlineSnapshot(`
    "Usage: test|t [options] <command>
           test|t [options] [value] [values...]
           test|t --help
           test|t --version

    foo

    bar

    Bar Options:
      -a, --aa  option aa

    Options:
      -b, --bb <value>  option bb
      --version         print the version number

    Other Arguments:
      [value]  optional positional value

    Arguments:
      [values...]  optional positional values

    Foo Options:
      --help  print this help text

    Commands:
      a|aa  command a
      b|bb  command b

    oof

    rab

    Error: foo"
  `);
});
