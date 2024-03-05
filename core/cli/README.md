# Wurk CLI

CLI argument parsing.

## Getting Started

Install the package.

```sh
npm install --save @wurk/cli
```

Define a cli.

```ts
import { Cli } from '@wurk/cli';

const cli = Cli.create('my-cli')
  .description('This is my CLI.')
  .optionHelp() // Add -h|--help options which print usage and exit.
  .option('-f, --flag', 'named boolean option which accepts no value')
  .option('--named <value>', 'named option which requires a value')
  .option('<positional>', 'positional option which is required');
```

Use the CLI to parse command line arguments.

```ts
const result = async cli.parse();

result.options.flag; // boolean
result.options.named; // string
result.options.positional; // string
```
