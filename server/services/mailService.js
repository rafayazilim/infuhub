const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const mailTemplates = require('./mail/templates');
const {
  verificationCodeEmailTemplate,
  resetPasswordEmailTemplate,
  accountStatusEmailTemplate,
  transactionalEventEmailTemplate,
  systemTestEmailTemplate,
} = mailTemplates;

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

let cachedTransporter = null;

/**
 * Tüm transactional e-postalar Google Workspace (veya uyumlu) SMTP üzerinden;
 * Nodemailer transporter bu dosyada tekilleştirildi. Host/şifre hardcode edilmez.
 */

function parseEnvBool(value) {
  if (value === undefined || value === '') return undefined;
  const v = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'off'].includes(v)) return false;
  return undefined;
}

/**
 * Açılışta eksik değişken uyarıları (uygulamayı sonlandırmaz). SMTP_PASS vb. değerler loglanmaz.
 * MAIL_FROM: geriye dönük; tercihen MAIL_FROM_EMAIL kullanın.
 */
function logSmtpConfigurationWarningsOnStartup() {
  const need = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'MAIL_FROM_EMAIL',
  ];
  for (const key of need) {
    if (key === 'MAIL_FROM_EMAIL') {
      const fe = (process.env.MAIL_FROM_EMAIL || '').trim();
      const legacy = (process.env.MAIL_FROM || '').trim();
      if (!fe) {
        if (legacy) {
          console.warn(
            `[mailService] MAIL_FROM_EMAIL boş; MAIL_FROM ile uyumluluk sağlandı. Yeni dağıtımlarda MAIL_FROM_EMAIL kullanın.`
          );
        } else if ((process.env.SMTP_USER || '').trim()) {
          console.warn(
            `[mailService] MAIL_FROM_EMAIL tanımlı değil; görünen From adresi için SMTP_USER kullanılacak.`
          );
        } else {
          console.warn(
            `[mailService] ${key} (veya MAIL_FROM / SMTP_USER) tanımlı değil; e-posta gönderilemeyebilir.`
          );
        }
      }
      continue;
    }
    const v = (process.env[key] || '').trim();
    if (!v) {
      console.warn(
        `[mailService] E-posta için "${key}" tanımlı değil veya boş. Transactional posta çalışmayabilir.`
      );
    }
  }
}

function getResolvedFromEmail() {
  return (
    (process.env.MAIL_FROM_EMAIL || '').trim() ||
    (process.env.MAIL_FROM || '').trim() ||
    (process.env.SMTP_USER || '').trim()
  );
}

function getMailFromName() {
  return (process.env.MAIL_FROM_NAME || 'INFUHUB').trim() || 'INFUHUB';
}

/** "INFUHUB" <no-reply@...> */
function getMailFromHeader() {
  const email = getResolvedFromEmail();
  if (!email) {
    throw new Error('MAIL_FROM_EMAIL (veya MAIL_FROM / SMTP_USER) tanımlı olmalı');
  }
  return `"${getMailFromName()}" <${email}>`;
}

/** Envelope: SMTP girişi ile aynı (SPF) */
function getSmtpIdentityEmail() {
  const u = (process.env.SMTP_USER || '').trim();
  if (!u) {
    throw new Error('SMTP_USER tanımlı olmalı');
  }
  return u;
}

function isSmtpConfigurationComplete() {
  const pass = (process.env.SMTP_PASS || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  if (!pass || !user) return false;
  const portStr =
    process.env.SMTP_PORT !== undefined && process.env.SMTP_PORT !== ''
      ? String(process.env.SMTP_PORT).trim()
      : '465';
  const port = Number(portStr);
  if (Number.isNaN(port)) return false;
  const from = getResolvedFromEmail();
  if (!from) return false;
  return true;
}

function buildTransportOptions() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const portRaw = process.env.SMTP_PORT;
  const port = Number(
    portRaw !== undefined && portRaw !== '' && String(portRaw).trim() !== '' ? portRaw : 465
  );
  if (Number.isNaN(port)) {
    throw new Error('SMTP_PORT sayısal olmalı');
  }
  const secureFromEnv = parseEnvBool(process.env.SMTP_SECURE);
  const secure =
    secureFromEnv !== undefined
      ? secureFromEnv
      : String(process.env.SMTP_SECURE || 'true') === 'true';

  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  if (!user || !pass) {
    throw new Error('SMTP_USER ve SMTP_PASS yapılandırılmamış');
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure && port === 587,
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
    },
  };
}

function logSmtpError(context, err) {
  if (!err) return;
  console.error(`[mailService] ${context}:`, {
    name: err.name,
    message: err.message,
    code: err.code,
    responseCode: err.responseCode,
    command: err.command,
  });
}

