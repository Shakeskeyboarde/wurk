import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { eq, lte, rcompare, SemVer } from 'semver';

import { type Change, ChangeType } from './get-changes.js';

interface Entry {
  version: string;
  text: string;
}

enum Section {
  hidden,
  breaking,
  feat,
  fix,
  refactor,
  improvement,
  perf,
  tests,
  docs,
  build,
  ci,
  chore,
  revert,
  note,
}

const getSection = (type: ChangeType): Section => {
  switch (type) {
    case ChangeType.breaking:
      return Section.breaking;
    case ChangeType.feat:
      return Section.feat;
    case ChangeType.fix:
      return Section.fix;
    case ChangeType.refactor:
      return Section.refactor;
    case ChangeType.improvement:
      return Section.improvement;
    case ChangeType.perf:
      return Section.perf;
    case ChangeType.tests:
      return Section.tests;
    case ChangeType.docs:
      return Section.docs;
    case ChangeType.build:
      return Section.build;
    case ChangeType.ci:
      return Section.ci;
    case ChangeType.chore:
      return Section.chore;
    case ChangeType.revert:
      return Section.revert;
    case ChangeType.note:
      return Section.note;
    case ChangeType.none:
      return Section.hidden;
  }
};

const getHeading = (section: Section): string => {
  switch (section) {
    case Section.breaking:
      return 'Breaking Changes';
    case Section.feat:
      return 'Features';
    case Section.fix:
      return 'Bug Fixes';
    case Section.refactor:
      return 'Code Refactoring';
    case Section.improvement:
      return 'Improvements';
    case Section.perf:
      return 'Performance Improvements';
    case Section.tests:
      return 'Tests';
    case Section.docs:
      return 'Documentation';
    case Section.build:
      return 'Build System';
    case Section.ci:
      return 'Continuous Integration';
    case Section.chore:
      return 'Chores';
    case Section.revert:
      return 'Reverts';
    case Section.note:
    default:
      return 'Notes';
  }
};

export const writeChangelog = async (
  name: string,
  dir: string,
  version: string | SemVer,
  changes: readonly Change[],
): Promise<boolean> => {
  version = new SemVer(version);

  const filename = resolve(dir, 'CHANGELOG.md');
  const content = await readFile(filename, 'utf-8')
    .then((text) => text.trim())
    .catch(() => '');
  const entries = [...content.matchAll(/^#+ (\d+\.\d+\.\d+(?:-[a-z\d.+-]*)?)(?:.(?!^#+ \d+\.\d+\.\d))*.?/gmsu)]
    .map((entry): Entry => ({ version: entry[1] as string, text: entry[0].trimEnd() + '\n' }))
    .sort((a, b) => rcompare(a.version, b.version));
  const index = entries.findIndex((entry) => lte(entry.version, version));

  if (index >= 0 && eq(entries[index]?.version as string, version)) {
    // The version already exists in the changelog.
    return false;
  }

  const isMajorUpdate = !version.minor && !version.patch && version.prerelease.length === 0;
  const date = new Date();
  const dateString = [
    date.getFullYear(),
    (date.getMonth() + 1).toString(10).padStart(2, '0'),
    date.getDate().toString(10).padStart(2, '0'),
  ].join('-');
  const sortedChanges = changes
    .map((change) => ({ ...change, section: getSection(change.type) }))
    .filter((change) => change.section !== Section.hidden)
    .sort((a, b) => a.section - b.section);

  let text = `${isMajorUpdate ? '#' : '##'} ${version.format()} (${dateString})\n`;
  let section: Section | undefined;

  sortedChanges.forEach((change) => {
    // Omit parts of the scope that match all or part of the workspace name.
    const nameParts = name.split('/');
    const scope = change.scope
      ?.split('/')
      .filter(
        (part) =>
          !nameParts.includes(part.toLocaleLowerCase()) &&
          !nameParts[nameParts.length - 1]?.includes(part.toLocaleLowerCase()),
      )
      .join('/');

    if (section !== change.section) {
      section = change.section;
      text += `\n### ${getHeading(change.section)}\n\n`;
    }

    text += `- ${scope ? `**${scope}:** ` : ''}${change.message}\n`;
  });

  const newEntry: Entry = { version: version.format(), text };

  if (index < 0) {
    entries.push(newEntry);
  } else {
    entries.splice(index, 0, newEntry);
  }

  const result = entries.map((entry) => entry.text).join('\n');

  await writeFile(filename, result);

  return true;
};
