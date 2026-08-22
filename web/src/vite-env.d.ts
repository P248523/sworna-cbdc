/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_PORTAL?: "cb" | "banka" | "bankb" | "";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}