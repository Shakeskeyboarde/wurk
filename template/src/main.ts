import { createCommand } from '@werk/cli';

export default createCommand({
  packageManager: false,

  init: (context) => {
    // TODO: Add command options.
    return context.commander;
  },

  before: async (context) => {
    // TODO: Perform pre-processing.
    context;
  },

  each: async (context) => {
    // TODO: Process each workspaces.
    context;
  },

  after: async (context) => {
    // TODO: Perform post-processing.
    context;
  },

  cleanup: (context) => {
    // TODO: Synchronously cleanup before exiting.
    context;
  },
});
