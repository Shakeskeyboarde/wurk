export const getIsNpmVersionPublished = async (id: string, version: string): Promise<boolean> => {
  return await spawn('npm', ['info', `${id}@${version}`]).succeeded();
};

export const getNpmCommitMetadata = async (id: string, version: string): Promise<string | null> => {
  return await spawn('npm', ['info', `${id}@${version}`, '--quiet', '--json'], { capture: true })
    .json<{ _commit?: unknown } | null>()
    .then((value) => (value?.commit === 'string' ? value?.commit : null))
    .catch(() => null);
};
