import { spawn } from '../utils/process.js';

export default await spawn('npm', ['root', '-g'], { capture: true })
  .stdout('utf-8')
  .catch(() => Promise.reject(new Error('No global NPM packages root found.')));
