module.exports = {
  root: true,
  env: { node: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  extends: ['rational', 'rational/warn', 'rational/prettier'],
  ignorePatterns: ['node_modules', '**/lib/**', 'out', 'dist'],
  overrides: [
    {
      files: ['*.cjs'],
      parserOptions: { sourceType: 'script' },
    },
    {
      files: ['*.ts'],
      extends: ['rational/typescript', 'rational/prettier'],
      parserOptions: { project: './tsconfig.json' },
    },
  ],
};
