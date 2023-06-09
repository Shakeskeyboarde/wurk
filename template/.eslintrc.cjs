module.exports = {
  root: true,
  env: { node: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['node_modules', '**/lib/**', 'out', 'dist'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'CallExpression:matches([callee.property.name="log"][callee.object.name="console"], [callee.property.name="warn"][callee.object.name="console"], [callee.property.name="error"][callee.object.name="console"])',
        message: 'Use the Werk `context.log` instead of the global console object.',
      },
      {
        selector: 'CallExpression[callee.property.name="exit"][callee.object.name="process"]',
        message:
          'Throw an error or set `process.exitCode` and return from the handler instead of calling `process.exit()`.',
      },
    ],
  },
};
