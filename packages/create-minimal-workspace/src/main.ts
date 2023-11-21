#!/usr/bin/env node
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { basename, posix, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';

import { execa } from 'execa';

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

await mkdir(dir, { recursive: true });

const root = await execa('npm', ['query', ':root'], {
  cwd: dir,
  stdio: 'pipe',
})
  .then((result) => JSON.parse(result.stdout))
  .then(([value]) => Array.isArray(value?.workspaces) && value);

assert(root, 'This initializer must be run in workspaces project.');

const rl = createInterface({
  input: process.stdin,
  output: process.stderr,
});

const description = await rl.question('Description? ');
const isLibrary = await rl
  .question('Is this a library? [Y/n] ')
  .then((answer) => !answer || /^y(?:es)?$/u.test(answer));

const rootDir = resolve(root.realpath || root.path);
const repositoryDirectory = relative(rootDir, dir);
const repository =
  typeof root.repository === 'object' && root.repository != null
    ? {
        ...root.repository,
        directory: repositoryDirectory,
      }
    : undefined;
const homepage = repository?.url?.startsWith('https://github.com')
  ? repository.url.replace(/\.git|\/$/u, '') + posix.join('/blob/main', repositoryDirectory, 'README.md')
  : undefined;
const isTypescript = Object.keys({ ...root.devDependencies }).includes('typescript');
const sourceDir = isTypescript ? 'lib' : 'src';
const types = isTypescript ? './lib/index.d.ts' : undefined;
const packageJson = {
  name: basename(dir),
  description: description || undefined,
  version: '1.0.0',
  license: root.license,
  author: root.author,
  repository,
  homepage,
  type: 'module',
  scripts: {},
  ...(isLibrary
    ? {
        files: [sourceDir],
        types,
        exports: {
          '.': {
            types,
            default: `./${sourceDir}/index.js`,
          },
        },
      }
    : {}),
};

console.error('\n' + JSON.stringify(packageJson, null, 2) + '\n');

const isConfirmed = await rl
  .question('Does the above package.json look correct? [Y/n] ')
  .then((answer) => !answer || /^y(?:es)?$/u.test(answer));

if (!isConfirmed) process.exit(0);

await mkdir(resolve(dir, 'src'), { recursive: true });

process.chdir(dir);

await writeFile('package.json', JSON.stringify(packageJson, null, 2), { flag: 'wx' });
await writeFile(`src/index.${isTypescript ? 'ts' : 'js'}`, 'export {};\n', { flag: 'wx' }).catch(() => undefined);
await writeFile(
  'README.md',
  `# ${packageJson.name}\n${packageJson.description ? `\n${packageJson.description}\n` : ''}`,
  {
    flag: 'wx',
  },
).catch(() => undefined);
if (existsSync(resolve(rootDir, 'LICENSE'))) {
  await cp(resolve(rootDir, 'LICENSE'), 'LICENSE', { errorOnExist: true }).catch(() => undefined);
}

if (isTypescript && existsSync(resolve(rootDir, 'tsconfig.json'))) {
  await writeFile(
    'tsconfig.json',
    JSON.stringify(
      {
        extends: relative(dir, resolve(rootDir, 'tsconfig.json')),
        compilerOptions: {
          rootDir: '.',
        },
        include: ['.'],
        exclude: ['node_modules', 'out', 'lib', 'dist', 'coverage'],
      },
      null,
      2,
    ),
    { flag: 'wx' },
  ).catch(() => undefined);
}

rl.close();
