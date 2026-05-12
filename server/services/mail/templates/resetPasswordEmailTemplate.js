const { getPublicSiteOrigin } = require('../../../utils/siteOrigin');
const { escapeHtml } = require('../escape');
const { renderEmailLayout } = require('../renderEmailLayout');
const t = require('../designTokens');

/**
 * Uygulama 6 haneli kod + giriş ekranı akışı. CTA, kullanıcının uygulamada kodu girmesine yönlendirir.
 * @param {object} p
 * @param {string} p.code
 * @param {string} [p.resetUrl] - Varsayılan: site/giris
 */
function resetPasswordEmailTemplate({ code, resetUrl }) {
  const site = getPublicSiteOrigin();
  const target = (resetUrl && String(resetUrl).trim()) || `${site}/giris`;
  const safeCode = String(code || '')
    .replace(/\D/g, '')
    .slice(0, 8);
  const href = escapeHtml(target);

  const innerHtml = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:${t.textPrimary};line-height:1.3;">Şifre sıfırlama talebi</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:${t.textSecondary};">
      Hesabınız için bir şifre sıfırlama isteği aldık. Uygulamada kodu girmek veya aşağıdaki bağlantıyı kullanabilirsiniz.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center" style="padding:20px 16px;border-radius:${t.borderRadiusCode}px;background-color:${t.codeBoxBg};border:1px solid ${t.codeBoxBorder};">
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;font-family:Consolas,'SF Mono',Monaco,monospace;color:${t.textPrimary};line-height:1.2;">
            ${escapeHtml(safeCode)}
          </div>
        </td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 20px auto;">
      <tr>
        <td align="center" bgcolor="#2563EB" style="border-radius:${t.borderRadiusButton}px;background:linear-gradient(90deg,#2563EB 0%,#7C3AED 50%,#EC4899 100%);mso-padding-alt:14px 28px;" class="button-td">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="12%" stroke="f" fillcolor="#2563EB">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">Şifremi Sıfırla</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;border-radius:${t.borderRadiusButton}px;font-family:${t.fontStack};font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none;background:linear-gradient(90deg,#2563EB 0%,#7C3AED 55%,#EC4899 100%);box-shadow:0 2px 6px rgba(37,99,235,0.25);">Şifremi Sıfırla</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;line-height:1.5;color:${t.textSecondary};word-break:break-all;">
      Bağlantı (düz metin):<br />
      <a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${t.primary};text-decoration:underline;">${href}</a>
    </p>
    <p style="margin:16px 0 0 0;font-size:14px;line-height:1.55;color:${t.textSecondary};">
      Kod <strong style="color:${t.textPrimary};">15 dakika</strong> geçerlidir.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: 'INFUHUB şifre sıfırlama',
    innerHtml,
    siteUrl: site,
    securityNote:
      'Bu işlemi siz başlatmadıysanız bu e-postayı güvenle yok sayabilirsiniz.',
  });

  const text = [
    'Şifre sıfırlama talebi (INFUHUB)',
    '',
    'Doğrulama kodunuz:',
    safeCode,
    '',
    'Kod 15 dakika geçerlidir.',
    '',
    'INFUHUB uygulamasında şifre sıfırlama: ' + target,
    '',
    'Bağlantı (düz metin): ' + target,
    '',
    'Bu işlemi siz başlatmadıysanız bu e-postayı güvenle yok sayabilirsiniz.',
    '',
    '— INFUHUB · ' + site,
  ].join('\n');

  return {
    subject: 'INFUHUB şifre sıfırlama talebi',
    text,
    html,
  };
}

module.exports = { resetPasswordEmailTemplate };
