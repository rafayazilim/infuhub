const { database } = require('../utils/firebaseClient');
const crypto = require('crypto');

/**
 * IP adresini hashle (SHA-256)
 * @param {string} ip - IP adresi
 * @returns {string} - Hashlenmiş IP
 */
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Click kaydı oluştur (tracking_links altında)
 * @param {string} shortCode - Short code
 * @param {object} clickData - Click bilgileri
 * @returns {Promise<string>} - Click ID
 */
async function recordClick(shortCode, clickData) {
  try {
    const {
      offerId,
      campaignId,
      influencerId,
      brandId,
      source = 'unknown',
      ip,
      userAgent,
      referrer,
    } = clickData;

    const clickRecord = {
      clickedAt: new Date().toISOString(),
      ipHash: hashIP(ip),
      userAgent: userAgent || 'Unknown',
      referrer: referrer || '',
      source,
    };

    // Click kaydını tracking_links altına ekle
    const clickRef = database.ref(`tracking_links/${shortCode}/clicks`).push();
    await clickRef.set(clickRecord);

    // Click sayısını güncelle
    await updateClickCount(shortCode);

    return clickRef.key;
  } catch (error) {
    console.error('Click kaydı oluşturma hatası:', error);
    throw error;
  }
}

/**
 * Click sayısını güncelle
 * @param {string} shortCode - Short code
 */
async function updateClickCount(shortCode) {
  try {
    const clicksSnapshot = await database.ref(`tracking_links/${shortCode}/clicks`).once('value');
    const clickCount = clicksSnapshot.exists() ? Object.keys(clicksSnapshot.val()).length : 0;
    await database.ref(`tracking_links/${shortCode}/clickCount`).set(clickCount);
    return clickCount;
  } catch (error) {
    console.error('Click sayısı güncelleme hatası:', error);
    throw error;
  }
}

/**
 * Short code'a ait click sayısını getir
 * @param {string} shortCode - Short code
 * @returns {Promise<number>}
 */
async function getClickCount(shortCode) {
  try {
    const snapshot = await database.ref(`tracking_links/${shortCode}/clickCount`).once('value');
    if (snapshot.exists()) {
      return snapshot.val() || 0;
    }
    return 0;
  } catch (error) {
    console.error('Click sayısı getirme hatası:', error);
    return 0;
  }
}

/**
 * Kampanyaya ait toplam click sayısını getir
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<number>}
 */
async function getClickCountByCampaignId(campaignId) {
  try {
    const snapshot = await database.ref('tracking_links').once('value');
    if (!snapshot.exists()) {
      return 0;
    }

    const links = snapshot.val();
    let totalClicks = 0;
    
    Object.values(links).forEach(link => {
      if (link.campaignId === campaignId) {
        totalClicks += link.clickCount || 0;
      }
    });

    return totalClicks;
  } catch (error) {
    console.error('Kampanya click sayısı getirme hatası:', error);
    return 0;
  }
}

/**
 * Influencer'a ait toplam click sayısını getir
 * @param {string} influencerId - Influencer ID
 * @returns {Promise<number>}
 */
async function getClickCountByInfluencerId(influencerId) {
  try {
    const snapshot = await database.ref('tracking_links').once('value');
    if (!snapshot.exists()) {
      return 0;
    }

    const links = snapshot.val();
    let totalClicks = 0;
    
    Object.values(links).forEach(link => {
      if (link.influencerId === influencerId) {
        totalClicks += link.clickCount || 0;
      }
    });

    return totalClicks;
  } catch (error) {
    console.error('Influencer click sayısı getirme hatası:', error);
    return 0;
  }
}

/**
 * Offer'a ait click sayısını getir
 * @param {string} offerId - Offer ID
 * @returns {Promise<number>}
 */
async function getClickCountByOfferId(offerId) {
  try {
    const snapshot = await database.ref('tracking_links').once('value');
    if (!snapshot.exists()) {
      return 0;
    }

    const links = snapshot.val();
    const link = Object.values(links).find(l => l.offerId === offerId);
    
    return link?.clickCount || 0;
  } catch (error) {
    console.error('Offer click sayısı getirme hatası:', error);
    return 0;
  }
}

module.exports = {
  recordClick,
  getClickCount,
  getClickCountByCampaignId,
  getClickCountByInfluencerId,
  getClickCountByOfferId,
  updateClickCount,
  hashIP,
};
