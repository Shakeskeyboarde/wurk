export const exitIfRecursion = (commandOrScript: string | undefined): void => {
  const running = process.env.WURK_RUNNING_COMMANDS?.split(/\s*,\s*/u) ?? [];

  if (commandOrScript && running.includes(commandOrScript)) {
    // Block commands from recursively calling themselves, even indirectly.
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }

  process.env.WURK_RUNNING_COMMANDS = [...running, commandOrScript].join(',');
};
