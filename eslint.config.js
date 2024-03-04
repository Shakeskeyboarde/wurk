import rational from 'eslint-config-rational';

export default rational({
  override: [
    {
      files: ['core/cli/src/**'],
      rules: {
        'import/group-exports': 'warn',
        'import/exports-last': 'warn',
      },
    },
  ],
});
