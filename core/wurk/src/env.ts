interface Env {
  WURK_RUNNING_COMMANDS?: string;
  WURK_WORKSPACE_EXPRESSIONS?: string;
  WURK_INCLUDE_ROOT_WORKSPACE?: string;
  WURK_PARALLEL?: string;
  WURK_CONCURRENCY?: string;
}

export const env = process.env as Env;
