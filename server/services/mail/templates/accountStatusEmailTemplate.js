const { getPublicSiteOrigin } = require('../../../utils/siteOrigin');
const { escapeHtml } = require('../escape');
const { renderEmailLayout } = require('../renderEmailLayout');
const t = require('../designTokens');

/**
 * @typedef {'influencer_approved'|'brand_approved'|'profile_rejected'|'payout_approved'} AccountStatusVariant
 * @param {object} p
 * @param {AccountStatusVariant} p.variant
 * @param {string} p.name
 * @param {string} [p.reason] - Sadece profile_rejected (opsiyonel açıklama)
 * @param {'brand'|'influencer'} [p.accountType] - profile_rejected: panele dön linki
 */
function accountStatusEmailTemplate({ variant, name, reason, accountType }) {
  const safeName = escapeHtml(String(name || 'Kullanıcı').trim());
  const site = getPublicSiteOrigin();
  const safeReason = reason != null && String(reason).trim() ? escapeHtml(String(reason).trim()) : '';

  let headline = 'Başvurunuz değerlendirildi';
  let lead = '';
  let badge = '';
  let cta = '';
  let subject = 'INFUHUB başvuru durumunuz güncellendi';
  let preview = subject;
  let extraBlocks = '';
  const security = 'Hesabınızla ilgili şüpheli bir işlem fark ederseniz yalnızca resmi INFUHUB kanallarından iletişime geçin.';

  if (variant === 'influencer_approved') {
    headline = 'Influencer hesabınız onaylandı';
    lead = `Merhaba ${safeName},<br/>INFUHUB influencer hesabınız onaylandı. Artık markaların kampanyalarına başvurabilir ve tekliflerinizi yönetebilirsiniz.`;
    badge = `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:${t.approvedBg};color:${t.approvedText};font-size:12px;font-weight:700;">Onaylandı</span>`;
    const u = escapeHtml(`${site}/login`);
    cta = `<a href="${u}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;padding:12px 24px;border-radius:${t.borderRadiusButton}px;font-family:${t.fontStack};font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none;background:linear-gradient(90deg,#2563EB 0%,#7C3AED 50%,#EC4899 100%);box-shadow:0 2px 6px rgba(37,99,235,0.22);">Panele giriş yap</a>`;
    subject = 'INFUHUB influencer hesabınız onaylandı';
    preview = 'Hesabınız onaylandı — panele giriş yapın';
  } else if (variant === 'brand_approved') {
    headline = 'Marka hesabınız onaylandı';
    lead = `Merhaba ${safeName},<br/>Marka profil doğrulamanız tamamlandı. Kampanyalarınızı oluşturup influencer tekliflerini yönetebilirsiniz.`;
    badge = `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:${t.approvedBg};color:${t.approvedText};font-size:12px;font-weight:700;">Onaylandı</span>`;
    const u = escapeHtml(`${site}/giris`);
    cta = `<a href="${u}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;padding:12px 24px;border-radius:${t.borderRadiusButton}px;font-family:${t.fontStack};font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none;background:linear-gradient(90deg,#2563EB 0%,#7C3AED 50%,#EC4899 100%);box-shadow:0 2px 6px rgba(37,99,235,0.22);">Marka paneline giriş</a>`;
    subject = 'INFUHUB marka hesabınız onaylandı';
    preview = 'Marka hesabınız onaylandı';
  } else if (variant === 'profile_rejected') {
    headline = 'Doğrulama talebiniz değerlendirildi';
    const at = accountType === 'brand' ? 'brand' : 'influencer';
    const dashPath = at === 'brand' ? '/marka/dashboard' : '/influencer/dashboard';
    lead = `Merhaba ${safeName},<br/>Doğrulama başvurunuz incelendikten sonra onaylanmadı. Belgelerinizi gözden geçirip profilinizden yeni bir başvuru gönderebilirsiniz.`;
    badge = `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:${t.rejectedBg};color:${t.rejectedText};font-size:12px;font-weight:700;">Reddedildi</span>`;
    const u = escapeHtml(`${site}${dashPath}`);
    cta = `<a href="${u}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;padding:12px 24px;border-radius:${t.borderRadiusButton}px;border:1px solid ${t.cardBorder};font-family:${t.fontStack};font-size:15px;font-weight:600;color:${t.textPrimary};text-decoration:none;background:#ffffff;">Panele dön</a>`;
    subject = 'INFUHUB başvuru durumunuz güncellendi';
    preview = 'Doğrulama sonucu hakkında bilgi';
    if (safeReason) {
      extraBlocks = `
        <div style="margin:20px 0;padding:16px 18px;border-radius:12px;border:1px solid ${t.cardBorder};background-color:#FFFBFA;">
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${t.textSecondary};">Değerlendirme notu</p>
          <p style="margin:0;font-size:14px;line-height:1.55;color:${t.textPrimary};">${safeReason}</p>
        </div>
      `;
    }
  } else if (variant === 'payout_approved') {
    headline = 'Ödeme bilgileriniz onaylandı';
    lead = `Merhaba ${safeName},<br/>IBAN ve vergi istisna belgeniz onaylandı. Kazançlarınız için panelinizden çekim talebi oluşturabilirsiniz.`;
    badge = `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:${t.approvedBg};color:${t.approvedText};font-size:12px;font-weight:700;">Ödeme profili onaylı</span>`;
    const u = escapeHtml(`${site}/influencer/dashboard`);
    cta = `<a href="${u}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;padding:12px 24px;border-radius:${t.borderRadiusButton}px;font-family:${t.fontStack};font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none;background:linear-gradient(90deg,#2563EB 0%,#7C3AED 50%,#EC4899 100%);box-shadow:0 2px 6px rgba(37,99,235,0.22);">Kazanç paneli</a>`;
    subject = 'INFUHUB ödeme profiliniz onaylandı';
    preview = 'Ödeme doğrulamanız onaylandı';
  } else {
    lead = `Merhaba ${safeName},<br/>Hesabınızla ilgili bir güncelleme var.`;
  }

  const innerHtml = `
    <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:${t.textPrimary};line-height:1.3;">${headline}</h1>
    <div style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:${t.textSecondary};">${lead}</div>
    <p style="margin:0 0 20px 0;">${badge}</p>
    ${extraBlocks}
    <div style="margin-top:4px;">${cta}</div>
  `;

  const html = renderEmailLayout({
    previewText: preview,
    innerHtml,
    siteUrl: site,
    securityNote: security,
  });

  // Plain text: variant-specific lines
  const lines = [subject, '', `Merhaba ${String(name || 'Kullanıcı').trim()},`];
  if (variant === 'influencer_approved') {
    lines.push('INFUHUB influencer hesabınız onaylandı.');
    lines.push('Giriş: ' + site + '/login');
  } else if (variant === 'brand_approved') {
    lines.push('Marka profil doğrulamanız onaylandı.');
    lines.push('Giriş: ' + site + '/giris');
  } else if (variant === 'profile_rejected') {
    const at = accountType === 'brand' ? 'brand' : 'influencer';
    const dash = at === 'brand' ? site + '/marka/dashboard' : site + '/influencer/dashboard';
    lines.push('Doğrulama talebiniz maalesef onaylanmadı.');
    if (reason) lines.push('Not: ' + String(reason).trim());
    lines.push('Panel: ' + dash);
  } else if (variant === 'payout_approved') {
    lines.push('Ödeme bilgileriniz (IBAN / vergi) onaylandı.');
    lines.push('Panel: ' + site + '/influencer/dashboard');
  }
  lines.push('');
  lines.push(security);
  lines.push('— INFUHUB · ' + site);

  return { subject, text: lines.join('\n'), html };
}

module.exports = { accountStatusEmailTemplate };
