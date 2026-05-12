/** Üretimde CDN / reverse proxy arkasında doğru domain için .env ile override edilebilir */
export const SITE_ORIGIN = (
  import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://infuhub.ai"
) as string;

export const DEFAULT_PAGE_TITLE =
  "infuhub | Yapay Zeka Destekli Marka İnfluencer Eşleşme Platformu";

export const DEFAULT_META_DESCRIPTION =
  "Markalar ve influencerlar için akıllı eşleşme, teklif yönetimi, kampanya takibi ve performans analizi tek platformda.";

/** Sosyal önizleme görseli — `public/pics/infulink.png` */
export const OG_IMAGE_PATH = "pics/infulink.png";

export function getOgImageAbsoluteUrl(): string {
  return `${SITE_ORIGIN}/${OG_IMAGE_PATH}`;
}

/** Mevcut route + sorgu için tam kanonik URL (og:url) */
export function canonicalUrlFromLocation(pathname: string, search: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_ORIGIN}${path}${search}`;
}
