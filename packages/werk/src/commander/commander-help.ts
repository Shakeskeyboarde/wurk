import { type Command as CommanderBase, Help } from '@commander-js/extra-typings';

export class CommanderHelp extends Help {
  wrap(str: string, width: number, indent: number, minColumnWidth?: number): string {
    str = str.replace(/\n[^\S\r\n]+/gu, '\n').replace(/(?<!\n)\n(?!\n)/gu, ' ');
    return super.wrap(str, width, indent, minColumnWidth);
  }

  formatHelp(commander: CommanderBase, helper: Help): string {
    const helpWidth = helper.helpWidth || 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 3; // between term and description

    const formatItem = (term: string, description: string, termWidth: number): string => {
      if (description) {
        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
        return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
      }
      return term;
    };

    const formatList = (textArray: string[]): string => {
      return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
    };

    // Usage

    let output = [`Usage: ${helper.commandUsage(commander)}`, ''];

    // Description

    const commandDescription = helper.commandDescription(commander);

    if (commandDescription.length > 0) {
      output = output.concat([helper.wrap(commandDescription, helpWidth, 0), '']);
    }

    // Options

    const optionList = helper.visibleOptions(commander).map((option) => {
      return formatItem(
        helper.optionTerm(option),
        helper.optionDescription(option),
        helper.longestOptionTermLength(commander, helper),
      );
    });

    if (optionList.length > 0) {
      output = output.concat(['Options:', formatList(optionList), '']);
    }

    if (this.showGlobalOptions) {
      const globalOptionList = helper.visibleGlobalOptions(commander).map((option) => {
        return formatItem(
          helper.optionTerm(option),
          helper.optionDescription(option),
          helper.longestGlobalOptionTermLength(commander, helper),
        );
      });

      if (globalOptionList.length > 0) {
        output = output.concat(['Global Options:', formatList(globalOptionList), '']);
      }
    }

    // Arguments

    const argumentList = helper.visibleArguments(commander).map((argument) => {
      return formatItem(
        helper.argumentTerm(argument),
        helper.argumentDescription(argument),
        helper.longestArgumentTermLength(commander, helper),
      );
    });

    if (argumentList.length > 0) {
      output = output.concat(['Arguments:', formatList(argumentList), '']);
    }

    // Commands

    const commandList = helper.visibleCommands(commander).map((cmd) => {
      return formatItem(
        helper.subcommandTerm(cmd),
        helper.subcommandDescription(cmd),
        helper.longestSubcommandTermLength(commander, helper),
      );
    });

    if (commandList.length > 0) {
      output = output.concat(['Commands:', formatList(commandList), '']);
    }

    return output.join('\n');
  }
}
