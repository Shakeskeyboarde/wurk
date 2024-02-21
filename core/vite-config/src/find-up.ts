import path from 'node:path';

export const findUp = async (match: (dir: string) => Promise<boolean>, dir = process.cwd()): Promise<string | null> => {
  dir = path.resolve(dir);
  if (await match(dir).catch(() => false)) return dir;
  const next = path.dirname(dir);
  if (next === dir) return null;
  return await findUp(match, next);
};
