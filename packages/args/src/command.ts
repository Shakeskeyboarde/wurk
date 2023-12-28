import { createNamed } from './create-named.js';
import { createPositional } from './create-positional.js';
import { Help } from './help.js';
import { Parser } from './parser.js';
import { Program } from './program.js';
import { type Action } from './types/action.js';
import { type CommandType } from './types/command.js';
import { type CommandConfig } from './types/command-config.js';
import { type CommandState } from './types/command-state.js';
import { type CommandStateFrom } from './types/command-state-from.js';
import { type ArgsErrorType } from './types/error.js';
import { type HelpType } from './types/help.js';
import { type Named } from './types/named.js';
import { type NamedConfig } from './types/named-config.js';
import { type NamedInitialValue } from './types/named-initial-value.js';
import { type ParserType } from './types/parser.js';
import { type Positional } from './types/positional.js';
import { type PositionalConfig } from './types/positional-config.js';
import { type PositionalDefaultValue } from './types/positional-default-value.js';
import { type ProgramType } from './types/program.js';
import { type ProgramRunOptions } from './types/program-run-options.js';

export class Command<
  const TName extends string,
  const TNamed extends readonly Named<any, any, any, any>[] = [],
  const TPositional extends readonly Positional<any, any>[] = [],
  const TCommands extends readonly CommandState<any, any, any, any, any>[] = [],
  const TCommandOptional extends boolean = false,
