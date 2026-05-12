const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { admin } = require('../utils/firebaseClient');
const { sendPasswordResetCodeEmail } = require('../services/mailService');

const router = express.Router();

const CODE_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MAX_REQUESTS_PER_EMAIL_WINDOW = 3;
const REQUEST_EMAIL_WINDOW_MS = 60 * 60 * 1000;

function getPepper() {
  return (
    process.env.PASSWORD_RESET_SECRET ||
    'dev-only-password-reset-pepper-set-PASSWORD_RESET_SECRET-in-production'
  );
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function hashCode(email, code) {
  const pepper = getPepper();
  return crypto.createHash('sha256').update(`${pepper}|${email}|${code}`, 'utf8').digest();
}

function verifyCodeHash(email, code, expectedBuf) {
  const h = hashCode(email, String(code).trim());
  if (!Buffer.isBuffer(expectedBuf) || expectedBuf.length !== h.length) return false;
  return crypto.timingSafeEqual(h, expectedBuf);
}

/** @type {Map<string, { codeHash: Buffer, uid: string, expiresAt: number, attempts: number }>} */
const pendingByEmail = new Map();

/** @type {Map<string, { uid: string, email: string, expiresAt: number }>} */
const resetSessions = new Map();

/** @type {Map<string, number[]>} email -> timestamps of code sends */
const requestHistoryByEmail = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [k, v] of pendingByEmail.entries()) {
    if (v.expiresAt < now) pendingByEmail.delete(k);
  }
  for (const [k, v] of resetSessions.entries()) {
    if (v.expiresAt < now) resetSessions.delete(k);
  }
  for (const [email, ts] of requestHistoryByEmail.entries()) {
    const fresh = ts.filter((t) => now - t < REQUEST_EMAIL_WINDOW_MS);
    if (fresh.length === 0) requestHistoryByEmail.delete(email);
    else requestHistoryByEmail.set(email, fresh);
  }
}

setInterval(pruneExpired, 5 * 60 * 1000).unref();

function canSendAnotherCode(email) {
  pruneExpired();
  const now = Date.now();
  const history = requestHistoryByEmail.get(email) || [];
  const recent = history.filter((t) => now - t < REQUEST_EMAIL_WINDOW_MS);
  return recent.length < MAX_REQUESTS_PER_EMAIL_WINDOW;
}

function recordCodeSend(email) {
  const now = Date.now();
  const history = requestHistoryByEmail.get(email) || [];
  history.push(now);
  requestHistoryByEmail.set(email, history);
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const requestIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.' },
});

const verifyIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' },
});

const completeIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.' },
});

/**
 * POST /auth/forgot-password/request
 * Body: { email }
 */
router.post('/forgot-password/request', requestIpLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Geçerli bir e-posta adresi girin.',
    });
  }

  if (!canSendAnotherCode(email)) {
    return res.status(429).json({
      success: false,
      message: 'Bu e-posta için çok sık kod istediniz. Bir süre sonra tekrar deneyin.',
    });
  }

  let uid = null;
  try {
    const user = await admin.auth().getUserByEmail(email);
    uid = user.uid;
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      console.error('[passwordReset] getUserByEmail:', err.code, err.message);
      return res.status(500).json({
        success: false,
        message: 'İşlem sırasında bir hata oluştu.',
      });
    }
  }

  await delay(350 + Math.floor(Math.random() * 200));

  if (uid) {
    try {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      const codeHash = hashCode(email, code);
      pendingByEmail.set(email, {
        codeHash,
        uid,
        expiresAt: Date.now() + CODE_TTL_MS,
        attempts: 0,
      });
      await sendPasswordResetCodeEmail(email, code);
      recordCodeSend(email);
      console.log('[passwordReset] verification code e-mail queued/sent for', email);
    } catch (e) {
      console.error('[passwordReset] send code failed:', {
        name: e && e.name,
        message: e && e.message,
        code: e && e.code,
        responseCode: e && e.responseCode,
      });
      pendingByEmail.delete(email);
      return res.status(500).json({
        success: false,
        message: 'E-posta gönderilemedi. SMTP ayarlarını kontrol edin veya daha sonra deneyin.',
      });
    }
  } else {
    console.log('[passwordReset] no Firebase Auth user for e-mail (no code sent, same response as success)');
  }

  return res.json({
    success: true,
    message:
      'Bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama kodu gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.',
  });
});

