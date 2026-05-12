/** Marka paneli: hero alt şeridi ile ana gövde (`BRAND_CENTERED_SHELL`) aynı hizada */
export const BRAND_DASHBOARD_CENTERED_CLASS =
  "mx-auto w-full min-w-0 max-w-[1100px] lg:max-w-[1240px] xl:max-w-[1360px] 2xl:max-w-[1480px]";

/**
 * `main` ile aynı sağ padding. Hero full-bleed (`w-[calc(100%+…)]` + negatif margin) içindeki
 * içerik kolonunu gövdeyle piksel hizalı yapmak için sarmalayıcıda kullanılır.
 */
export const BRAND_MAIN_END_PADDING = "md:pr-6 lg:pr-8 xl:pr-10";

/**
 * Marka paneli `<main>`: md+ sol tarafta yalnızca sabit sidebar (78px) — hero arka planı menüye yapışır;
 * boşluk hero / gövde *içindeki* sütunda. Sağda sayfa gutter’ı; mobilde üst bar için `pt-16`.
 */
export const BRAND_DASHBOARD_MAIN_CLASS =
  "w-full min-w-0 max-w-[100vw] overflow-x-hidden pb-6 " +
  "px-4 pt-16 sm:px-5 md:pt-0 " +
  "md:pl-[78px] md:pr-6 " +
  "lg:pr-8 " +
  "xl:pr-10";

/** Full-bleed hero üzerinde başlık + özet kartları: ortalanmış sütun içi yatay boşluk */
export const BRAND_HERO_CONTENT_INSET = "px-4 sm:px-5 md:px-6 lg:px-8";

/**
 * Dashboard hero `fullBleed`: `main` sağ padding’ini dengeleyerek şeridi sağ kenara kadar uzatır.
 * `BRAND_DASHBOARD_MAIN_CLASS` ile eşleşmeli.
 */
export const BRAND_DASHBOARD_HERO_BLEED_OUTSET =
  "mb-5 w-full min-w-0 md:mb-6 " +
  "md:-mr-6 md:w-[calc(100%+1.5rem)] " +
  "lg:-mr-8 lg:w-[calc(100%+2rem)] " +
  "xl:-mr-10 xl:w-[calc(100%+2.5rem)]";
