const { escapeHtml } = require('./escape');
const t = require('./designTokens');

/**
 * Görsel logo: mutlak URL (env) veya metin/renkli INFUHUB fallback
 */
function getLogoBlockHtml(logoUrl) {
  const url = (logoUrl || process.env.INFUHUB_LOGO_URL || '').trim();
  if (url) {
    const safe = escapeHtml(url);
    return `<img src="${safe}" width="160" height="auto" alt="INFUHUB" style="display:block;max-width:160px;height:auto;border:0;outline:none;text-decoration:none;" />`;
  }
  // Gradient benzeri: iki ton marka rengi (e-posta uyumlu, webkit dışı yedek)
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="font-size:26px;font-weight:800;letter-spacing:0.1em;line-height:1.2;">
      <span style="color:${t.primary};">INFU</span><span style="color:${t.accentPink};">HUB</span>
    </td>
  </tr>
</table>`;
}

/**
 * @param {object} p
 * @param {string} p.previewText - Önizleme / preheader
 * @param {string} p.innerHtml - Ana kartın içi (XSS: çağırıcı kaçırılmış/güvenli parçalar birleştirir)
 * @param {string} [p.securityNote] - Alt bilgilendirme
 * @param {string} [p.siteUrl] - Footer linki
 */
function renderEmailLayout({ previewText, innerHtml, securityNote, siteUrl = 'https://infuhub.ai' }) {
  const pre = escapeHtml(previewText || 'INFUHUB');
  const defaultSecurity =
    'Bu işlemi siz başlatmadıysanız bu e-postayı güvenle yok sayabilirsiniz.';
  const sec = securityNote != null && securityNote !== '' ? securityNote : defaultSecurity;
  const safeSec = sec.includes('<') ? sec : escapeHtml(sec);
  const site = escapeHtml((siteUrl || 'https://infuhub.ai').replace(/\/+$/, ''));
  const logoBlock = getLogoBlockHtml();

  // Table tabanlı, responsive: max-width + meta viewport
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pre}</title>
  <!--[if mso]>
  <style type="text/css">table { border-collapse: collapse; } .button-td a { text-decoration: none; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${t.bgPage};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${t.bgPage};mso-hide:all;">
    ${pre}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${t.bgPage};min-height:100%;">
    <tr>
      <td align="center" style="padding:32px 16px 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:${t.maxWidth}px;width:100%;">
          <tr>
            <td style="padding:0 0 20px 0;text-align:center;">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 0 16px 0;">
              <span style="display:inline-block;padding:4px 12px;border-radius:999px;background-color:#EEF2FF;color:${t.primary};font-family:${t.fontStack};font-size:11px;font-weight:600;letter-spacing:0.14em;">INFUHUB</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:${t.cardBg};border:1px solid ${t.cardBorder};border-radius:${t.borderRadiusCard}px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:36px 28px 32px 28px;font-family:${t.fontStack};">
                    ${innerHtml}
                    <div style="margin-top:28px;padding:14px 16px;border-radius:12px;background-color:${t.infoBg};border:1px solid ${t.cardBorder};">
                      <p style="margin:0;font-size:13px;line-height:1.5;color:${t.textSecondary};">
                        ${safeSec}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 12px 0 12px;text-align:center;font-family:${t.fontStack};">
              <p style="margin:0 0 6px 0;font-size:12px;line-height:1.5;color:${t.textSecondary};">Bu e-posta INFUHUB tarafından otomatik olarak gönderilmiştir.</p>
              <p style="margin:0 0 12px 0;font-size:12px;line-height:1.5;color:${t.textSecondary};">Lütfen bu e-postayı yanıtlamayın.</p>
              <a href="${site}/" target="_blank" rel="noopener noreferrer" style="color:${t.primary};font-size:13px;font-weight:600;text-decoration:none;">${site.replace(/^https?:\/\//, '')}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { renderEmailLayout, getLogoBlockHtml };