> implements CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>
{
  readonly name;
  readonly aliases;
  readonly descriptions;
  readonly trailers;
  readonly isDefault;
  readonly isGreedy;
  readonly isTrailingNamedOptionPositional;
  readonly isUnknownNamedOptionPositional;
  readonly isCommandOptional;
  readonly namedOptions;
  readonly positionalOptions;
  readonly commands;
  readonly actions;
  readonly help;
  readonly parser;
  readonly parent;

  constructor(config: CommandConfig<TName, TNamed, TPositional, TCommands, TCommandOptional>) {
    const {
      name,
      aliases = [],
      descriptions = [],
      trailers = [],
      isDefault = false,
      isGreedy = false,
      isTrailingNamedOptionPositional = false,
      isUnknownNamedOptionPositional = false,
      isCommandOptional = false,
      namedOptions = [],
      positionalOptions = [],
      commands = [],
      actions = [],
      help = null,
      parser = null,
      parent = null,
    } = config;

    this.name = name;
    this.aliases = aliases;
    this.descriptions = descriptions;
    this.trailers = trailers;
    this.isDefault = isDefault;
    this.isGreedy = isGreedy;
    this.isTrailingNamedOptionPositional = isTrailingNamedOptionPositional;
    this.isUnknownNamedOptionPositional = isUnknownNamedOptionPositional;
    this.isCommandOptional = isCommandOptional as TCommandOptional;
    this.namedOptions = namedOptions as TNamed;
    this.positionalOptions = positionalOptions as TPositional;
    this.commands = commands as TCommands;
    this.actions = actions;
    this.parent = parent;
    this.help = help;
    this.parser = parser;
  }

  alias(alias: string): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, aliases: [...this.aliases, alias] });
  }

  description(description: string): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, descriptions: [...this.descriptions, description] });
  }

  trailer(trailer: string): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, trailers: [...this.trailers, trailer] });
  }

  setDefault(enabled = true): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, isDefault: enabled });
  }

  setGreedy(enabled?: boolean): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, isGreedy: enabled });
  }

  setTrailingNamedOptionPositional(
    enabled?: boolean,
  ): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, isTrailingNamedOptionPositional: enabled });
  }

  setUnknownNamedOptionPositional(
    enabled?: boolean,
  ): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, isUnknownNamedOptionPositional: enabled });
  }

  setCommandOptional<TEnabled extends boolean = true>(
    enabled?: TEnabled,
  ): CommandType<TName, TNamed, TPositional, TCommands, TEnabled> {
    return new Command<TName, TNamed, TPositional, TCommands, TEnabled>({
      ...this,
      // Pre-existing actions will have _partially_ defined types.
      actions: this.actions as Action<any>[],
      isCommandOptional: enabled,
    });
  }

  setHelp(help: HelpType | null): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, help });
  }

  setParser(parser: ParserType | null): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, parser });
  }

  setParent(
    parent: CommandState<any, any, any, any, any> | null,
  ): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, parent, help: this.help ?? parent?.help });
  }

  option<
    TUsage extends `-${string}`,
    TValue = NamedInitialValue<TUsage>,
    TRequired extends boolean = false,
    TMap extends boolean = false,
  >(
    usage: TUsage,
    config: NamedConfig<TUsage, TValue, TRequired, TMap> = {},
  ): CommandType<
    TName,
    readonly [...TNamed, Named<TUsage, TValue, TRequired, TMap>],
    TPositional,
    TCommands,
    TCommandOptional
  > {
    return new Command({
      // Pre-existing actions will have _partially_ defined types.
      ...(this as Omit<CommandConfig<TName, TNamed, TPositional, TCommands, TCommandOptional>, 'actions'>),
      namedOptions: [...this.namedOptions, createNamed(usage, config)],
    });
  }

  positional<TUsage extends `<${string}>` | `[${string}]`, TValue = PositionalDefaultValue<TUsage>>(
    usage: TUsage,
    config: PositionalConfig<TUsage, TValue> = {},
  ): CommandType<TName, TNamed, [...TPositional, Positional<TUsage, TValue>], TCommands, TCommandOptional> {
    return new Command({
      // Pre-existing actions will have _partially_ defined types.
      ...(this as Omit<CommandConfig<TName, TNamed, TPositional, TCommands, TCommandOptional>, 'actions'>),
      positionalOptions: [...this.positionalOptions, createPositional(usage, config)],
    });
  }

  command<TCommand extends CommandType<any, any, any, any, any>>(
    command: TCommand,
  ): CommandType<TName, TNamed, TPositional, [...TCommands, CommandStateFrom<TCommand>], TCommandOptional> {
    return new Command({
      // Pre-existing actions will have _partially_ defined types.
      ...(this as Omit<CommandConfig<TName, TNamed, TPositional, TCommands, TCommandOptional>, 'actions'>),
      commands: [...this.commands, command.setParent(this) as CommandStateFrom<TCommand>],
    });
  }

  action(callback: Action<this>): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional> {
    return new Command({ ...this, actions: [...this.actions, callback] });
  }

  getHelpText(error: Error | null = null): string {
    return (this.help ?? Help.default).format(this, error);
  }

  printHelp(error?: Error): void {
    console.error(this.getHelpText(error));
  }

  parse(args: readonly string[] = process.argv.slice(2)): ProgramType<this> {
    return new Program((this.parser ?? Parser.default).parse(this, args));
  }

  run(args?: readonly string[] | null, options?: ProgramRunOptions): Promise<null | ArgsErrorType> {
    return this.parse(args ?? undefined).run(options);
  }

  static create<TName extends string>(name: TName): CommandType<TName> {
    return new Command({ name });
  }
}

// const command = Command.create('test')
//   .alias('t')
//   .description('Test command')
//   .option('-f, --foo', { required: false })
//   .positional('<bar>')
//   .positional('[baz]')
//   .command(Command.create('test').option('-f'))
//   .command(Command.create('test2'))
//   .setCommandOptional()
//   .action((result) => {
//     result.command;
//     result.name;
//     result.options;
//     result.positional;
//     result.extra;

//     if (result.subcommand?.name === 'test') {
//       result.subcommand.options;
//     }

//     return () => {
//       // after subcommands actions.
//     };
//   })
//   .option('-b');

// const result = command.parse();

// if (result.subcommand?.name === 'test') {
//   result.subcommand.options;
// }
