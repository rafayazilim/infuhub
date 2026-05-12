const { getPublicSiteOrigin } = require('../../../utils/siteOrigin');
const { escapeHtml } = require('../escape');
const { renderEmailLayout } = require('../renderEmailLayout');
const t = require('../designTokens');

/**
 * POST /api/admin/test-email ve SMTP duman testi
 */
function systemTestEmailTemplate({ atIso }) {
  const when = atIso != null && String(atIso) ? String(atIso) : new Date().toISOString();
  const site = getPublicSiteOrigin();
  const safeWhen = escapeHtml(when);

  const innerHtml = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:${t.textPrimary};line-height:1.3;">E-posta altyapısı testi</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:${t.textSecondary};">
      Bu, INFUHUB sunucunuzun Google Workspace SMTP üzerinden başarılı şekilde e-posta iletebildiğini doğrulamak için gönderilen otomatik bir test mesajıdır.
    </p>
    <p style="margin:0;padding:12px 14px;border-radius:10px;border:1px dashed ${t.cardBorder};font-size:13px;font-family:Consolas,monospace;color:${t.textPrimary};background:#FAFBFC;">
      ${safeWhen}
    </p>
  `;

  const html = renderEmailLayout({
    previewText: 'INFUHUB e-posta testi',
    innerHtml,
    siteUrl: site,
    securityNote: 'Beklemediğiniz bu testi aldıysanız e-posta yöneticinize başvurun.',
  });

  const text = [
    'INFUHUB e-posta altyapı testi',
    '',
    'Zaman: ' + when,
    '',
    'Bu mesaj, SMTP yapılandırmasını doğrulamak içindir.',
    '',
    '— INFUHUB · ' + site,
  ].join('\n');

  return { subject: 'INFUHUB e-posta altyapı testi', text, html };
}

module.exports = { systemTestEmailTemplate };
