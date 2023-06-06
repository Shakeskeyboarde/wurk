import { fileURLToPath } from 'node:url';
import { isMainThread, Worker } from 'node:worker_threads';

interface WorkerOptions {
  /**
   * Worker data.
   */
  readonly workerData?: any;
}

export type WorkerPromise =
  | ({ readonly isStarted: false; readonly worker?: undefined } & Promise<false>)
  | ({ readonly isStarted: true; readonly worker: Worker } & Promise<true>);

export const startWorker = (filename: string, { workerData }: WorkerOptions = {}): WorkerPromise => {
  if (!isMainThread) return Object.assign(Promise.resolve<false>(false), { isStarted: false } as const);
  if (filename.startsWith('file:')) filename = fileURLToPath(filename);

  const worker = new Worker(filename, { workerData: workerData });
  const promise = new Promise<void>((resolve, reject) => {
    worker.on('error', reject);
    worker.on('exit', (exitCode) => {
      if (exitCode === 0) resolve();
      else reject(new Error(`Worker exited with code ${exitCode}.`));
    });
  });

  return Object.assign(
    promise.then<true>(() => true),
    { isStarted: true, worker } as const,
  );
};
