function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const fromBase =
    typeof import.meta.env.VITE_API_BASE_URL === 'string'
      ? import.meta.env.VITE_API_BASE_URL.trim()
      : '';
  const fromApiUrl =
    typeof import.meta.env.VITE_API_URL === 'string'
      ? import.meta.env.VITE_API_URL.trim().replace(/\/api\/?$/i, '')
      : '';

  const env = fromBase || fromApiUrl;

  if (env) {
    return normalizeBase(env);
  }

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return normalizeBase(window.location.origin);
  }

  return 'http://localhost:3002';
}

function splitApiBase(base: string): { origin: string; hasApiPrefix: boolean } {
  const normalized = normalizeBase(base);
  const lower = normalized.toLowerCase();

  if (lower.endsWith('/api')) {
    return {
      origin: normalized.slice(0, -4).replace(/\/+$/, '') || normalized,
      hasApiPrefix: true,
    };
  }

  return {
    origin: normalized,
    hasApiPrefix: false,
  };
}

export function buildApiUrl(path: string): string {
  const cleanPath = `/${path.trim().replace(/^\/+/, '')}`;
  const { origin, hasApiPrefix } = splitApiBase(getApiBaseUrl());
  const lowerPath = cleanPath.toLowerCase();

  if (hasApiPrefix) {
    const pathWithoutApi =
      lowerPath === '/api'
        ? ''
        : lowerPath.startsWith('/api/')
          ? cleanPath.slice(4)
          : cleanPath;

    return `${origin}/api${pathWithoutApi}`;
  }

  if (lowerPath === '/api' || lowerPath.startsWith('/api/')) {
    return `${origin}${cleanPath}`;
  }

  return `${origin}/api${cleanPath}`;
}

/** Kısa takip linklerinin paylaşılan tam URL kökü */
export function getTrackingPublicBaseUrl(): string {
  const env =
    typeof import.meta.env.VITE_TRACKING_BASE_URL === 'string'
      ? import.meta.env.VITE_TRACKING_BASE_URL.trim()
      : '';
  if (env) {
    return normalizeBase(env).replace(/\/api$/i, '');
  }
  return splitApiBase(getApiBaseUrl()).origin;
}
