export const isEsmEntry = (packageJson: Record<string, unknown>): boolean => {
  return Boolean(packageJson.exports || (packageJson.bin && packageJson.type === 'module'));
};

export const isCommonJsEntry = (packageJson: Record<string, unknown>): boolean => {
  return Boolean(packageJson.main || (packageJson.bin && (!packageJson.type || packageJson.type === 'commonjs')));
};
