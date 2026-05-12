import { buildApiUrl, getApiBaseUrl } from '@/lib/apiConfig';

/** @deprecated alias — getApiBaseUrl kullanın */
export function getServerOrigin(): string {
  return getApiBaseUrl();
}

export function serverApiUrl(path: string): string {
  return buildApiUrl(path);
}
