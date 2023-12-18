import rational from 'eslint-config-rational';

export default rational({
  ignores: ['**/{.git,node_modules,out,lib,dist}'],
  override: [
    {
      files: ['packages/vite-config/src/logger.ts', 'packages/vite-config/src/plugins/*'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
});
