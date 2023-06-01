module.exports = {
  root: true,
  env: { node: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  extends: ['rational', 'rational/react', 'rational/warn', 'rational/prettier'],
  ignorePatterns: ['node_modules', '**/lib/**', 'out', 'dist'],
  overrides: [
    {
      files: ['*.cjs'],
      parserOptions: { sourceType: 'script' },
    },
    {
      files: ['*.ts', '*.tsx'],
      extends: ['rational/typescript', 'rational/prettier'],
      parserOptions: { project: './tsconfig.json' },
    },
  ],
};
