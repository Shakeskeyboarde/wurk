#!/usr/bin/env node
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';

import { execa } from 'execa';
import gitUrlParse from 'git-url-parse';
import { getLicense } from 'license';
import wrapText from 'wrap-text';

process.on('uncaughtException', (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(process.exitCode || 1);
});
process.on('unhandledRejection', (error) => {
  throw error;
});

let [dir = '.'] = process.argv.slice(2);

dir = resolve(dir);
assert(!existsSync(resolve(dir, 'package.json')), 'The target directory already has a package.json file.');

const rl = createInterface({
  input: process.stdin,
  output: process.stderr,
});

const description = await rl.question('Description? ');
const author = await rl.question('Author Name? ');
const email = await rl.question('Author Email? ');
const license = await rl.question('License? ');
const gitRepo = await rl.question('Git Repo (shorthand allowed)? ');

const licenseText =
  license &&
  getLicense(license, {
    author,
    name: author,
    email,
    year: new Date().getFullYear().toString(10),
  });
const gitRepoParsed = gitRepo ? gitUrlParse(gitRepo) : undefined;
const packageJson = {
  private: true,
  name: 'root',
  description: description || undefined,
  version: '1.0.0',
  author: author ? `${author}${email ? ` <${email}>` : ''}` : undefined,
  license: license || undefined,
  repository: gitRepoParsed
    ? {
        type: 'git',
        url: gitRepoParsed.href,
      }
    : undefined,
  scripts: {},
  type: 'module',
  workspaces: ['packages/*'],
};

console.error('\n' + JSON.stringify(packageJson, null, 2) + '\n');

const isConfirmed = await rl
  .question('Does the above package.json look correct? [Y/n] ')
  .then((answer) => !answer || /^y(?:es)?$/u.test(answer));

if (!isConfirmed) process.exit(0);

await mkdir(resolve(dir, 'packages'), { recursive: true });

process.chdir(dir);

await writeFile('package.json', JSON.stringify(packageJson, null, 2), { flag: 'wx' });
await writeFile('packages/.gitkeep', '', { flag: 'wx' }).catch(() => undefined);
await writeFile(
  '.gitignore',
  `
.vscode
node_modules
lib
out
dist
coverage

*.log
*.tar
*.gz
*.tgz
*.zip
  `.trim() + '\n',
  { flag: 'wx' },
).catch(() => undefined);
await writeFile(
  'README.md',
  `# ${gitRepoParsed?.name || basename(dir)}\n${packageJson.description ? `\n${packageJson.description}\n` : ''}`,
  {
    flag: 'wx',
  },
).catch(() => undefined);

if (licenseText) {
  await writeFile('LICENSE', wrapText(licenseText, 79), { flag: 'wx' }).catch(() => undefined);
}

const isTypescript = await rl
  .question('Use Typescript? [Y/n] ')
  .then((answer) => !answer || /^y(?:es)?$/u.test(answer));

if (isTypescript) {
  await writeFile(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          target: 'ES2022',
          allowJs: true,
          strict: true,
          skipLibCheck: true,
          esModuleInterop: true,
          isolatedModules: true,
          forceConsistentCasingInFileNames: true,
          noUncheckedIndexedAccess: true,
          declaration: true,
          sourceMap: true,
          noEmit: true,
        },
        exclude: ['node_modules', 'lib', 'dist', 'out', 'coverage'],
      },
      null,
      2,
    ),
    { flag: 'wx' },
  ).catch(() => undefined);

  await execa('npm', ['install', '--silent', '--save-dev', 'typescript'], {
    stdio: 'inherit',
    reject: false,
  });
}

rl.close();
