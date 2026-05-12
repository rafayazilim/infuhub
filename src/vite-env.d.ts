/// <reference types="vite/client" />

interface Window {
  fbq?: (...args: unknown[]) => void;
  __INFUHUB_META_PIXEL_INIT__?: boolean;
}

interface ImportMetaEnv {
  /** Kanonik site kökü (trailing slash yok). Örn. https://infuhub.ai */
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  /** Örn. https://infuhub.ai/api — kök apiConfig ile normalize edilir */
  readonly VITE_API_URL?: string;
  readonly VITE_TRACKING_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
