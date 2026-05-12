const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { admin, database } = require('../utils/firebaseClient');
const { sendRegistrationVerificationEmail } = require('../services/mailService');
const { promotePendingRegistration, GECICI_MARKA, GECICI_INFLUENCER } = require('../services/registrationPromoteService');

const router = express.Router();

const CODE_TTL_MS = 30 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

function getPepper() {
  return (
    process.env.REGISTRATION_EMAIL_VERIFICATION_SECRET ||
    process.env.PASSWORD_RESET_SECRET ||
    'dev-only-registration-email-pepper-set-env-in-production'
  );
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function hashRegistrationCode(uid, email, code) {
  const pepper = getPepper();
  return crypto
    .createHash('sha256')
    .update(`${pepper}|${uid}|${normalizeEmail(email)}|${String(code).trim()}`, 'utf8')
    .digest('hex');
}

const sendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok sık kod istediniz. Bir süre sonra tekrar deneyin.' },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' },
});

/**
 * POST /auth/register/send-verification-code
 * Authorization: Bearer &lt;Firebase ID token&gt;
 * Kayıt sonrası veya yeniden gönderim: geçici cluster varken kod üretir, RTDB'ye yazar, mail atar.
 */
router.post('/register/send-verification-code', sendLimiter, async (req, res) => {
  let uid;
  let email;

  if (req.user && req.user.uid) {
    uid = req.user.uid;
    email = req.user.email || null;
  } else {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Oturum gerekli. Lütfen tekrar giriş yapın.' });
    }
    try {
      const token = authHeader.substring('Bearer '.length);
      const decoded = await admin.auth().verifyIdToken(token);
      uid = decoded.uid;
      email = decoded.email || null;
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş oturum.' });
    }
  }

  try {
    const fbUser = await admin.auth().getUser(uid);
    if (fbUser.emailVerified) {
      return res.status(400).json({ success: false, message: 'E-posta zaten doğrulanmış.' });
    }
    email = email || fbUser.email || '';
    if (!email) {
      return res.status(400).json({ success: false, message: 'E-posta bulunamadı.' });
    }

    const bSnap = await database.ref(GECICI_MARKA(uid)).once('value');
    const iSnap = await database.ref(GECICI_INFLUENCER(uid)).once('value');
    if (!bSnap.exists() && !iSnap.exists()) {
      return res.status(400).json({
        success: false,
        message: 'Bekleyen kayıt bulunamadı. Yeni kayıt oluşturabilirsiniz.',
      });
    }

    const pending = bSnap.exists() ? bSnap.val() : iSnap.val();
    const pendingEmail = normalizeEmail(pending.email || '');
    if (pendingEmail && normalizeEmail(email) !== pendingEmail) {
      return res.status(400).json({ success: false, message: 'E-posta adresi kayıtla eşleşmiyor.' });
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = hashRegistrationCode(uid, email, code);
    const expiresAt = Date.now() + CODE_TTL_MS;

    const ev = {
      codeHash,
      expiresAt,
      attempts: 0,
      sentAt: new Date().toISOString(),
    };

    const basePath = bSnap.exists() ? GECICI_MARKA(uid) : GECICI_INFLUENCER(uid);
    /** Tamamen yeni ev: önceki codeHash silinir — eski 6 haneli kod artık geçersiz */
    await database.ref(`${basePath}/emailVerification`).set(ev);

    await sendRegistrationVerificationEmail(email, code);

    return res.json({
      success: true,
      message: 'Doğrulama kodu e-posta adresinize gönderildi.',
    });
  } catch (err) {
    console.error('[registrationVerification] send-code:', {
      name: err && err.name,
      message: err && err.message,
      code: err && err.code,
      responseCode: err && err.responseCode,
    });
    return res.status(500).json({
      success: false,
      message: err.message || 'Kod gönderilemedi. SMTP ayarlarını kontrol edin.',
    });
  }
});

/**
 * POST /auth/register/verify-email
 * Body: { email, code }
 */
router.post('/register/verify-email', verifyLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = req.body?.code != null ? String(req.body.code).trim().replace(/\D/g, '').slice(0, 8) : '';

  if (!email || !/^\d{6}$/.test(code)) {
    return res.status(400).json({
      success: false,
      message: 'Geçerli e-posta ve 6 haneli kod girin.',
    });
  }

  let uid;
  try {
    const user = await admin.auth().getUserByEmail(email);
    uid = user.uid;
    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'E-posta zaten doğrulanmış. Giriş yapabilirsiniz.',
      });
    }
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      return res.status(400).json({
        success: false,
        message: 'Bu e-posta ile kayıt bulunamadı.',
      });
    }
    console.error('[registrationVerification] getUserByEmail:', e.message);
    return res.status(500).json({ success: false, message: 'İşlem sırasında bir hata oluştu.' });
  }

  try {
    const bSnap = await database.ref(GECICI_MARKA(uid)).once('value');
    const iSnap = await database.ref(GECICI_INFLUENCER(uid)).once('value');
    if (!bSnap.exists() && !iSnap.exists()) {
      return res.status(400).json({
        success: false,
        message: 'Bekleyen kayıt bulunamadı veya hesap zaten aktarılmış.',
      });
    }

    const basePath = bSnap.exists() ? GECICI_MARKA(uid) : GECICI_INFLUENCER(uid);
    const pending = bSnap.exists() ? bSnap.val() : iSnap.val();
    const pendingEmail = normalizeEmail(pending.email || '');
    if (pendingEmail && pendingEmail !== email) {
      return res.status(400).json({ success: false, message: 'E-posta eşleşmiyor.' });
    }

    const evSnap = await database.ref(`${basePath}/emailVerification`).once('value');
    if (!evSnap.exists()) {
      return res.status(400).json({
        success: false,
        message: 'Doğrulama kodu bulunamadı. Yeni kod isteyin.',
      });
    }

    const ev = evSnap.val();
    if (Date.now() > (ev.expiresAt || 0)) {
      await database.ref(`${basePath}/emailVerification`).remove();
      return res.status(400).json({
        success: false,
        message: 'Kodun süresi doldu. Yeni kod isteyin.',
      });
    }

    const attempts = Number(ev.attempts || 0);
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Çok fazla hatalı deneme. Yeni kod isteyin.',
      });
    }

    const expectedHash = ev.codeHash;
    const actualHash = hashRegistrationCode(uid, email, code);

    if (expectedHash !== actualHash) {
      await database.ref(`${basePath}/emailVerification`).update({
        attempts: attempts + 1,
      });
      return res.status(400).json({
        success: false,
        message: 'Kod hatalı.',
      });
    }

    await database.ref(`${basePath}/emailVerification`).remove();

    await admin.auth().updateUser(uid, { emailVerified: true });

    await promotePendingRegistration(uid, email);

    return res.json({
      success: true,
      message: 'E-posta doğrulandı. Giriş yapabilirsiniz.',
    });
  } catch (err) {
    console.error('[registrationVerification] verify-email:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Doğrulama sırasında bir hata oluştu.',
    });
  }
});

module.exports = router;
