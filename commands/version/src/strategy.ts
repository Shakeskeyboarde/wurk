import semver from 'semver';
import { type Git, type Workspace } from 'wurk';

import { type Change } from './change.js';
import { auto } from './strategies/auto.js';
import { increment } from './strategies/increment.js';
import { literal } from './strategies/literal.js';
import { promote } from './strategies/promote.js';

type Strategy = semver.ReleaseType | 'auto' | 'promote' | semver.SemVer;
type StrategyCallback = (
  workspace: Workspace,
) => Promise<readonly Change[] | void>;

export const parseStrategy = (value: string): Strategy => {
  switch (value) {
    case 'major':
    case 'minor':
    case 'patch':
    case 'premajor':
    case 'preminor':
    case 'prepatch':
    case 'prerelease':
    case 'auto':
    case 'promote':
      return value;
  }

  try {
    return new semver.SemVer(value);
  }
  catch {
    throw new Error('invalid strategy');
  }
};

export const getStrategyCallback = (
  strategy: Strategy,
  git: Git | null,
  preid?: string,
): StrategyCallback => {
  if (typeof strategy === 'string') {
    switch (strategy) {
      case 'auto':
        if (!git) throw new Error('auto versioning requires a Git repository');
        return auto.bind(null, git);
      case 'promote':
        return promote;
      default:
        return increment.bind(null, { releaseType: strategy, preid });
    }
  }

  return literal.bind(null, { version: strategy });
};
