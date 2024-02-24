import rational from 'eslint-config-rational';

export default rational({
  ignores: ['**/{.git,node_modules,out,lib,dist}'],
  override: [
    {
      rules: {
        'max-lines': [
          'warn',
          { max: 300, skipBlankLines: true, skipComments: true },
        ],
      },
    },
    {
      files: ['core/cli/src/**'],
      rules: {
        'import/group-exports': 'warn',
        'import/exports-last': 'warn',
      },
    },
    {
      files: [
        'core/vite-config/src/logger.ts',
        'core/vite-config/src/plugins/*',
      ],
      rules: {
        'import/no-extraneous-dependencies': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['**/*.test.*'],
      rules: {
        'max-lines': 'off',
      },
    },
  ],
});
