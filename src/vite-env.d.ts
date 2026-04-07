/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_XUBETS_AI_KEY: string
  // add other env variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
