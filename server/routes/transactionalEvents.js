const express = require('express');
const { database } = require('../utils/firebaseClient');
const { getPublicSiteOrigin } = require('../utils/siteOrigin');
const { sendTransactionalEventEmail } = require('../services/mailService');

const router = express.Router();

const eventSet = new Set([
  'brand_offer_created',
  'incoming_offer_created',
  'influencer_counter_created',
  'brand_counter_sent',
  'offer_accepted',
  'offer_rejected',
  'content_uploaded',
  'content_share_link_set',
  'content_media_approved',
  'content_revision_requested',
  'content_approved',
  'content_rejected',
]);

function formatTry(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(n);
}

function displayName(row, fallback) {
  if (!row || typeof row !== 'object') return fallback;
  return row.brandName || row.fullName || row.name || row.email || fallback;
}

function resolveRecipient({ eventType, actorUid, brandId, influencerId }) {
  if (
    eventType === 'incoming_offer_created' ||
    eventType === 'influencer_counter_created' ||
    eventType === 'content_uploaded' ||
    eventType === 'content_share_link_set'
  ) {
    return { userType: 'brand', userId: brandId };
  }
  if (
    eventType === 'brand_offer_created' ||
    eventType === 'brand_counter_sent' ||
    eventType === 'content_media_approved' ||
    eventType === 'content_revision_requested' ||
    eventType === 'content_approved' ||
    eventType === 'content_rejected'
  ) {
    return { userType: 'influencer', userId: influencerId };
  }
  if (eventType === 'offer_accepted' || eventType === 'offer_rejected') {
    if (actorUid === brandId) return { userType: 'influencer', userId: influencerId };
    if (actorUid === influencerId) return { userType: 'brand', userId: brandId };
  }
  return null;
}

router.post('/email', async (req, res) => {
  try {
    const uid = req.user && req.user.uid;
    const {
      eventType,
      brandId,
      influencerId,
      campaignId,
      offerId,
      rootOfferId,
      price,
    } = req.body || {};

    if (!uid || !eventSet.has(eventType) || !brandId || !influencerId || !campaignId || !offerId) {
      return res.status(400).json({ success: false, message: 'Eksik veya geçersiz işlem bilgisi.' });
    }
    if (uid !== brandId && uid !== influencerId) {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok.' });
    }

    const offerSnap = await database.ref(`offers/${offerId}`).get();
    if (!offerSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Teklif bulunamadı.' });
    }
    const offer = offerSnap.val() || {};
    if (offer.brandId !== brandId || offer.influencerId !== influencerId || offer.campaignId !== campaignId) {
      return res.status(403).json({ success: false, message: 'Teklif eşleşmesi geçersiz.' });
    }

    const [brandSnap, influencerSnap, campaignSnap] = await Promise.all([
      database.ref(`brands/${brandId}`).get(),
      database.ref(`influencers/${influencerId}`).get(),
      database.ref(`brands/${brandId}/campaigns/${campaignId}`).get(),
    ]);
    const brand = brandSnap.val() || {};
    const influencer = influencerSnap.val() || {};
    const campaign = campaignSnap.val() || {};

    const recipient = resolveRecipient({ eventType, actorUid: uid, brandId, influencerId });
    if (!recipient) {
      return res.json({ success: true, skipped: true, message: 'Bu olay için alıcı bulunamadı.' });
    }
    const recipientRow = recipient.userType === 'brand' ? brand : influencer;
    const email = String(recipientRow.email || '').trim();
    if (!email) {
      return res.json({ success: true, skipped: true, message: 'Alıcı e-postası bulunamadı.' });
    }

    const site = getPublicSiteOrigin().replace(/\/$/, '');
    const actionUrl =
      recipient.userType === 'brand'
        ? `${site}/brand/dashboard?tab=${eventType === 'content_uploaded' || eventType === 'content_share_link_set' ? 'campaigns' : 'offers'}&offerId=${encodeURIComponent(offerId)}&campaignId=${encodeURIComponent(campaignId)}`
        : `${site}/influencer/dashboard?offerId=${encodeURIComponent(rootOfferId || offerId)}&campaignId=${encodeURIComponent(campaignId)}`;

    const info = await sendTransactionalEventEmail(email, {
      eventType,
      recipientName: displayName(recipientRow, recipient.userType === 'brand' ? 'Marka' : 'Influencer'),
      campaignName: campaign.title || campaign.campaignName || campaign.productInfo || 'Kampanya',
      brandName: displayName(brand, 'Marka'),
      influencerName: displayName(influencer, 'Influencer'),
      priceLine: formatTry(price || offer.price),
      actionUrl,
    });

    return res.json({
      success: true,
      message: 'Bilgilendirme maili gönderildi.',
      data: { messageId: info.messageId },
    });
  } catch (error) {
    console.error('[transactionalEvents] email:', error);
    return res.status(500).json({
      success: false,
      message: `Bilgilendirme maili gönderilemedi: ${error.message}`,
    });
  }
});

module.exports = router;
