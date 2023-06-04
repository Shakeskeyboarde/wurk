import { spawn } from '../utils/process.js';

export default await spawn('npm', ['query', ':root', '--json'], { capture: true })
  .json<[{ workspaces: unknown; path: string; realpath?: string }?]>()
  .then((values) => values?.[0])
  .then((value) => {
    if (value && Array.isArray(value.workspaces)) return value.realpath ?? value.path;
    throw new Error('No NPM workspaces root found.');
  });
