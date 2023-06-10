import { createCommand } from '@werk/cli';

export default createCommand({
  after: async ({ log, workspaces }) => {
    log.info(
      JSON.stringify(
        Array.from(workspaces.values())
          .filter((value) => value.selected)
          .map((value) => ({ ...value, selected: undefined })),
        null,
        2,
      ),
    );
  },
});
