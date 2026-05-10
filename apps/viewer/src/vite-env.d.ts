/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_A2LEARN_MESSAGES_URL?: string;
  readonly VITE_A2LEARN_API_URL?: string;
  readonly VITE_A2LEARN_RESOURCE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
