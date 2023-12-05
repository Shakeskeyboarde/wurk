import { createCommand } from '@werk/cli';

export default createCommand({
  each: async ({ workspace }) => {
    if (!workspace.isSelected) return;

    await workspace.clean();
  },
});
