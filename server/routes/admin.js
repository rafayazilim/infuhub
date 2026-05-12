const express = require('express');
const {
  sendInfluencerApprovedEmail,
  sendBrandApprovedEmail,
  sendProfileVerificationRejectedEmail,
  sendPayoutVerificationApprovedEmail,
  sendTestEmail,
} = require('../services/mailService');
const { admin, database } = require('../utils/firebaseClient');

const router = express.Router();

async function requireAdminUser(req, res) {
  const uid = req.user && req.user.uid;
  if (!uid) {
    res.status(401).json({ success: false, message: 'Admin oturumu bulunamadı.' });
    return null;
  }

  const adminSnap = await database.ref(`admins/${uid}`).get();
  if (!adminSnap.exists()) {
    res.status(403).json({ success: false, message: 'Bu işlem için admin yetkisi gerekli.' });
    return null;
  }

  return uid;
}

router.post('/delete-account', async (req, res) => {
  try {
    const adminUid = await requireAdminUser(req, res);
    if (!adminUid) return;

    const { uid, accountType } = req.body || {};
    const targetUid = typeof uid === 'string' ? uid.trim() : '';
    const type = accountType === 'brand' ? 'brand' : accountType === 'influencer' ? 'influencer' : '';

    if (!targetUid) {
      return res.status(400).json({ success: false, message: 'Silinecek kullanıcı UID zorunludur.' });
    }
    if (!type) {
      return res.status(400).json({ success: false, message: 'Geçerli accountType zorunludur.' });
    }
    if (targetUid === adminUid) {
      return res.status(400).json({ success: false, message: 'Kendi admin hesabınızı bu ekrandan silemezsiniz.' });
    }

    const now = new Date().toISOString();
    const rootPath = type === 'brand' ? 'brands' : 'influencers';
    const tempPath = type === 'brand' ? 'geciciMarkalar' : 'geciciInfluencerlar';

    let authDeleted = true;
    try {
      await admin.auth().deleteUser(targetUid);
    } catch (error) {
      if (error && error.code === 'auth/user-not-found') {
        authDeleted = false;
      } else {
        throw error;
      }
    }

    await Promise.all([
      database.ref(`${rootPath}/${targetUid}`).remove(),
      database.ref(`verificationRequests/${type}/${targetUid}`).remove(),
      database.ref(`${tempPath}/${targetUid}`).remove(),
      database.ref(`adminDeletedAccounts/${targetUid}`).set({
        uid: targetUid,
        accountType: type,
        deletedAt: now,
        deletedBy: adminUid,
        authDeleted,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: authDeleted
        ? 'Kullanıcı RTDB ve Firebase Authentication üzerinden silindi.'
        : 'RTDB kaydı silindi; Firebase Authentication kullanıcısı zaten bulunamadı.',
      data: { uid: targetUid, accountType: type, authDeleted },
    });
  } catch (error) {
    console.error('[admin] delete-account:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Kullanıcı silinirken bir hata oluştu.',
    });
  }
});

router.post('/approve-influencer', async (req, res) => {
  try {
    const { email, name } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir email alanı zorunludur.',
      });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir name alanı zorunludur.',
      });
    }

    // Influencer onay işlemi simülasyonu
    const approvedAt = new Date().toISOString();

    const mailResult = await sendInfluencerApprovedEmail(email.trim(), name.trim());

    return res.status(200).json({
      success: true,
      message: 'Influencer onaylandı ve bilgilendirme maili gönderildi.',
      data: {
        email: email.trim(),
        name: name.trim(),
        status: 'onayland\u0131',
        approvedAt,
        messageId: mailResult.messageId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Influencer onay maili gönderilemedi: ${error.message}`,
    });
  }
});

router.post('/approve-payout-verification', async (req, res) => {
  try {
    const { email, name } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir email alanı zorunludur.',
      });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir name alanı zorunludur.',
      });
    }

    const notifiedAt = new Date().toISOString();
    const mailResult = await sendPayoutVerificationApprovedEmail(email.trim(), name.trim());

    return res.status(200).json({
      success: true,
      message: 'Ödeme doğrulama bilgilendirme maili gönderildi.',
      data: {
        email: email.trim(),
        name: name.trim(),
        notifiedAt,
        messageId: mailResult.messageId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Ödeme doğrulama maili gönderilemedi: ${error.message}`,
    });
  }
});

router.post('/approve-brand', async (req, res) => {
  try {
    const { email, name } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir email alanı zorunludur.',
      });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir name alanı zorunludur.',
      });
    }

    const mailResult = await sendBrandApprovedEmail(email.trim(), name.trim());

    return res.status(200).json({
      success: true,
      message: 'Marka onay bilgilendirme maili gönderildi.',
      data: {
        email: email.trim(),
        name: name.trim(),
        messageId: mailResult.messageId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Marka onay maili gönderilemedi: ${error.message}`,
    });
  }
});

router.post('/reject-profile-verification', async (req, res) => {
  try {
    const { email, name, accountType } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir email alanı zorunludur.',
      });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir name alanı zorunludur.',
      });
    }

    const at = accountType === 'brand' ? 'brand' : 'influencer';
    const mailResult = await sendProfileVerificationRejectedEmail(email.trim(), name.trim(), at);

    return res.status(200).json({
      success: true,
      message: 'Red bilgilendirme maili gönderildi.',
      data: {
        email: email.trim(),
        name: name.trim(),
        accountType: at,
        messageId: mailResult.messageId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Red maili gönderilemedi: ${error.message}`,
    });
  }
});

/**
 * POST /api/admin/test-email
 * Yalnızca ENABLE_TEST_EMAIL_ENDPOINT=true (ve Firebase Bearer) ile. Üretimde varsayılan kapalı.
 * Body: { "to": "kullanici@ornek.com" }
 */
if (String(process.env.ENABLE_TEST_EMAIL_ENDPOINT || '').toLowerCase() === 'true') {
  router.post('/test-email', async (req, res) => {
    const to = req.body && req.body.to != null ? String(req.body.to).trim() : '';
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir "to" e-posta adresi gerekli.',
      });
    }
    try {
      const info = await sendTestEmail({ to });
      return res.json({
        success: true,
        message: 'Test e-postası gönderildi.',
        data: { messageId: info.messageId },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'E-posta gönderilemedi.',
      });
    }
  });
}

module.exports = router;
