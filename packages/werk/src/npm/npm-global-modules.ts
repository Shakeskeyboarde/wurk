import { spawn } from '../utils/spawn.js';

export default await spawn('npm', ['root', '-g'], {
  capture: true,
  errorThrow: true,
  errorMessage: () => 'No global NPM packages root found.',
}).getStdout('utf-8');
