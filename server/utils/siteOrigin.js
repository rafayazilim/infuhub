/**
 * Genel site kökü (e-posta linkleri, takip URL’leri).
 * server/.env: FRONTEND_URL veya APP_URL veya CLIENT_URL veya BASE_TRACKING_DOMAIN
 */
function normalizeOrigin(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}

function getPublicSiteOrigin() {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    process.env.CLIENT_URL ||
    process.env.BASE_TRACKING_DOMAIN ||
    'https://infuhub.ai';
  return normalizeOrigin(raw);
}

/** Takip linkleri (/c/:code) için kök; yoksa geliştirme için localhost */
function getTrackingBaseUrl() {
  const raw =
    process.env.BASE_TRACKING_DOMAIN ||
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    process.env.CLIENT_URL;
  if (raw) return normalizeOrigin(raw);
  return process.env.NODE_ENV === 'production' ? 'https://infuhub.ai' : 'http://localhost:3002';
}

module.exports = {
  getPublicSiteOrigin,
  getTrackingBaseUrl,
};
