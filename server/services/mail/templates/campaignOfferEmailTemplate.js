const { getPublicSiteOrigin } = require('../../../utils/siteOrigin');
const { escapeHtml } = require('../escape');
const { renderEmailLayout } = require('../renderEmailLayout');
const t = require('../designTokens');

/**
 * Kampanya / teklif bilgilendirmesi (gelecekte API’den çağrılabilir).
 * @param {object} p
 * @param {string} p.campaignName
 * @param {string} p.brandName
 * @param {string} p.offerUrl - Mutlak veya siteden üretildi
 * @param {string} [p.dateLine] - Tarih / süre
 */
function campaignOfferEmailTemplate({ campaignName, brandName, offerUrl, dateLine }) {
  const site = getPublicSiteOrigin();
  const cn = escapeHtml(String(campaignName || 'Kampanya').trim());
  const bn = escapeHtml(String(brandName || 'Marka').trim());
  const raw = (offerUrl && String(offerUrl).trim()) || `${site}/influencer/dashboard`;
  const finalUrl = /^https?:\/\//i.test(raw) ? raw : `${site.replace(/\/$/, '')}/${String(raw).replace(/^\//, '')}`;
  const href = escapeHtml(finalUrl);
  const date = dateLine && String(dateLine).trim() ? escapeHtml(String(dateLine).trim()) : '';

  const dateRow = date
    ? `<p style="margin:0 0 16px 0;padding:10px 12px;border-radius:10px;background:${t.infoBg};border:1px solid ${t.cardBorder};font-size:13px;color:${t.textSecondary};"><strong style="color:${t.textPrimary};">Tarih / süre:</strong> ${date}</p>`
    : '';

  const innerHtml = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:${t.textPrimary};line-height:1.3;">Yeni bir kampanya teklifi aldınız</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:${t.textSecondary};">
      Marka sizin için bir teklif paylaştı. Detaylar aşağıda; isterseniz doğrudan panele gidebilirsiniz.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;border:1px solid ${t.cardBorder};border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:16px 18px;background-color:#FAFBFC;">
          <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${t.textSecondary};">Kampanya</p>
          <p style="margin:0 0 14px 0;font-size:16px;font-weight:600;color:${t.textPrimary};">${cn}</p>
          <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${t.textSecondary};">Marka</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:${t.textPrimary};">${bn}</p>
        </td>
      </tr>
    </table>
    ${dateRow}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
      <tr>
        <td align="center" style="border-radius:${t.borderRadiusButton}px;" bgcolor="#2563EB">
          <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;border-radius:${t.borderRadiusButton}px;font-family:${t.fontStack};font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none;background:linear-gradient(90deg,#2563EB 0%,#7C3AED 50%,#EC4899 100%);box-shadow:0 2px 6px rgba(37,99,235,0.22);">Teklifi görüntüle</a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:12px;line-height:1.5;color:${t.textSecondary};word-break:break-all;">Bağlantı: <a href="${href}" style="color:${t.primary};">${href}</a></p>
  `;

  const html = renderEmailLayout({
    previewText: 'Yeni bir kampanya teklifi',
    innerHtml,
    siteUrl: site,
    securityNote:
      'Beklemediğiniz tekliflerde bağlantıya tıklamadan önce gönderen markayı INFUHUB panelinizde doğrulayın.',
  });

  const text = [
    'Yeni bir kampanya teklifi (INFUHUB)',
    '',
    'Kampanya: ' + String(campaignName || ''),
    'Marka: ' + String(brandName || ''),
    dateLine && String(dateLine).trim() ? 'Tarih: ' + String(dateLine) : '',
    '',
    'Teklifi görüntüle: ' + finalUrl,
    '',
    '— INFUHUB · ' + site,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { subject: 'INFUHUB yeni kampanya teklifi', text, html };
}

module.exports = { campaignOfferEmailTemplate };
