import { fileURLToPath } from 'node:url';
import { isMainThread, Worker } from 'node:worker_threads';

const __filename = fileURLToPath(import.meta.url);

interface WorkerOptions {
  /**
   * Worker data.
   */
  readonly workerData?: any;
}

export const startWorker = async (filename: string, { workerData }: WorkerOptions = {}): Promise<boolean> => {
  if (!isMainThread) return false;
  if (filename.startsWith('file:')) filename = fileURLToPath(filename);

  const worker = new Worker(filename, { workerData: workerData });

  await new Promise<void>((resolve, reject) => {
    worker.on('error', reject);
    worker.on('exit', (exitCode) => {
      if (exitCode === 0) resolve();
      else reject(new Error(`Worker exited with code ${exitCode}.`));
    });
  });

  return true;
};
