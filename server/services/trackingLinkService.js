const { database } = require('../utils/firebaseClient');
const crypto = require('crypto');
const { getTrackingBaseUrl } = require('../utils/siteOrigin');

/**
 * Unique short code oluştur (5-7 karakter)
 */
function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let shortCode = '';
  for (let i = 0; i < 6; i++) {
    shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return shortCode;
}

/**
 * Short code'un unique olup olmadığını kontrol et
 */
async function isShortCodeUnique(shortCode) {
  try {
    const snapshot = await database.ref(`tracking_links`).orderByChild('shortCode').equalTo(shortCode).once('value');
    return !snapshot.exists();
  } catch (error) {
    console.error('Short code kontrolü hatası:', error);
    return false;
  }
}

/**
 * Unique short code oluştur (retry ile)
 */
async function generateUniqueShortCode(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    const shortCode = generateShortCode();
    const isUnique = await isShortCodeUnique(shortCode);
    if (isUnique) {
      return shortCode;
    }
  }
  throw new Error('Unique short code oluşturulamadı');
}

/**
 * Tracking link oluştur
 * @param {string} offerId - Offer ID
 * @param {string} targetUrl - Hedef URL
 * @param {string} platform - Platform (instagram, tiktok, youtube, twitter)
 * @returns {Promise<{shortCode: string, trackingUrl: string}>}
 */
async function createTrackingLink(offerId, targetUrl, platform = 'instagram') {
  try {
    // Offer bilgilerini Firebase'den al
    const offerSnapshot = await database.ref(`offers/${offerId}`).once('value');
    
    if (!offerSnapshot.exists()) {
      throw new Error('Offer bulunamadı');
    }

    const offer = offerSnapshot.val();

    // Aynı offer için zaten aktif link var mı kontrol et
    const existingLinksSnapshot = await database.ref('tracking_links')
      .orderByChild('offerId')
      .equalTo(offerId)
      .once('value');

    if (existingLinksSnapshot.exists()) {
      const existingLinks = existingLinksSnapshot.val();
      const activeLink = Object.values(existingLinks).find(link => link.isActive === true);
      
      if (activeLink) {
        // Mevcut aktif linki döndür
        const baseUrl = getTrackingBaseUrl();
        return {
          ...activeLink,
          clickCount: activeLink.clickCount || 0,
          trackingUrl: `${baseUrl}/c/${activeLink.shortCode}`,
        };
      }
    }

    // Yeni short code oluştur
    const shortCode = await generateUniqueShortCode();

    // Tracking link oluştur
    const trackingLinkData = {
      shortCode,
      offerId,
      campaignId: offer.campaignId,
      brandId: offer.brandId,
      influencerId: offer.influencerId,
      platform,
      targetUrl,
      createdAt: new Date().toISOString(),
      isActive: true,
      clickCount: 0, // Başlangıçta 0
      clicks: {}, // Click kayıtları burada tutulacak
    };

    await database.ref(`tracking_links/${shortCode}`).set(trackingLinkData);

    const baseUrl = getTrackingBaseUrl();
    const trackingUrl = `${baseUrl}/c/${shortCode}`;

    return {
      ...trackingLinkData,
      trackingUrl,
    };
  } catch (error) {
    console.error('Tracking link oluşturma hatası:', error);
    throw error;
  }
}

/**
 * Tracking link bilgilerini getir
 * @param {string} shortCode - Short code
 * @returns {Promise<object|null>}
 */
async function getTrackingLink(shortCode) {
  try {
    const snapshot = await database.ref(`tracking_links/${shortCode}`).once('value');
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Tracking link getirme hatası:', error);
    throw error;
  }
}

/**
 * Tracking link'i deaktif et
 * @param {string} shortCode - Short code
 */
async function deactivateTrackingLink(shortCode) {
  try {
    await database.ref(`tracking_links/${shortCode}/isActive`).set(false);
  } catch (error) {
    console.error('Tracking link deaktif etme hatası:', error);
    throw error;
  }
}

/**
 * Offer'a ait tracking link'i getir
 * @param {string} offerId - Offer ID
 * @returns {Promise<object|null>}
 */
async function getTrackingLinkByOfferId(offerId) {
  try {
    // Tüm tracking link'leri al ve offerId'ye göre filtrele
    // orderByChild index gerektirebilir, bu yüzden tümünü alıp filtreliyoruz
    const snapshot = await database.ref('tracking_links').once('value');

    if (snapshot.exists()) {
      const links = snapshot.val();
      // Tüm link'leri kontrol et ve offerId'ye göre filtrele
      const matchingLinks = Object.values(links).filter(link => link.offerId === offerId);
      
      if (matchingLinks.length > 0) {
        // Aktif olanı bul, yoksa ilkini döndür
        const activeLink = matchingLinks.find(link => link.isActive === true);
        const result = activeLink || matchingLinks[0];
        // clickCount'u garantile
        return {
          ...result,
          clickCount: result.clickCount || 0,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Offer tracking link getirme hatası:', error);
    throw error;
  }
}

/**
 * Kampanyaya ait tüm tracking link'leri getir
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Array>}
 */
async function getTrackingLinksByCampaignId(campaignId) {
  try {
    const snapshot = await database.ref('tracking_links')
      .orderByChild('campaignId')
      .equalTo(campaignId)
      .once('value');

    if (snapshot.exists()) {
      return Object.values(snapshot.val());
    }
    return [];
  } catch (error) {
    console.error('Kampanya tracking link getirme hatası:', error);
    throw error;
  }
}

module.exports = {
  createTrackingLink,
  getTrackingLink,
  deactivateTrackingLink,
  getTrackingLinkByOfferId,
  getTrackingLinksByCampaignId,
};
