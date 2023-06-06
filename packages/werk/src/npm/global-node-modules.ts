import { spawn } from '../utils/spawn.js';

export default await spawn('npm', ['root', '-g'], { capture: true })
  .stdout('utf-8')
  .catch(() => Promise.reject(new Error('No global NPM packages root found.')));