function htmlToPlainTextFallback(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * From = görünen ad; envelope = SMTP_USER. Yalnızca güvenli alanlar dışa loglanır.
 */
async function sendTransactionalMail(transporter, { to, subject, text, html }) {
  const toAddr = String(to || '').trim();
  if (!toAddr) {
    throw new Error('Recipient email is required');
  }

  let finalText = text;
  if ((!finalText || !String(finalText).trim()) && html) {
    const plain = htmlToPlainTextFallback(html);
    finalText =
      plain || 'Bu e-posta HTML formatındadır. Lütfen HTML destekleyen bir istemci kullanın.';
  }
  if (!finalText) {
    finalText = ' ';
  }

  try {
    const smtpIdentity = getSmtpIdentityEmail();
    const fromHeader = getMailFromHeader();
    if (getResolvedFromEmail().toLowerCase() !== smtpIdentity.toLowerCase()) {
      console.warn(
        '[mailService] Görünen From (MAIL_FROM_EMAIL) ile SMTP_USER farklı; SPF/DKIM için genelde aynı hesap önerilir.'
      );
    }
    const info = await transporter.sendMail({
      from: fromHeader,
      to: toAddr,
      replyTo: smtpIdentity,
      subject,
      text: finalText,
      html: html || undefined,
      envelope: {
        from: smtpIdentity,
        to: toAddr,
      },
      headers: {
        'X-Mailer': 'Infuhub',
      },
    });

    const rejected = info.rejected && info.rejected.length ? info.rejected : null;
    const accepted = info.accepted && info.accepted.length ? info.accepted : null;
    const baseLog = `[mailService] sent -> ${toAddr}, messageId=${info.messageId}`;
    if (rejected && rejected.length) {
      console.warn(baseLog, 'SMTP rejected recipients:', rejected);
    } else {
      console.log(baseLog, accepted ? `accepted=${JSON.stringify(accepted)}` : '');
    }

    return info;
  } catch (err) {
    logSmtpError('sendTransactionalMail', err);
    throw err;
  }
}

function createTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }
  if (!isSmtpConfigurationComplete()) {
    throw new Error(
      'E-posta sunucusu yapılandırılmamış. SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ve gönderen için MAIL_FROM_EMAIL (veya MAIL_FROM / SMTP_USER) değerlerini ayarlayın.'
    );
  }
  const transportOptions = buildTransportOptions();
  const smtpDebug = process.env.SMTP_DEBUG === 'true' || process.env.SMTP_DEBUG === '1';
  if (smtpDebug) {
    transportOptions.debug = true;
    transportOptions.logger = true;
  }
  cachedTransporter = nodemailer.createTransport(transportOptions);
  return cachedTransporter;
}

/**
 * Dahili / test: POST /api/admin/test-email (yalnızca ENABLE_TEST_EMAIL_ENDPOINT=true iken açılır)
 */
async function sendTestEmail({ to }) {
  const toAddr = String(to || '').trim();
  if (!toAddr) {
    throw new Error('Recipient (to) is required');
  }
  const transporter = createTransporter();
  const template = systemTestEmailTemplate({ atIso: new Date().toISOString() });
  return sendTransactionalMail(transporter, {
    to: toAddr,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

async function sendPayoutVerificationApprovedEmail(email, name) {
  if (!email) {
    throw new Error('Recipient email is required');
  }

  const transporter = createTransporter();
  const template = accountStatusEmailTemplate({ variant: 'payout_approved', name });

  return sendTransactionalMail(transporter, {
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

async function sendInfluencerApprovedEmail(email, name) {
  if (!email) {
    throw new Error('Recipient email is required');
  }
  const transporter = createTransporter();
  const template = accountStatusEmailTemplate({ variant: 'influencer_approved', name });
  try {
    return await sendTransactionalMail(transporter, {
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  } catch (error) {
    logSmtpError('sendInfluencerApprovedEmail', error);
    throw error;
  }
}

async function sendBrandApprovedEmail(email, name) {
  if (!email) {
    throw new Error('Recipient email is required');
  }
  const transporter = createTransporter();
  const template = accountStatusEmailTemplate({ variant: 'brand_approved', name });
  return sendTransactionalMail(transporter, {
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

async function sendProfileVerificationRejectedEmail(email, name, accountType) {
  if (!email) {
    throw new Error('Recipient email is required');
  }
  const kind = accountType === 'brand' ? 'brand' : 'influencer';
  const transporter = createTransporter();
  const template = accountStatusEmailTemplate({
    variant: 'profile_rejected',
    name,
    accountType: kind,
  });
  return sendTransactionalMail(transporter, {
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

async function sendPasswordResetCodeEmail(email, code) {
  if (!email) {
    throw new Error('Recipient email is required');
  }

  const transporter = createTransporter();
  const template = resetPasswordEmailTemplate({ code });

  return sendTransactionalMail(transporter, {
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

async function sendRegistrationVerificationEmail(email, code) {
  if (!email) {
    throw new Error('Recipient email is required');
  }

  const transporter = createTransporter();
  const template = verificationCodeEmailTemplate({ code });

  return sendTransactionalMail(transporter, {
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

async function sendTransactionalEventEmail(email, params) {
  if (!email) {
    throw new Error('Recipient email is required');
  }

  const transporter = createTransporter();
  const template = transactionalEventEmailTemplate(params || {});

  return sendTransactionalMail(transporter, {
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

module.exports = {
  logSmtpConfigurationWarningsOnStartup,
  isSmtpConfigurationComplete,
  emailTemplates: mailTemplates,
  sendTestEmail,
  sendInfluencerApprovedEmail,
  sendBrandApprovedEmail,
  sendProfileVerificationRejectedEmail,
  sendPayoutVerificationApprovedEmail,
  sendPasswordResetCodeEmail,
  sendRegistrationVerificationEmail,
  sendTransactionalEventEmail,
};
