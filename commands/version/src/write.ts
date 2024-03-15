import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import semver from 'semver';
import { type Workspace } from 'wurk';

import { type Change, ChangeType } from './change.js';

enum ChangelogSection {
  hidden,
  breaking,
  feat,
  fix,
  improvement,
  perf,
  refactor,
  tests,
  docs,
  build,
  ci,
  chore,
  revert,
  note,
}

export const writeConfig = async (workspace: Workspace, version: string): Promise<void> => {
  const { log, dir, config } = workspace;
  const configFilename = nodePath.resolve(dir, 'package.json');

  log.debug`writing config`;

  await nodeFs.writeFile(
    configFilename,
    config
      .copy({
        initializer: (copy) => copy
          .at('version')
          .set(version),
      })
      .toString(2),
  );
};

export const writeChangelog = async (
  workspace: Workspace,
  changes: readonly Change[] = [],
): Promise<void> => {
  const { log, dir, name, version, config } = workspace;
  const newVersion = config
    .at('version')
    .as('string');

  if (!newVersion) {
    // Can't write a changelog without a version for the heading.
    log.debug`skipping changelog write (no version)`;
    return;
  }

  if (newVersion === version) {
    log.debug`skipping changelog write (no version change)`;
    return;
  }

  if (semver.prerelease(newVersion)?.length) {
    log.debug`skipping changelog write (prerelease version)`;
    return;
  }

  const changelogFilename = nodePath.resolve(dir, 'CHANGELOG.md');
  const changelogContent = await nodeFs.readFile(changelogFilename, 'utf8')
    .catch((error: any) => {
      if (error?.code === 'ENOENT') return '';
      throw error;
    });

  /**
   * Change log entries sorted by version in descending order.
   */
  const entries = [...changelogContent.matchAll(/^#+ (\d+\.\d+\.\d+(?:-[a-z\d.+-]*)?)(?:.(?!^#+ \d+\.\d+\.\d))*.?/gmsu)]
    .map((entry) => ({
      version: entry[1] as string,
      text: entry[0].trimEnd() + '\n',
    }))
    .sort((a, b) => semver.rcompare(a.version, b.version));

  /**
   * Index of the previous (or current) version. The entries list is in
   * descending order (greatest first), so we want the first (highest) entry
   * that is less than or equal (`semver.lte`) to the new version.
   */
  const previousVersionIndex = entries.findIndex((entry) => {
    return semver.lte(entry.version, newVersion);
  });

  if (previousVersionIndex >= 0 && newVersion === entries[previousVersionIndex]?.version) {
    log.warn`changelog already has an entry for ${newVersion}`;
    return;
  }

  log.debug`writing changelog`;

  const sortedChanges = changes
    .map((change) => ({ ...change, section: getChangelogSection(change.type) }))
    .filter((change) => change.section !== ChangelogSection.hidden)
    .sort((a, b) => a.section - b.section);

  let text = `${getHeadingPrefix(newVersion)} ${newVersion} (${getDate()})\n`;
  let section: ChangelogSection | undefined;

  sortedChanges.forEach((change) => {
    // Omit parts of the scope that match all or part of the workspace name.
    const nameParts = name.split('/');
    const scope = change.scope
      ?.split('/')
      .filter((part) => !nameParts.includes(part.toLocaleLowerCase())
      && !nameParts[nameParts.length - 1]?.includes(part.toLocaleLowerCase()))
      .join('/');

    if (section !== change.section) {
      section = change.section;
      text += `\n#### ${getChangelogHeading(change.section)}\n\n`;
    }

    text += `- ${scope ? `**${scope}:** ` : ''}${change.message}\n`;
  });

  const newEntry = { version: newVersion, text };

  if (previousVersionIndex < 0) {
    // Append to the end of the changelog (new lowest version).
    entries.push(newEntry);
  }
  else {
    // Insert before the previous (next lowest) version in the changelog.
    entries.splice(previousVersionIndex, 0, newEntry);
  }

  const result = entries
    .map((entry) => entry.text)
    .join('\n');

  await nodeFs.writeFile(changelogFilename, result);
};

const getHeadingPrefix = (version: string): '#' | '##' | '###' => {
  return !semver.patch(version) ? (!semver.minor(version) ? '#' : '##') : '###';
};

const getDate = (): string => {
  const now = new Date();

  return [
    now.getFullYear(),
    (now.getMonth() + 1)
      .toString(10)
      .padStart(2, '0'),
    now.getDate()
      .toString(10)
      .padStart(2, '0'),
  ].join('-');
};

const getChangelogSection = (type: ChangeType): ChangelogSection => {
  switch (type) {
    case ChangeType.breaking:
      return ChangelogSection.breaking;
    case ChangeType.feat:
      return ChangelogSection.feat;
    case ChangeType.fix:
      return ChangelogSection.fix;
    case ChangeType.improvement:
      return ChangelogSection.improvement;
    case ChangeType.perf:
      return ChangelogSection.perf;
    case ChangeType.refactor:
      return ChangelogSection.refactor;
    case ChangeType.tests:
      return ChangelogSection.tests;
    case ChangeType.docs:
      return ChangelogSection.docs;
    case ChangeType.build:
      return ChangelogSection.build;
    case ChangeType.ci:
      return ChangelogSection.ci;
    case ChangeType.chore:
      return ChangelogSection.chore;
    case ChangeType.revert:
      return ChangelogSection.revert;
    case ChangeType.note:
      return ChangelogSection.note;
    case ChangeType.none:
      return ChangelogSection.hidden;
  }
};

const getChangelogHeading = (section: ChangelogSection): string => {
  switch (section) {
    case ChangelogSection.breaking:
      return 'Breaking Changes';
    case ChangelogSection.feat:
      return 'Features';
    case ChangelogSection.fix:
      return 'Bug Fixes';
    case ChangelogSection.improvement:
      return 'Improvements';
    case ChangelogSection.perf:
      return 'Performance Improvements';
    case ChangelogSection.refactor:
      return 'Code Refactoring';
    case ChangelogSection.tests:
      return 'Tests';
    case ChangelogSection.docs:
      return 'Documentation';
    case ChangelogSection.build:
      return 'Build System';
    case ChangelogSection.ci:
      return 'Continuous Integration';
    case ChangelogSection.chore:
      return 'Chores';
    case ChangelogSection.revert:
      return 'Reverts';
    case ChangelogSection.note:
    default:
      return 'Notes';
  }
};
