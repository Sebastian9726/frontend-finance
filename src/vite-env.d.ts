/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend. Se resuelve en tiempo de build. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
