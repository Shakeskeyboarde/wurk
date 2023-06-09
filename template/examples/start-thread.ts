import { createCommand } from '@werk/cli';

export default createCommand({
  each: async ({ log, workspace, workerData, startWorker }) => {
    // Honor the Werk global options for filtering.
    if (!workspace.selected) return;

    const isWorkerStarted = await startWorker({ timestamp: Date.now() });

    // Can't start workers in workers, so if the worker didn't start,
    // then this is a worker thread.
    if (!isWorkerStarted) {
      log.info(`I'm in a worker thread! Started at ${new Date(workerData.timestamp).toTimeString()}.`);
    } else {
      log.info(`I'm in the main thread!`);
    }
  },
});
