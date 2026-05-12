const { getPublicSiteOrigin } = require('../../../utils/siteOrigin');
const { escapeHtml } = require('../escape');
const { renderEmailLayout } = require('../renderEmailLayout');
const t = require('../designTokens');

const copyByEvent = {
  brand_offer_created: {
    subject: 'INFUHUB yeni kampanya teklifi',
    heading: 'Yeni bir kampanya teklifi aldınız',
    lead: 'Marka sizin için yeni bir teklif paylaştı.',
    cta: 'Teklifi görüntüle',
  },
  incoming_offer_created: {
    subject: 'INFUHUB yeni influencer teklifi',
    heading: 'Kampanyanıza yeni teklif geldi',
    lead: 'Bir influencer kampanyanıza katılım teklifi gönderdi.',
    cta: 'Teklifi incele',
  },
  influencer_counter_created: {
    subject: 'INFUHUB yeni karşı teklif',
    heading: 'Yeni karşı teklif geldi',
    lead: 'Influencer teklif pazarlığı için yeni bir karşı teklif gönderdi.',
    cta: 'Karşı teklifi incele',
  },
  brand_counter_sent: {
    subject: 'INFUHUB karşı teklif güncellendi',
    heading: 'Markadan yeni karşı teklif geldi',
    lead: 'Marka teklif pazarlığı için güncel bir teklif paylaştı.',
    cta: 'Teklife git',
  },
  offer_accepted: {
    subject: 'INFUHUB teklif kabul edildi',
    heading: 'Teklif kabul edildi',
    lead: 'Kampanya teklifi kabul edildi. Detayları panelden takip edebilirsiniz.',
    cta: 'Detaya git',
  },
  offer_rejected: {
    subject: 'INFUHUB teklif reddedildi',
    heading: 'Teklif reddedildi',
    lead: 'Kampanya teklifi reddedildi. Detayları panelden kontrol edebilirsiniz.',
    cta: 'Detaya git',
  },
  content_uploaded: {
    subject: 'INFUHUB yeni içerik yüklendi',
    heading: 'Influencer içerik yükledi',
    lead: 'Kampanya için yeni ham içerik yüklendi. İnceleme ve onay işlemini panelden yapabilirsiniz.',
    cta: 'İçeriği incele',
  },
  content_share_link_set: {
    subject: 'INFUHUB paylaşım linki eklendi',
    heading: 'Paylaşım linki eklendi',
    lead: 'Influencer onaylanan içeriğin paylaşım linkini ekledi. Final onay için kontrol edin.',
    cta: 'Linkleri kontrol et',
  },
  content_media_approved: {
    subject: 'INFUHUB ham içerik onaylandı',
    heading: 'Ham içeriğiniz onaylandı',
    lead: 'Marka ham içeriğinizi onayladı. Artık paylaşım linkini ekleyebilirsiniz.',
    cta: 'Teslimata git',
  },
  content_revision_requested: {
    subject: 'INFUHUB revizyon talebi',
    heading: 'Revizyon istendi',
    lead: 'Marka yüklediğiniz içerik için revizyon istedi. Notları inceleyip yeni içerik yükleyebilirsiniz.',
    cta: 'Revizyonu gör',
  },
  content_approved: {
    subject: 'INFUHUB içerik onaylandı',
    heading: 'İçeriğiniz onaylandı',
    lead: 'Marka içerik tesliminizi onayladı. Ödeme akışı sistemde işleme alındı.',
    cta: 'Teslimatı gör',
  },
  content_rejected: {
    subject: 'INFUHUB içerik reddedildi',
    heading: 'İçerik reddedildi',
    lead: 'Marka içerik tesliminizi reddetti. Gerekli düzenlemeyi panelden takip edebilirsiniz.',
    cta: 'Detaya git',
  },
};

function transactionalEventEmailTemplate({
  eventType,
  recipientName,
  campaignName,
  brandName,
  influencerName,
  priceLine,
  actionUrl,
}) {
  const site = getPublicSiteOrigin();
  const copy = copyByEvent[eventType] || copyByEvent.offer_accepted;
  const finalUrl = /^https?:\/\//i.test(String(actionUrl || ''))
    ? String(actionUrl)
    : `${site.replace(/\/$/, '')}/${String(actionUrl || '/').replace(/^\//, '')}`;

  const rows = [
    ['Kampanya', campaignName || 'Kampanya'],
    ['Marka', brandName || 'Marka'],
    ['Influencer', influencerName || 'Influencer'],
    priceLine ? ['Tutar', priceLine] : null,
  ].filter(Boolean);

  const details = rows
    .map(
      ([label, value]) => `
        <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${t.textSecondary};">${escapeHtml(label)}</p>
        <p style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:${t.textPrimary};">${escapeHtml(String(value))}</p>
      `
    )
    .join('');

  const innerHtml = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:${t.textPrimary};line-height:1.3;">${escapeHtml(copy.heading)}</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:${t.textSecondary};">
      ${recipientName ? `${escapeHtml(recipientName)}, ` : ''}${escapeHtml(copy.lead)}
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;border:1px solid ${t.cardBorder};border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:16px 18px;background-color:#FAFBFC;">
          ${details}
        </td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
      <tr>
        <td align="center" style="border-radius:${t.borderRadiusButton}px;" bgcolor="#08afd5">
          <a href="${escapeHtml(finalUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;border-radius:${t.borderRadiusButton}px;font-family:${t.fontStack};font-size:15px;font-weight:700;color:#ffffff !important;text-decoration:none;background:linear-gradient(90deg,#08afd5 0%,#e3447c 100%);">${escapeHtml(copy.cta)}</a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:12px;line-height:1.5;color:${t.textSecondary};word-break:break-all;">Bağlantı: <a href="${escapeHtml(finalUrl)}" style="color:${t.primary};">${escapeHtml(finalUrl)}</a></p>
  `;

  const html = renderEmailLayout({
    previewText: copy.heading,
    innerHtml,
    siteUrl: site,
    securityNote: 'Bu işlem size ait değilse INFUHUB panelinizden hesap hareketlerinizi kontrol edin.',
  });

  const text = [
    copy.heading,
    '',
    copy.lead,
    '',
    `Kampanya: ${campaignName || 'Kampanya'}`,
    `Marka: ${brandName || 'Marka'}`,
    `Influencer: ${influencerName || 'Influencer'}`,
    priceLine ? `Tutar: ${priceLine}` : '',
    '',
    `${copy.cta}: ${finalUrl}`,
    '',
    `INFUHUB · ${site}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject: copy.subject, text, html };
}

module.exports = { transactionalEventEmailTemplate };
