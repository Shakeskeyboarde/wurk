import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { eq, lte, rcompare, SemVer } from 'semver';

import { type Change } from './get-changes.js';

interface Entry {
  version: string;
  text: string;
}

enum Section {
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

const CHANGE_SECTIONS: Readonly<Record<string, Section>> = {
  'breaking change': Section.breaking,
  'breaking-change': Section.breaking,
  'breaking changes': Section.breaking,
  'breaking-changes': Section.breaking,
  feat: Section.feat,
  feature: Section.feat,
  features: Section.feat,
  fix: Section.fix,
  fixes: Section.fix,
  fixed: Section.fix,
  refactor: Section.refactor,
  refactors: Section.refactor,
  improve: Section.improvement,
  improvement: Section.improvement,
  improvements: Section.improvement,
  perf: Section.perf,
  performance: Section.perf,
  test: Section.tests,
  tests: Section.tests,
  doc: Section.docs,
  docs: Section.docs,
  build: Section.build,
  ci: Section.ci,
  revert: Section.revert,
  reverts: Section.revert,
  note: Section.note,
  notes: Section.note,
};

const SECTION_HEADINGS: Readonly<Record<Section, string>> = {
  [Section.breaking]: 'Breaking Changes',
  [Section.feat]: 'Features',
  [Section.fix]: 'Bug Fixes',
  [Section.refactor]: 'Code Refactoring',
  [Section.improvement]: 'Improvements',
  [Section.perf]: 'Performance Improvements',
  [Section.tests]: 'Tests',
  [Section.docs]: 'Documentation',
  [Section.build]: 'Build System',
  [Section.ci]: 'Continuous Integration',
  [Section.chore]: 'Chores',
  [Section.revert]: 'Reverts',
  [Section.note]: '',
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
    .map((change) => ({ ...change, section: CHANGE_SECTIONS[change.type] ?? Section.chore }))
    .sort((a, b) => a.section - b.section);

  let text = `${isMajorUpdate ? '#' : '##'} ${version.format()} (${dateString})\n`;
  let section: Section | undefined;

  sortedChanges.forEach((change) => {
    // Skip notes. They go at the end.
    if (change.section === Section.note) return;

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
      text += `\n### ${SECTION_HEADINGS[section]}\n\n`;
    }

    text += `- ${scope ? `**${scope}:** ` : ''}${change.message}\n`;
  });

  sortedChanges
    .filter((change) => change.section === Section.note)
    .forEach((change) => {
      text += `\n**Note${change.scope ? ` (${change.scope})` : ''}**: ${change.message}\n`;
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
