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
  version: string,
  changes: readonly Change[] = [],
): Promise<void> => {
  const { log, dir, name } = workspace;

  if (semver.prerelease(version)?.length) {
    log.debug`skipping changelog write (prerelease version)`;
    return;
  }

  const filename = nodePath.resolve(dir, 'CHANGELOG.md');

  const content = await nodeFs.readFile(filename, 'utf8')
    .catch((error: any) => {
      if (error?.code === 'ENOENT') return '';
      throw error;
    });

  const entries = [...content.matchAll(/^#+ (\d+\.\d+\.\d+(?:-\S+)?)(?:.(?!^#+ \d+\.\d+\.\d))*[\r\n]*/gmsu)]
    .map((entry) => ({
      version: entry[1]!,
      text: entry[0],
    }))
    .filter((entry) => entry.version !== version);

  entries.push({
    version,
    text: getEntryText(name, version, changes),
  });

  const entriesText = entries
    .sort((a, b) => semver.rcompare(a.version, b.version))
    .map((entry) => entry.text)
    .join('');

  const newContent = `${CHANGELOG_HEADER}\n${entriesText}`;

  log.debug`writing changelog`;

  await nodeFs.writeFile(filename, newContent);
};

const getEntryText = (name: string, version: string, changes: readonly Change[]): string => {
  const sorted = changes
    .map((change) => ({ ...change, section: getChangelogSection(change.type) }))
    .filter((change) => change.section !== ChangelogSection.hidden)
    .sort((a, b) => a.section - b.section);

  let text = `## ${version} (${getDate()})\n`;
  let section: ChangelogSection | undefined;

  sorted.forEach((change) => {
    // Omit parts of the scope that match all or part of the workspace name.
    const nameParts = name.split('/');
    const scope = change.scope
      ?.split('/')
      .filter((part) => !nameParts.includes(part.toLocaleLowerCase())
      && !nameParts[nameParts.length - 1]?.includes(part.toLocaleLowerCase()))
      .join('/');

    if (section !== change.section) {
      section = change.section;
      text += `\n### ${getChangelogHeading(change.section)}\n\n`;
    }

    text += `- ${scope ? `**${scope}:** ` : ''}${change.message}\n`;
  });

  return text + '\n';
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
    default:
      return 'Other Changes';
  }
};

const CHANGELOG_HEADER = `
# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.
`.trim() + '\n';
