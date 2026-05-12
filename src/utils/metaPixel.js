/**
 * Meta Pixel (Facebook Pixel) helpers — browser-only, SSR-safe.
 * Varsayılan kurulumda `index.html` script’i fbq yükleme ve `init` işlemini yapar;
 * bayrak için hemen altında küçük bir inline script bakar (`__INFUHUB_META_PIXEL_INIT__`).
 */

export const META_PIXEL_ID = '1801671057475303';

function getFbq() {
  if (typeof window === 'undefined') return undefined;
  return typeof window.fbq === 'function' ? window.fbq : undefined;
}

/**
 * `index.html` pikseli kaldırıp yalnızca JS ile yüklemeniz gerektiğinde:
 * Önce fbq yükleme IIFE’nizi ekleyip ardından `initPixel()` çağırın.
 * Varsayılan modda bayrak yüklendiği için başa ikinci bir `init` eklenmez.
 */
export function initPixel() {
  if (typeof window === 'undefined') return;
  const fbq = getFbq();
  if (!fbq) return;
  if (window.__INFUHUB_META_PIXEL_INIT__) return;
  fbq('init', META_PIXEL_ID);
  window.__INFUHUB_META_PIXEL_INIT__ = true;
}

export function trackPageView() {
  const fbq = getFbq();
  if (!fbq) return;
  fbq('track', 'PageView');
}

/**
 * @param {string} eventName - Örn: 'CompleteRegistration', 'Login', 'CreateCampaign'
 * @param {Record<string, unknown>} [payload] - Meta parametre nesnesi
 */
export function trackEvent(eventName, payload) {
  const fbq = getFbq();
  if (!fbq || !eventName) return;
  if (payload != null && typeof payload === 'object') {
    fbq('track', eventName, payload);
  } else {
    fbq('track', eventName);
  }
}
