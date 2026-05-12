import type { FirebaseCampaign } from '@/services/firebaseCampaignService';
import type { FirebaseOffer } from '@/services/firebaseOfferService';

/** Tek bir teslim kalemi (kampanya contentLines ile eşleşir) */
export interface OfferDeliverySlotPlan {
  lineId: string;
  /** UI etiketi */
  label: string;
  /** Paylaşım linki isteniyor (işbirliği) */
  needsShareLink: boolean;
}

function endOfLocalDayDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Kampanya tanımından teslim gereksinimleri (boşsa eski tek link modu). */
export function buildDeliverySlotsFromCampaign(campaign: FirebaseCampaign | null): OfferDeliverySlotPlan[] {
  const lines = campaign?.contentLines;
  if (!Array.isArray(lines) || lines.length === 0) return [];

  const out: OfferDeliverySlotPlan[] = [];
  for (const line of lines) {
    if (!line?.id) continue;
    if (line.kind === 'ugc') {
      out.push({
        lineId: line.id,
        label: `${line.aspectRatio} • ${line.durationSec} sn içerik`,
        needsShareLink: false,
      });
    } else if (line.kind === 'collab') {
      out.push({
        lineId: line.id,
        label: `${line.platform?.toUpperCase() || ''} • ${line.contentFormat} (işbirliği)`,
        needsShareLink: true,
      });
    }
  }
  return out;
}

/** Yapılandırılmış teslim gerektiren kampanya mı */
export function campaignRequiresStructuredDelivery(campaign: FirebaseCampaign | null): boolean {
  return buildDeliverySlotsFromCampaign(campaign).length > 0;
}

export function isCollaborationCampaign(campaign: FirebaseCampaign | null): boolean {
  return campaign?.campaignModel === 'collaboration';
}

export function isOfferRawContentCompleteForCampaign(
  offer: FirebaseOffer,
  campaign: FirebaseCampaign | null
): boolean {
  const slots = buildDeliverySlotsFromCampaign(campaign);
  if (slots.length === 0) {
    return Boolean(offer.contentLink?.trim());
  }

  const d = offer.contentDeliveries ?? {};
  for (const s of slots) {
    const row = d[s.lineId];
    const urlOk = typeof row?.contentUrl === 'string' && row.contentUrl.trim().length > 0;
    if (!urlOk) return false;
  }
  return true;
}

export function isOfferShareLinkCompleteForCampaign(
  offer: FirebaseOffer,
  campaign: FirebaseCampaign | null
): boolean {
  const slots = buildDeliverySlotsFromCampaign(campaign);
  if (slots.length === 0) return Boolean(offer.contentLink?.trim());

  const d = offer.contentDeliveries ?? {};
  for (const s of slots) {
    if (!s.needsShareLink) continue;
    const lk = typeof d[s.lineId]?.shareLink === 'string' && d[s.lineId].shareLink.trim().length > 0;
    if (!lk) return false;
  }
  return true;
}

/** Tüm zorunlu alanlar doldu mu (onay içeriği öncesi). */
export function isOfferContentDeliveryCompleteForCampaign(
  offer: FirebaseOffer,
  campaign: FirebaseCampaign | null
): boolean {
  const slots = buildDeliverySlotsFromCampaign(campaign);
  if (slots.length === 0) {
    return Boolean(offer.contentLink?.trim());
  }

  const d = offer.contentDeliveries ?? {};
  for (const s of slots) {
    const row = d[s.lineId];
    const urlOk = typeof row?.contentUrl === 'string' && row.contentUrl.trim().length > 0;
    if (!urlOk) return false;
    if (s.needsShareLink) {
      const lk = typeof row?.shareLink === 'string' && row.shareLink.trim().length > 0;
      if (!lk) return false;
    }
  }
  return true;
}

/**
 * Son yayın tarihinin (gün sonu UTC’ye yakın ISO gün tarihi için) dolup dolmadığı.
 * Kampanya yayın/kampanya tarihi yoksa false (otomatik iade tetiklenmez).
 */
export function isPublishWindowEnded(campaign: FirebaseCampaign | null): boolean {
  if (!campaign) return false;
  const endStr = campaign.publishWindow?.end || campaign.duration?.end;
  if (!endStr?.trim()) return false;
  const endEod = endOfLocalDayDate(endStr);
  if (!endEod) return false;
  return Date.now() > endEod.getTime();
}

/**
 * Son yayın tarihinden sonra içerik onayı yoksa tutar markaya iade edilmelidir.
 * Eski kayıtlar: `paymentHoldStatus` olmayabilir — bütçe kesilmiş ve onaysız ise askıdadır kabul edilir.
 */
export function shouldRefundEscrowForOffer(offer: FirebaseOffer, campaign: FirebaseCampaign | null): boolean {
  if (offer.status !== 'kabul') return false;
  if (!offer.budgetDeductedAt) return false;
  if (offer.paymentHoldStatus === 'refunded' || offer.paymentHoldStatus === 'released') return false;
  if (offer.contentApproved === true) return false;
  if (!isPublishWindowEnded(campaign)) return false;
  return true;
}

/** Tek dosya geriye uyumluluğu için önce `contentLink`, sonra çoklu teslimden ilk içerik URL’si */
export function resolvePrimaryOfferContentUrl(offer: FirebaseOffer): string | undefined {
  const direct = offer.contentLink?.trim();
  if (direct) return direct;
  const d = offer.contentDeliveries;
  if (!d || typeof d !== 'object') return undefined;
  for (const row of Object.values(d)) {
    const u = typeof row?.contentUrl === 'string' ? row.contentUrl.trim() : '';
    if (u.length > 0) return u;
  }
  return undefined;
}

export type OfferContentMediaItem = { url: string; label: string; shareLink?: string };

/** Kampanya satırlarına göre sıralı tüm teslim dosyaları (marka önizleme / çoklu video). */
export function listOfferContentMediaItems(
  offer: FirebaseOffer,
  campaign: FirebaseCampaign | null
): OfferContentMediaItem[] {
  const slots = buildDeliverySlotsFromCampaign(campaign);
  const d = offer.contentDeliveries ?? {};
  if (slots.length > 0) {
    const out: OfferContentMediaItem[] = [];
    for (const s of slots) {
      const u = typeof d[s.lineId]?.contentUrl === 'string' ? d[s.lineId].contentUrl.trim() : '';
      if (u.length > 0) {
        const shareLink = typeof d[s.lineId]?.shareLink === 'string' ? d[s.lineId].shareLink.trim() : '';
        out.push({ url: u, label: s.label, ...(shareLink ? { shareLink } : {}) });
      }
    }
    return out;
  }
  const u = resolvePrimaryOfferContentUrl(offer);
  return u ? [{ url: u, label: 'İçerik' }] : [];
}
