const { getPublicSiteOrigin } = require('../../../utils/siteOrigin');
const { escapeHtml } = require('../escape');
const { renderEmailLayout } = require('../renderEmailLayout');
const t = require('../designTokens');

/**
 * @param {object} p
 * @param {string} p.code
 */
function verificationCodeEmailTemplate({ code }) {
  const safeCode = String(code || '')
    .replace(/\D/g, '')
    .slice(0, 8);
  const site = getPublicSiteOrigin();
  const loginLine = escapeHtml(`${site}/giris`);

  const innerHtml = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:${t.textPrimary};line-height:1.3;">E-posta doğrulama kodunuz</h1>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${t.textSecondary};">
      INFUHUB hesabınızı tamamlamak için aşağıdaki 6 haneli kodu kullanın.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center" style="padding:20px 16px;border-radius:${t.borderRadiusCode}px;background-color:${t.codeBoxBg};border:1px solid ${t.codeBoxBorder};">
          <div style="font-size:32px;font-weight:800;letter-spacing:10px;font-family:Consolas,'SF Mono',Monaco,monospace;color:${t.textPrimary};line-height:1.2;">
            ${escapeHtml(safeCode)}
          </div>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;font-size:14px;line-height:1.55;color:${t.textSecondary};">
      Bu kod <strong style="color:${t.textPrimary};">30 dakika</strong> geçerlidir.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: 'INFUHUB e-posta doğrulama kodunuz',
    innerHtml,
    siteUrl: site,
    securityNote:
      'Bu işlemi siz başlatmadıysanız bu e-postayı güvenle yok sayabilirsiniz.',
  });

  const text = [
    'E-posta doğrulama kodunuz (INFUHUB)',
    '',
    'INFUHUB hesabınızı tamamlamak için aşağıdaki 6 haneli kodu kullanın.',
    '',
    safeCode,
    '',
    'Bu kod 30 dakika geçerlidir.',
    '',
    'Giriş: ' + loginLine,
    '',
    'Bu işlemi siz başlatmadıysanız bu e-postayı güvenle yok sayabilirsiniz.',
    '',
    '— INFUHUB · ' + site,
  ].join('\n');

  return {
    subject: 'INFUHUB e-posta doğrulama kodunuz',
    text,
    html,
  };
}

module.exports = { verificationCodeEmailTemplate };
