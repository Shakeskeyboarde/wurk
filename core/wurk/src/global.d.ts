declare namespace globalThis {
  namespace NodeJS {
    interface ProcessEnv {
      WURK_RUNNING_COMMANDS?: string;
      WURK_WORKSPACE_FILTERS?: string;
      WURK_PARALLEL?: string;
      WURK_STREAM?: string;
      WURK_CONCURRENCY?: string;
      [key: string]: never;
    }
  }
}