/**
 * POST /auth/forgot-password/verify-code
 * Body: { email, code }
 */
router.post('/forgot-password/verify-code', verifyIpLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = req.body?.code != null ? String(req.body.code).trim() : '';

  if (!email || !/^\d{6}$/.test(code)) {
    return res.status(400).json({
      success: false,
      message: 'Geçerli e-posta ve 6 haneli kod girin.',
    });
  }

  pruneExpired();
  const pending = pendingByEmail.get(email);
  if (!pending || Date.now() > pending.expiresAt) {
    return res.status(400).json({
      success: false,
      message: 'Kod geçersiz veya süresi dolmuş. Yeni kod isteyin.',
    });
  }

  if (pending.attempts >= MAX_CODE_ATTEMPTS) {
    pendingByEmail.delete(email);
    return res.status(429).json({
      success: false,
      message: 'Çok fazla hatalı deneme. Yeni kod isteyin.',
    });
  }

  pending.attempts += 1;

  if (!verifyCodeHash(email, code, pending.codeHash)) {
    return res.status(400).json({
      success: false,
      message: 'Kod hatalı.',
    });
  }

  pendingByEmail.delete(email);

  const resetToken = crypto.randomBytes(32).toString('hex');
  resetSessions.set(resetToken, {
    uid: pending.uid,
    email,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return res.json({
    success: true,
    resetToken,
    message: 'Kod doğrulandı. Yeni şifrenizi belirleyin.',
  });
});

function validateNewPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) {
    return 'Şifre en az 8 karakter olmalıdır.';
  }
  if (pw.length > 128) {
    return 'Şifre çok uzun.';
  }
  if (!/\p{Lu}/u.test(pw)) {
    return 'Şifre en az bir büyük harf içermelidir.';
  }
  if (!/\d/.test(pw)) {
    return 'Şifre en az bir rakam içermelidir.';
  }
  return null;
}

/**
 * POST /auth/forgot-password/set-password
 * Body: { resetToken, newPassword }
 */
router.post('/forgot-password/set-password', completeIpLimiter, async (req, res) => {
  const resetToken =
    typeof req.body?.resetToken === 'string' ? req.body.resetToken.trim() : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!resetToken || resetToken.length !== 64 || !/^[a-f0-9]+$/i.test(resetToken)) {
    return res.status(400).json({
      success: false,
      message: 'Geçersiz oturum. İşlemi baştan başlatın.',
    });
  }

  const pwErr = validateNewPassword(newPassword);
  if (pwErr) {
    return res.status(400).json({ success: false, message: pwErr });
  }

  pruneExpired();
  const session = resetSessions.get(resetToken);
  if (!session || Date.now() > session.expiresAt) {
    return res.status(400).json({
      success: false,
      message: 'Oturum süresi doldu veya geçersiz. Kodu yeniden doğrulayın.',
    });
  }

  try {
    await admin.auth().updateUser(session.uid, { password: newPassword });
  } catch (err) {
    console.error('[passwordReset] updateUser:', err.code, err.message);
    if (err.code === 'auth/weak-password') {
      return res.status(400).json({
        success: false,
        message: 'Şifre çok zayıf. Daha güçlü bir şifre seçin.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Şifre güncellenemedi.',
    });
  }

  resetSessions.delete(resetToken);

  return res.json({
    success: true,
    message: 'Şifreniz güncellendi. Giriş sayfasından yeni şifrenizle oturum açabilirsiniz.',
  });
});

module.exports = router;
