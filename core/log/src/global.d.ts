declare namespace globalThis {
  namespace NodeJS {
    interface ProcessEnv {
      WURK_LOG_LEVEL?: string;
      [key: string]: never;
    }
  }
}
