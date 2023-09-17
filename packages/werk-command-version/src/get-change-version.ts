import { type ReleaseType, SemVer } from 'semver';

import { type Change } from './get-changes.js';

const RELEASE_TYPES: Readonly<Record<string, 'patch' | 'minor' | 'major'>> = {
  'breaking change': 'major',
  'breaking-change': 'major',
  'breaking changes': 'major',
  'breaking-changes': 'major',
  feat: 'minor',
  feature: 'minor',
  features: 'minor',
};

export const getChangeVersion = (version: string | SemVer, changes: readonly Change[]): SemVer => {
  version = new SemVer(version);

  const releaseType = changes.reduce<Exclude<ReleaseType, `pre${string}`>>((acc, change) => {
    const value = RELEASE_TYPES[change.type] ?? 'patch';

    switch (value) {
      case 'major':
        return 'major';
      case 'minor':
        return acc === 'patch' ? 'minor' : acc;
      case 'patch':
        return acc;
    }
  }, 'patch');

  return version.inc(releaseType);
};
