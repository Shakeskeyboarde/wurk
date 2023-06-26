import typescript from '@rollup/plugin-typescript';
import { type RollupOptions } from 'rollup';

const config: RollupOptions[] = [
  {
    input: 'src/index.ts',
    output: {
      file: 'lib/index.js',
    },
    plugins: [(typescript as unknown as () => any)()],
  },
];

export default config;
