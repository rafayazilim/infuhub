/**
 * Vite `public/` altındaki dosyalar için URL üretir.
 * `base: '/alt/'` veya `base: './'` gibi deploy senaryolarında import.meta.env.BASE_URL kullanılır.
 */
export function publicAsset(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const relativePath = path.startsWith("/") ? path.slice(1) : path;
  if (!base || base === "/") {
    return `/${relativePath}`;
  }
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${relativePath}`.replace(/([^:]\/)\/+/g, "$1");
}
