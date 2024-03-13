interface Env {
  WURK_RUNNING_COMMANDS?: string;
  WURK_WORKSPACE_FILTERS?: string;
  WURK_PARALLEL?: string;
  WURK_STREAM?: string;
  WURK_CONCURRENCY?: string;
}

export const env = process.env as Env;
