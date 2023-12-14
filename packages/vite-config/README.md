# Werk Vite Config Factory

Generate an opinionated Vite config from a small declarative set of options.

## Install

```sh
npm i -D @werk/vite-config
```

## Usage

Create a `vite.config.ts` file in your workspace root. Call the `defineWerkConfig` function, passing in options as required.

```ts
import { defineWerkConfig } from '@werk/vite-config';

export default defineWerkConfig({
  // options
});
```

## Run Tests

```sh
# werk vitest [args...]
werk vitest run
```

By default, this will also run the `build` script from the root `package.json` file (if present), before running vitest. To skip building, use the `--no-build` option.

```sh
werk vitest run --no-build
```
