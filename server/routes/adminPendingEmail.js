const express = require('express');
const { admin, database } = require('../utils/firebaseClient');
const {
  promotePendingRegistration,
  GECICI_MARKA,
  GECICI_INFLUENCER,
} = require('../services/registrationPromoteService');

const router = express.Router();

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * GET /api/admin/pending-email-registrations
 * RTDB: `geciciMarkalar/{uid}`, `geciciInfluencerlar/{uid}` — normal akışta e-posta doğrulanana kadar kalır.
 */
router.get('/pending-email-registrations', async (req, res) => {
  try {
    const [brandsSnap, influencersSnap] = await Promise.all([
      database.ref('geciciMarkalar').once('value'),
      database.ref('geciciInfluencerlar').once('value'),
    ]);

    const items = [];

    const pushTree = (treeVal, accountType) => {
      if (!treeVal || typeof treeVal !== 'object') return;
      for (const [uid, raw] of Object.entries(treeVal)) {
        if (!raw || typeof raw !== 'object') continue;
        const d = raw;
        const emailRtdb = typeof d.email === 'string' ? d.email : '';
        const displayName =
          accountType === 'brand'
            ? (typeof d.brandName === 'string' ? d.brandName : '') || emailRtdb
            : (typeof d.fullName === 'string' ? d.fullName : '') || emailRtdb;
        items.push({
          uid,
          accountType,
          email: emailRtdb,
          displayName,
          createdAt: typeof d.createdAt === 'string' ? d.createdAt : null,
          emailVerificationSentAt:
            typeof d.emailVerificationSentAt === 'string' ? d.emailVerificationSentAt : null,
          hasActiveVerificationCode: !!(d.emailVerification && typeof d.emailVerification === 'object'),
        });
      }
    };

    if (brandsSnap.exists()) pushTree(brandsSnap.val(), 'brand');
    if (influencersSnap.exists()) pushTree(influencersSnap.val(), 'influencer');

    for (const item of items) {
      try {
        const u = await admin.auth().getUser(item.uid);
        item.authEmail = u.email || null;
        item.emailVerified = !!u.emailVerified;
      } catch (e) {
        item.authError = e.code === 'auth/user-not-found' ? 'not_found' : 'error';
        item.authEmail = null;
        item.emailVerified = false;
      }
    }

    items.sort((a, b) => {
      const av = a.emailVerified ? 1 : 0;
      const bv = b.emailVerified ? 1 : 0;
      if (av !== bv) return av - bv;
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });

    return res.json({ success: true, items });
  } catch (err) {
    console.error('[admin] pending-email-registrations:', err);
    return res.status(500).json({ success: false, message: err.message || 'Liste alınamadı.' });
  }
});

/**
 * POST /api/admin/manual-verify-registration-email
 * Body: { uid }
 * Firebase Auth: emailVerified=true; RTDB: emailVerification silinir; promotePendingRegistration (geçici → brands/influencers).
 */
router.post('/manual-verify-registration-email', async (req, res) => {
  const uid = req.body?.uid;
  if (!uid || typeof uid !== 'string') {
    return res.status(400).json({ success: false, message: 'uid gerekli.' });
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    const email = userRecord.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Firebase Auth kaydında e-posta yok.' });
    }

    const bSnap = await database.ref(GECICI_MARKA(uid)).once('value');
    const iSnap = await database.ref(GECICI_INFLUENCER(uid)).once('value');
    if (!bSnap.exists() && !iSnap.exists()) {
      return res.status(400).json({
        success: false,
        message: 'Bekleyen geçici kayıt yok. Hesap zaten tamamlanmış olabilir.',
      });
    }

    const pending = bSnap.exists() ? bSnap.val() : iSnap.val();
    const pendingEmail = normalizeEmail(pending?.email || '');
    if (pendingEmail && normalizeEmail(email) !== pendingEmail) {
      return res.status(400).json({
        success: false,
        message:
          'Firebase Auth e-postası ile geçici kayıttaki e-posta eşleşmiyor. Güvenlik nedeniyle işlem yapılmadı.',
      });
    }

    const basePath = bSnap.exists() ? GECICI_MARKA(uid) : GECICI_INFLUENCER(uid);
    await database.ref(`${basePath}/emailVerification`).remove();
    await admin.auth().updateUser(uid, { emailVerified: true });
    await promotePendingRegistration(uid, email);

    return res.json({
      success: true,
      message: 'E-posta doğrulandı ve kayıt ana tabloya taşındı.',
    });
  } catch (err) {
    console.error('[admin] manual-verify-registration-email:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Doğrulama sırasında hata oluştu.',
    });
  }
});

module.exports = router;
