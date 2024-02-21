interface Env {
  WURK_LOG_LEVEL?: string;
}

export const env = process.env as Env;
