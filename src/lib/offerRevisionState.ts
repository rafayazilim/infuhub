import type { FirebaseOffer } from '@/services/firebaseOfferService';

/** İçerik URL’lerinden tekil parmak izi — marka tek seferlik önizleme ve yeni yükleme sıfırlama için. */
export function computeOfferContentFingerprint(offer: Pick<FirebaseOffer, 'contentLink' | 'contentDeliveries'>): string {
  const parts: string[] = [];
  if (offer.contentLink?.trim()) {
    parts.push(`c:${offer.contentLink.trim()}`);
  }
  const d = offer.contentDeliveries ?? {};
  for (const lineId of Object.keys(d).sort()) {
    const row = d[lineId];
    const u = typeof row?.contentUrl === 'string' ? row.contentUrl.trim() : '';
    if (u) parts.push(`${lineId}:${u}`);
  }
  return parts.join('|');
}

/** Mevcut içerik kümesi için marka önizlemesi tüketilmiş mi */
export function isBrandContentPreviewConsumed(offer: FirebaseOffer): boolean {
  const fp = computeOfferContentFingerprint(offer);
  if (!fp.trim()) return false;
  const cp = offer.contentPreview;
  if (!cp) return false;
  if (cp.fingerprint !== fp) return false;
  return cp.consumed === true;
}

/**
 * Influencer teslim zamanı için tek kaynak kümesi.
 * `offer.updatedAt` KULLANILMAZ — markanın revizyon notu yazması veya başka alan güncellenmesi
 * bu tarihi ileri atarak "revizyon cevapsız" mantığını bozabilirdi (ikinci+ revizyon hatası).
 */
function effectiveLastContentDeliveryMs(offer: FirebaseOffer): number {
  let best = 0;
  const direct = offer.lastContentDeliveryAt;
  if (direct) {
    const t = new Date(direct).getTime();
    if (Number.isFinite(t)) best = Math.max(best, t);
  }
  const rows = Object.values(offer.contentDeliveries ?? {});
  for (const row of rows) {
    const raw = typeof row.updatedAt === 'string' ? row.updatedAt.trim() : '';
    if (!raw) continue;
    const ms = new Date(raw).getTime();
    if (Number.isFinite(ms)) best = Math.max(best, ms);
  }
  return best;
}

/** Son revizyon talebinden sonra influencer yeni yükleme yapmadıysa true (aktif “revizyon bekleniyor”) */
export function isRevisionResponsePending(offer: FirebaseOffer): boolean {
  const revs = offer.revisions;
  if (!revs || typeof revs !== 'object') return false;
  const times = Object.values(revs)
    .map((r) => new Date(r.createdAt).getTime())
    .filter(Number.isFinite);
  if (times.length === 0) return false;
  const latestRevision = Math.max(...times);
  return latestRevision > effectiveLastContentDeliveryMs(offer);
}

export function listRevisionsNewestFirst(
  offer: FirebaseOffer
): Array<{ id: string; note: string; createdAt: string }> {
  const raw = offer.revisions;
  if (!raw || typeof raw !== 'object') return [];
  const rows = Object.entries(raw).map(([id, r]) => ({
    id,
    note: typeof r?.note === 'string' ? r.note : '',
    createdAt: typeof r?.createdAt === 'string' ? r.createdAt : '',
  }));
  return rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
