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

assert(!existsSync(resolve(dir, 'package.json')), 'target directory already has a package.json file');

const ghUser = await execa('gh', ['api', 'user'])
  .then((result): { login: string; html_url: string; name: string; email: string } => JSON.parse(result.stdout))
  .catch(() => undefined);
const gitName =
  ghUser?.name ||
  (await execa('git', ['config', '--get', 'user.name'])
    .then((result) => result.stdout)
    .catch(() => undefined));
const gitEmail =
  ghUser?.email ||
  (await execa('git', ['config', '--get', 'user.email'])
    .then((result) => result.stdout)
    .catch(() => undefined));

const rl = createInterface({
  input: process.stdin,
  output: process.stderr,
});

const description = await rl.question('Description? ');
const author = gitName || (await rl.question('Author Name? '));
const email = gitEmail || (await rl.question('Author Email? '));

const license = await rl.question('License? ');
const licenseText =
  license === 'UNLICENSED'
    ? author
      ? `Copyright © ${new Date().getFullYear()} ${author}\n`
      : undefined
    : license &&
      getLicense(license, {
        author,
        name: author,
        email,
        year: new Date().getFullYear().toString(10),
      });

const gitRepo = ghUser?.html_url
  ? `${ghUser.html_url}/${basename(dir)}`
  : await rl.question('Git Repo (shorthand allowed)? ');
const gitRepoParsed = gitRepo ? gitUrlParse(gitRepo) : undefined;

const config = {
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

console.error('\n' + JSON.stringify(config, null, 2) + '\n');

const isConfirmed = await rl
  .question('Does the above package.json look correct? [Y/n] ')
  .then((answer) => !answer || /^y(?:es)?$/u.test(answer));

if (!isConfirmed) process.exit(0);

await mkdir(resolve(dir, 'packages'), { recursive: true });

process.chdir(dir);

await writeFile('package.json', JSON.stringify(config, null, 2), { flag: 'wx' });
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
  `# ${gitRepoParsed?.name || basename(dir)}\n${config.description ? `\n${config.description}\n` : ''}`,
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
          lib: ['ES2022'],
          types: [],
          strict: true,
          skipLibCheck: true,
          isolatedModules: true,
          forceConsistentCasingInFileNames: true,
          noUncheckedIndexedAccess: true,
          esModuleInterop: true,
          allowJs: true,
          checkJs: true,
          noEmit: true,
        },
        exclude: ['node_modules', 'lib', 'dist', 'out', 'coverage'],
      },
      null,
      2,
    ),
    { flag: 'wx' },
  ).catch(() => undefined);

  await execa('npm', ['install', '--save-dev', 'typescript'], { stdio: 'ignore', reject: false });
}

await execa('git', ['init'], { stdio: 'ignore', reject: false });
await execa('git', ['add', '.'], { stdio: 'ignore', reject: false });
await execa('git', ['commit', '-m', 'Initial commit.'], { stdio: 'ignore', reject: false });

rl.close();
