/// <reference types="vite/client" />

declare const __SITE_URL__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_SITE_URL?: string;
}
