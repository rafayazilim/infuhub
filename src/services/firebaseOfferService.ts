import { ref, set, get, update, push } from 'firebase/database';
import { auth, database } from '@/config/firebase';
import { getFirebaseErrorMessage } from '@/lib/firebaseErrorMessages';
import {
  isCollaborationCampaign,
  isOfferContentDeliveryCompleteForCampaign,
  isOfferRawContentCompleteForCampaign,
} from '@/lib/offerContentCompleteness';
import { computeOfferContentFingerprint, isRevisionResponsePending } from '@/lib/offerRevisionState';
import { sendOfferSystemMessage } from '@/services/firebaseMessagingService';
import { getCampaignById } from '@/services/firebaseCampaignService';
import {
  assertBrandWalletCovers,
  deductBudgetFromBrandWallet,
  enqueuePendingBrandWalletDebit,
  enqueuePendingBrandToInfluencerPayoutFromApproval,
} from '@/services/firebaseBrandWalletService';

export interface FirebaseOffer {
  id: string;
  campaignId: string;
  brandId: string;
  influencerId: string;
  price: number;
  message?: string;
  contentLink?: string;
  contentApproved?: boolean;
  contentApprovedAt?: string;
  /** İşbirliği: ham video/görsel marka tarafından onaylandı; final ödeme paylaşım linki onayında açılır. */
  contentMediaApproved?: boolean;
  contentMediaApprovedAt?: string;
  contentRejectedAt?: string;
  contentRejectionReason?: string;
  /** Markanın bütçe kesildiğinde oluşur; içerik onayına kadar influencer çekemez. */
  paymentHoldStatus?: 'active' | 'released' | 'refunded';
  paymentEscrowRefundedAt?: string;
  /**
   * Kampanya contentLines ile eşleşen çoklu teslim (`lineId` = contentLines[].id).
   * Eski tek alan `contentLink` geriye uyumluluk için korunur.
   */
  contentDeliveries?: Record<
    string,
    {
      contentUrl?: string;
      shareLink?: string;
      updatedAt?: string;
    }
  >;
  /**
   * Marka: içerik onaysız parmak izi başına tek önizleme (`consumed`).
   * Influencer yeni dosya yüklayınca fingerprint sıfırlanır.
   */
  contentPreview?: { fingerprint: string; consumed: boolean };
  /** Influencer son içerik yüklemesi — aktif revizyon talebine yanıt gecikmesi için */
  lastContentDeliveryAt?: string;
  revisions?: Record<string, { note: string; createdAt: string }>;
  negotiationHistory?: Record<
    string,
    {
      actor: 'brand' | 'influencer';
      price: number;
      message?: string;
      createdAt: string;
      type: 'initial' | 'counter' | 'revision';
    }
  >;
  sourceType?: 'brand' | 'influencer';
  destinationType?: 'brand' | 'influencer';
  offerKind?: 'direct' | 'incoming_campaign' | 'counter_offer';
  parentOfferId?: string;
  status: 'beklemede' | 'kabul' | 'red';
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
  budgetDeductedAt?: string;
  budgetDeductedAmount?: number;
}

const DAILY_INFLUENCER_CAMPAIGN_OFFER_LIMIT = 3;

export type NegotiationHistoryEntry = {
  actor: 'brand' | 'influencer';
  price: number;
  message?: string;
  createdAt: string;
  type: 'initial' | 'counter' | 'revision';
};

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function assertInfluencerDailyCampaignOfferLimit(influencerId: string): Promise<void> {
  const snapshot = await get(ref(database, 'offers'));
  if (!snapshot.exists()) return;

  const today = new Date();
  const campaignIds = new Set<string>();
  const offers = Object.values(snapshot.val() || {}) as FirebaseOffer[];

  for (const offer of offers) {
    if (!offer || offer.influencerId !== influencerId) continue;
    if (offer.offerKind !== 'incoming_campaign' || offer.sourceType !== 'influencer') continue;
    if (!offer.campaignId || !offer.createdAt) continue;

    const createdAt = new Date(offer.createdAt);
    if (!Number.isFinite(createdAt.getTime())) continue;
    if (isSameLocalCalendarDay(createdAt, today)) {
      campaignIds.add(offer.campaignId);
    }
  }

  if (campaignIds.size >= DAILY_INFLUENCER_CAMPAIGN_OFFER_LIMIT) {
    throw new Error(
      `Bir influencer bir gün içinde en fazla ${DAILY_INFLUENCER_CAMPAIGN_OFFER_LIMIT} kampanyaya teklif verebilir.`
    );
  }
}

/**
 * Kart / özet: marka veya son hamleden sonra `offers/{id}.price` eski kalabilir (ör. kökte güncellenen tutar
 * pazarlık geçmişinde). Görünen tutar: geçmişte varsa en son adım, yoksa teklif kaydı.
 */
export function getLatestThreadDisplay(
  offer: FirebaseOffer,
  negotiationHistory: NegotiationHistoryEntry[]
): { displayPrice: number; displayMessage?: string } {
  if (negotiationHistory.length > 0) {
    const last = negotiationHistory[negotiationHistory.length - 1];
    const lastMsg = last.message?.trim();
    return {
      displayPrice: last.price,
      displayMessage: lastMsg || offer.message,
    };
  }
  return { displayPrice: offer.price, displayMessage: offer.message };
}

/**
 * Kampanyada "anlaşma tamam" sayılır mı? (Kabul edilen influencer listesi, özetler.)
 * - `counter_offer` + kabul: marka karşı teklif verdiğinde eski satır kapatılır; gerçek kabul değildir.
 * - Giden marka teklifi kabulü veya (katılım) influencer teklifinin marka tarafından kabulü.
 */
export function isGenuineInfluencerCampaignAcceptance(offer: FirebaseOffer): boolean {
  if (offer.status !== 'kabul' || !offer.influencerId) return false;
  if (offer.offerKind === 'counter_offer') return false;
  if (offer.sourceType === 'brand' && offer.destinationType === 'influencer') return true;
  if (offer.offerKind === 'incoming_campaign' && offer.sourceType === 'influencer') return true;
  return false;
}

/** Influencer: kabul edilmiş *anlaşma* adedi (karşı teklif işlem satırlarını saymaz). */
export function countGenuineAcceptedInfluencerOffers(offers: FirebaseOffer[]): number {
  return offers.filter((o) => isGenuineInfluencerCampaignAcceptance(o)).length;
}

/** Pazarlık kökü: marka-influencer katılım (incoming_campaign) teklifi. */
export function getIncomingParticipationRoot(
  offer: FirebaseOffer,
  offerMap: Record<string, FirebaseOffer>
): FirebaseOffer | null {
  const visited = new Set<string>();
  let current: FirebaseOffer | null = offer;
  if (current.offerKind === 'incoming_campaign' && current.sourceType === 'influencer') {
    return current;
  }
  while (current?.parentOfferId && !visited.has(current.parentOfferId)) {
    visited.add(current.parentOfferId);
    const next = offerMap[current.parentOfferId];
    if (!next) break;
    if (next.offerKind === 'incoming_campaign' && next.sourceType === 'influencer') {
      return next;
    }
    current = next;
  }
  return null;
}

/** Pazarlık / teklif hattı tamamlanmış mı? (Kök katılım kabul veya yalnız giden marka teklifinin kabulü.) */
export function isParticipationThreadFullyAccepted(
  offer: FirebaseOffer,
  offerMap: Record<string, FirebaseOffer>
): boolean {
  const root = getIncomingParticipationRoot(offer, offerMap);
  if (root != null) {
    return isGenuineInfluencerCampaignAcceptance(root);
  }
  if (isGenuineInfluencerCampaignAcceptance(offer)) {
    return true;
  }
  return false;
}

/** Gelen teklif kartı için pazarlık geçmişi: counter_offer zincirinde kök marka teklifindeki history kullanılır. */
export function resolveIncomingOfferNegotiationHistory(
  offer: FirebaseOffer,
  offerMap: Record<string, FirebaseOffer>
): NegotiationHistoryEntry[] {
  let root: FirebaseOffer | undefined = offer;
  const visited = new Set<string>();
  while (root?.parentOfferId && !visited.has(root.parentOfferId)) {
    visited.add(root.parentOfferId);
    const parent = offerMap[root.parentOfferId];
    if (!parent) break;
    if (parent.sourceType === 'brand' && parent.destinationType === 'influencer') {
      root = parent;
      break;
    }
    root = parent;
  }
  const hist = root?.negotiationHistory
    ? (Object.values(root.negotiationHistory) as NegotiationHistoryEntry[])
    : [];
  return hist.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

/** Markanın influencera gönderdiği doğrudan teklif (kampanya dışı karşı teklif zinciri kökü). */
export function isBrandToInfluencerDirectOffer(offer: FirebaseOffer): boolean {
  return (
    offer.sourceType === 'brand' &&
    offer.destinationType === 'influencer' &&
    (offer.offerKind === 'direct' || offer.offerKind === undefined)
  );
}

/** Son hamle markadan geldiyse ve teklif hâlâ beklemedeyse influencer yanıtı bekleniyordur. */
export function isAwaitingInfluencerAfterBrandNegotiation(
  offer: FirebaseOffer,
  offerMap: Record<string, FirebaseOffer>
): boolean {
  if (offer.status !== 'beklemede') return false;
  const h = resolveIncomingOfferNegotiationHistory(offer, offerMap);
  if (!h.length) return false;
  return h[h.length - 1].actor === 'brand';
}

/** Katılım teklifinde son pazarlık adımı influencer ise marka yanıtı bekleniyordur (ayrı counter satırı olmadan da geçerli). */
export function isAwaitingBrandResponseAfterInfluencerNegotiation(offer: FirebaseOffer): boolean {
  if (offer.status !== 'beklemede') return false;
  if (offer.offerKind !== 'incoming_campaign' || offer.sourceType !== 'influencer') return false;
  const h = offer.negotiationHistory
    ? (Object.values(offer.negotiationHistory) as NegotiationHistoryEntry[]).sort((a, b) =>
        (a.createdAt || '').localeCompare(b.createdAt || '')
      )
    : [];
  const last = h[h.length - 1];
  return last?.actor === 'influencer';
}

/**
 * Influencer tekliflerinde: marka cevabı / hamlesi gelene kadar kabul, red, karşı teklif kapatılır.
 * - **Katılım (ilk başvuru):** `negotiationHistory` yok; marka henüz incelemedi / yanıt vermedi → kilit.
 * - **Katılım / marka teklifi:** pazarlık geçmişinde son adım `influencer` → marka turunda kilit.
 * - **Ayrı** `counter_offer` satırı (marka cevabı beklenen child) → kilit.
 */
export function influencerOfferActionsLockedAwaitingBrand(
  offer: FirebaseOffer,
  allOffers: FirebaseOffer[]
): boolean {
  if (offer.status !== 'beklemede') return false;
  if (offer.offerKind === 'counter_offer') return false;

  const offerMap: Record<string, FirebaseOffer> = {};
  for (const o of allOffers) {
    if (o?.id) offerMap[o.id] = o;
  }
  const canonical = offerMap[offer.id] ?? offer;
  if (canonical.status !== 'beklemede') return false;

  const hasPendingInfluencerCounterRow = allOffers.some(
    (o) =>
      o.offerKind === 'counter_offer' &&
      o.status === 'beklemede' &&
      o.parentOfferId === offer.id
  );
  if (hasPendingInfluencerCounterRow) return true;

  const h = resolveIncomingOfferNegotiationHistory(canonical, offerMap);
  if (h.length === 0) {
    // Kendi verdiğiniz katılım başvurusu: marka hiç pazarlık adımı atmadan influencer işlem yapamaz
    if (canonical.offerKind === 'incoming_campaign' && canonical.sourceType === 'influencer') {
      return true;
    }
    return false;
  }
  const last = h[h.length - 1];
  return last?.actor === 'influencer';
}

/**
 * Influencer karşı tekliflerini (counter_offer) üst teklifte tek kartta göstermek için birleştirir:
 * - Katılım (incoming_campaign) + markadan gelen doğrudan teklif (direct).
 * En güncel fiyat/mesaj (updatedAt) üst kayda yansıtılır; counter satırı listeden çıkarılır.
 */
export function collapseIncomingParticipationThreadsForDisplay(offers: FirebaseOffer[]): FirebaseOffer[] {
  if (!offers.length) return offers;

  const countersByParent = new Map<string, FirebaseOffer[]>();
  for (const o of offers) {
    if (o.offerKind === 'counter_offer' && o.sourceType === 'influencer' && o.parentOfferId) {
      const list = countersByParent.get(o.parentOfferId) ?? [];
      list.push(o);
      countersByParent.set(o.parentOfferId, list);
    }
  }

  const shouldMergeCountersIntoParent = (parent: FirebaseOffer): boolean => {
    const participation =
      parent.offerKind === 'incoming_campaign' && parent.sourceType === 'influencer';
    const brandDirect =
      parent.sourceType === 'brand' &&
      parent.destinationType === 'influencer' &&
      (parent.offerKind === 'direct' || parent.offerKind === undefined);
    return participation || brandDirect;
  };

  const hiddenIds = new Set<string>();
  countersByParent.forEach((counters, parentId) => {
    const parent = offers.find((x) => x.id === parentId);
    if (!parent || !shouldMergeCountersIntoParent(parent)) return;
    for (const c of counters) {
      hiddenIds.add(c.id);
    }
  });

  const result: FirebaseOffer[] = [];
  for (const o of offers) {
    if (hiddenIds.has(o.id)) continue;

    const counters = countersByParent.get(o.id);
    if (counters?.length && shouldMergeCountersIntoParent(o)) {
      const latest = [o, ...counters].reduce((best, cur) =>
        new Date(cur.updatedAt).getTime() > new Date(best.updatedAt).getTime() ? cur : best
      );
      if (latest.id !== o.id) {
        result.push({
          ...o,
          price: latest.price,
          message: latest.message ?? o.message,
          updatedAt: latest.updatedAt,
        });
        continue;
      }
    }

    result.push(o);
  }

  return result;
}

export interface CreateOfferData {
  campaignId: string;
  brandId: string;
  influencerId: string;
  price: number;
  message?: string;
}

export interface CreateIncomingCampaignOfferData {
  campaignId: string;
  brandId: string;
  influencerId: string;
  price: number;
  message?: string;
}

export interface CreateCounterOfferData {
  campaignId: string;
  brandId: string;
  influencerId: string;
  parentOfferId: string;
  price: number;
  message?: string;
}

export interface CreateBrandCounterOfferData {
  campaignId: string;
  brandId: string;
  influencerId: string;
  parentOfferId: string;
  price: number;
  message?: string;
}

type OfferAcceptBudgetMeta = {
  budgetDeductedAt: string;
  budgetDeductedAmount: number;
  paymentHoldStatus: 'active';
};

/**
 * Teklif kabulünde marka cüzdanından kesinti. Teklif kaydına yazma çağıran tarafta kabul güncellemesiyle birlikte yapılmalı
 * (aksi halde kesinti yapılıp kabul yazılamazsa ikinci denemede kesinti atlanıyordu).
 */
const maybeDeductBrandWalletForOfferAccept = async (input: {
  actingOffer: FirebaseOffer;
  amount: number;
  targetOfferId: string;
  campaignId: string;
  /** influencerRespondToIncomingCampaignParticipationOffer */
  actorInfluencerIncomingKabul: boolean;
}): Promise<OfferAcceptBudgetMeta | null> => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) {
    throw new Error('Oturum gerekli');
  }

  const asBrand = currentUserId === input.actingOffer.brandId;
  const asInfluencerIncomingKabul =
    input.actorInfluencerIncomingKabul &&
    currentUserId === input.actingOffer.influencerId &&
    input.actingOffer.offerKind === 'incoming_campaign' &&
    input.actingOffer.sourceType === 'influencer';
  const asInfluencerAcceptingBrandDirect =
    currentUserId === input.actingOffer.influencerId &&
    input.actingOffer.sourceType === 'brand' &&
    input.actingOffer.destinationType === 'influencer' &&
    (input.actingOffer.offerKind === 'direct' || input.actingOffer.offerKind === undefined);

  if (!asBrand && !asInfluencerIncomingKabul && !asInfluencerAcceptingBrandDirect) {
    return null;
  }

  const targetSnap = await get(ref(database, `offers/${input.targetOfferId}`));
  if (!targetSnap.exists()) {
    throw new Error('Teklif bulunamadi');
  }
  const targetRow = targetSnap.val() as FirebaseOffer;

  if (targetRow.budgetDeductedAt) {
    if (targetRow.status === 'kabul') {
      return null;
    }
    throw new Error(
      'Odeme kaydi ile teklif durumu uyusmuyor. Sayfayi yenileyip tekrar deneyin veya destek ile gorusun.'
    );
  }

  const normalizedAmount = Math.round(Number(input.amount) || 0);
  if (normalizedAmount <= 0) {
    throw new Error('Gecersiz teklif tutari');
  }

  await assertBrandWalletCovers(input.actingOffer.brandId, normalizedAmount);

  if (asInfluencerIncomingKabul || asInfluencerAcceptingBrandDirect) {
    await enqueuePendingBrandWalletDebit({
      brandId: input.actingOffer.brandId,
      offerId: input.targetOfferId,
      influencerId: input.actingOffer.influencerId,
      amount: normalizedAmount,
      campaignId: input.campaignId,
    });
    return null;
  }

  const now = new Date().toISOString();
  await deductBudgetFromBrandWallet({
    brandId: input.actingOffer.brandId,
    amount: normalizedAmount,
    campaignId: input.campaignId,
    influencerId: input.actingOffer.influencerId,
    offerId: input.targetOfferId,
    note: 'Teklif kabulu sonrasi odeme ayrildi',
  });

  return {
    budgetDeductedAt: now,
    budgetDeductedAmount: normalizedAmount,
    paymentHoldStatus: 'active',
  };
};

// Teklif olustur (marka -> influencer)
export async function createOffer(offerData: CreateOfferData): Promise<FirebaseOffer> {
  try {
    const roundedPrice = Math.round(Number(offerData.price) || 0);
    if (roundedPrice <= 0) {
      throw new Error('Teklif tutari 0\'dan buyuk olmali');
    }
    await assertBrandWalletCovers(offerData.brandId, roundedPrice);

    const offersRef = ref(database, 'offers');
    const newOfferRef = push(offersRef);
    const now = new Date().toISOString();

    const newOffer: FirebaseOffer = {
      id: newOfferRef.key!,
      ...offerData,
      price: roundedPrice,
      message: offerData.message?.trim() ?? '',
      sourceType: 'brand',
      destinationType: 'influencer',
      offerKind: 'direct',
      status: 'beklemede',
      createdAt: now,
      updatedAt: now,
    };

    await set(newOfferRef, newOffer);
    await set(push(ref(database, `offers/${newOffer.id}/negotiationHistory`)), {
      actor: 'brand',
      price: newOffer.price,
      message: newOffer.message || '',
      createdAt: now,
      type: 'initial',
    });
    await sendOfferSystemMessage({
      eventType: 'brand_offer_created',
      brandId: newOffer.brandId,
      influencerId: newOffer.influencerId,
      campaignId: newOffer.campaignId,
      offerId: newOffer.id,
      rootOfferId: newOffer.id,
      price: newOffer.price,
    });
    return newOffer;
  } catch (error: any) {
    console.error('Teklif olusturma hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Teklif oluşturulurken bir hata oluştu.'));
  }
}

// Influencer'in kampanyaya katilim teklifi olustur (influencer -> brand)
export async function createIncomingCampaignOffer(
  offerData: CreateIncomingCampaignOfferData
): Promise<FirebaseOffer> {
  try {
    const parsedPrice = Number(offerData.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      throw new Error('Teklif tutari 0\'dan buyuk olmali');
    }

    await assertInfluencerDailyCampaignOfferLimit(offerData.influencerId);

    // Ayni influencer bu kampanyaya bir kez teklif verebilir
    const incomingOffersRef = ref(
      database,
      `brands/${offerData.brandId}/campaigns/${offerData.campaignId}/incomingOffers`
    );
    const incomingSnapshot = await get(incomingOffersRef);

    if (incomingSnapshot.exists()) {
      const incomingOffers = Object.values(incomingSnapshot.val()) as FirebaseOffer[];
      const exists = incomingOffers.some((offer) => offer.influencerId === offerData.influencerId);
      if (exists) {
        throw new Error('Bu kampanyaya zaten teklif verdiniz');
      }
    }

    const campaignOffers = await getOffersByCampaign(offerData.campaignId);
    const hasBrandOfferToInfluencer = campaignOffers.some(
      (o) =>
        o.influencerId === offerData.influencerId &&
        o.brandId === offerData.brandId &&
        o.sourceType === 'brand' &&
        o.destinationType === 'influencer' &&
        o.status !== 'red'
    );
    if (hasBrandOfferToInfluencer) {
      throw new Error(
        'Bu kampanya icin markadan teklifiniz var; katilim teklifi gonderemezsiniz. Teklifler ekranindan yanit verin.'
      );
    }

    // Tek bir ID ile hem kampanya cluster'ina hem global offers'a yaz
    const offerId = push(ref(database, 'offers')).key!;
    const now = new Date().toISOString();
    const newOffer: FirebaseOffer = {
      id: offerId,
      campaignId: offerData.campaignId,
      brandId: offerData.brandId,
      influencerId: offerData.influencerId,
      price: parsedPrice,
      message: offerData.message?.trim() ?? '',
      sourceType: 'influencer',
      destinationType: 'brand',
      offerKind: 'incoming_campaign',
      status: 'beklemede',
      createdAt: now,
      updatedAt: now,
    };

    await Promise.all([
      set(
        ref(
          database,
          `brands/${offerData.brandId}/campaigns/${offerData.campaignId}/incomingOffers/${offerId}`
        ),
        newOffer
      ),
      set(ref(database, `offers/${offerId}`), newOffer),
    ]);

    await sendOfferSystemMessage({
      eventType: 'incoming_offer_created',
      brandId: newOffer.brandId,
      influencerId: newOffer.influencerId,
      campaignId: newOffer.campaignId,
      offerId: newOffer.id,
      rootOfferId: newOffer.id,
      price: newOffer.price,
    });

    return newOffer;
  } catch (error: any) {
    console.error('Kampanyaya katilim teklifi olusturma hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Teklif oluşturulurken bir hata oluştu.'));
  }
}

// Influencer'in markadan gelen teklife karsi teklifi (influencer -> brand)
export async function createCounterOffer(
  offerData: CreateCounterOfferData
): Promise<FirebaseOffer> {
  try {
    const parsedPrice = Number(offerData.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      throw new Error('Teklif tutari 0\'dan buyuk olmali');
    }

    const parentSnapshot = await get(ref(database, `offers/${offerData.parentOfferId}`));
    if (!parentSnapshot.exists()) {
      throw new Error('Ana teklif bulunamadi');
    }

    const parentOffer = parentSnapshot.val() as FirebaseOffer;
    if (parentOffer.influencerId !== offerData.influencerId || parentOffer.brandId !== offerData.brandId) {
      throw new Error('Bu teklif icin karsi teklif gonderilemez');
    }
    if (parentOffer.campaignId !== offerData.campaignId) {
      throw new Error('Bu teklif icin karsi teklif gonderilemez');
    }

    const now = new Date().toISOString();

    // Kampanyaya katilim: ayri counter_offer karti olusturma; ayni kaydi guncelle, gecmis negotiationHistory'de.
    if (parentOffer.offerKind === 'incoming_campaign') {
      if (parentOffer.sourceType !== 'influencer' || parentOffer.destinationType !== 'brand') {
        throw new Error('Bu teklif icin karsi teklif gonderilemez');
      }
      if (parentOffer.status !== 'beklemede') {
        throw new Error('Yalnizca beklemedeki teklifler icin karsi teklif gonderilebilir');
      }
      const trimmedMsg = offerData.message?.trim();
      const message = trimmedMsg !== undefined ? trimmedMsg : parentOffer.message || '';
      const updates: Record<string, unknown> = {
        price: parsedPrice,
        message,
        updatedAt: now,
      };

      await Promise.all([
        set(push(ref(database, `offers/${parentOffer.id}/negotiationHistory`)), {
          actor: 'influencer',
          price: parsedPrice,
          message,
          createdAt: now,
          type: 'counter',
        }),
        update(ref(database, `offers/${parentOffer.id}`), updates),
        update(
          ref(
            database,
            `brands/${offerData.brandId}/campaigns/${offerData.campaignId}/incomingOffers/${parentOffer.id}`
          ),
          updates
        ),
      ]);

      await sendOfferSystemMessage({
        eventType: 'influencer_counter_created',
        brandId: parentOffer.brandId,
        influencerId: parentOffer.influencerId,
        campaignId: parentOffer.campaignId,
        offerId: parentOffer.id,
        rootOfferId: parentOffer.id,
        price: parsedPrice,
      });

      return {
        ...parentOffer,
        ...updates,
        message: message || '',
      } as FirebaseOffer;
    }

    if (parentOffer.status !== 'beklemede') {
      throw new Error('Yalnizca beklemedeki teklifler icin karsi teklif gonderilebilir');
    }

    const offerId = push(ref(database, 'offers')).key!;
    const newOffer: FirebaseOffer = {
      id: offerId,
      campaignId: offerData.campaignId,
      brandId: offerData.brandId,
      influencerId: offerData.influencerId,
      parentOfferId: offerData.parentOfferId,
      price: parsedPrice,
      message: offerData.message?.trim() || undefined,
      sourceType: 'influencer',
      destinationType: 'brand',
      offerKind: 'counter_offer',
      status: 'beklemede',
      createdAt: now,
      updatedAt: now,
    };

    await Promise.all([
      set(
        ref(
          database,
          `brands/${offerData.brandId}/campaigns/${offerData.campaignId}/incomingOffers/${offerId}`
        ),
        newOffer
      ),
      set(ref(database, `offers/${offerId}`), newOffer),
      set(push(ref(database, `offers/${offerData.parentOfferId}/negotiationHistory`)), {
        actor: 'influencer',
        price: parsedPrice,
        message: newOffer.message || '',
        createdAt: now,
        type: 'counter',
      }),
    ]);

    await sendOfferSystemMessage({
      eventType: 'influencer_counter_created',
      brandId: newOffer.brandId,
      influencerId: newOffer.influencerId,
      campaignId: newOffer.campaignId,
      offerId: newOffer.id,
      rootOfferId: offerData.parentOfferId,
      price: newOffer.price,
    });

    return newOffer;
  } catch (error: any) {
    console.error('Karsi teklif olusturma hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Karşı teklif oluşturulurken bir hata oluştu.'));
  }
}

// Markanin influencer teklifine/karÅŸÄ± teklifine cevaben karsi teklifi (brand -> influencer)
export async function createBrandCounterOffer(
  offerData: CreateBrandCounterOfferData
): Promise<FirebaseOffer> {
  try {
    const parsedPrice = Number(offerData.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      throw new Error('Teklif tutari 0\'dan buyuk olmali');
    }

    const parentSnapshot = await get(ref(database, `offers/${offerData.parentOfferId}`));
    if (!parentSnapshot.exists()) {
      throw new Error('Ana teklif bulunamadi');
    }

    const parentOffer = parentSnapshot.val() as FirebaseOffer;
    if (
      parentOffer.influencerId !== offerData.influencerId ||
      parentOffer.brandId !== offerData.brandId ||
      parentOffer.campaignId !== offerData.campaignId
    ) {
      throw new Error('Bu teklif icin karsi teklif gonderilemez');
    }

    await assertBrandWalletCovers(offerData.brandId, Math.round(parsedPrice));

    const now = new Date().toISOString();
    const offerId = push(ref(database, 'offers')).key!;
    const newOffer: FirebaseOffer = {
      id: offerId,
      campaignId: offerData.campaignId,
      brandId: offerData.brandId,
      influencerId: offerData.influencerId,
      parentOfferId: offerData.parentOfferId,
      price: parsedPrice,
      message: offerData.message?.trim() ?? '',
      sourceType: 'brand',
      destinationType: 'influencer',
      offerKind: 'counter_offer',
      status: 'beklemede',
      createdAt: now,
      updatedAt: now,
    };

    await set(ref(database, `offers/${offerId}`), newOffer);
    await sendOfferSystemMessage({
      eventType: 'brand_counter_sent',
      brandId: newOffer.brandId,
      influencerId: newOffer.influencerId,
      campaignId: newOffer.campaignId,
      offerId: newOffer.id,
      rootOfferId: offerData.parentOfferId,
      price: newOffer.price,
    });
    return newOffer;
  } catch (error: any) {
    console.error('Marka karsi teklif olusturma hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Karşı teklif oluşturulurken bir hata oluştu.'));
  }
}

export interface ResolveCounterOfferData {
  brandId: string;
  campaignId: string;
  counterOfferId: string;
  price: number;
  message?: string;
}

// Marka, influencer karsi teklifine cevap verirken yeni offer acmak yerine ana teklifi gunceller.
export async function resolveIncomingCounterOfferWithBrandRevision(
  data: ResolveCounterOfferData
): Promise<void> {
  try {
    const parsedPrice = Number(data.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      throw new Error('Teklif tutari 0\'dan buyuk olmali');
    }

    const counterSnapshot = await get(ref(database, `offers/${data.counterOfferId}`));
    if (!counterSnapshot.exists()) {
      throw new Error('Karsi teklif bulunamadi');
    }

    const counterOffer = counterSnapshot.val() as FirebaseOffer;
    if (
      counterOffer.offerKind !== 'counter_offer' ||
      counterOffer.sourceType !== 'influencer' ||
      counterOffer.brandId !== data.brandId ||
      counterOffer.campaignId !== data.campaignId
    ) {
      throw new Error('Gecersiz karsi teklif');
    }
    if (counterOffer.status !== 'beklemede') {
      throw new Error('Bu karsi teklif artik beklemede degil');
    }

    let current = counterOffer;
    let rootOffer: FirebaseOffer | null = null;
    const visited = new Set<string>();
    while (current?.parentOfferId && !visited.has(current.parentOfferId)) {
      visited.add(current.parentOfferId);
      const parentSnapshot = await get(ref(database, `offers/${current.parentOfferId}`));
      if (!parentSnapshot.exists()) break;
      const parentOffer = parentSnapshot.val() as FirebaseOffer;
      if (parentOffer.sourceType === 'brand' && parentOffer.destinationType === 'influencer') {
        rootOffer = parentOffer;
        break;
      }
      current = parentOffer;
    }

    // Influencer karşı teklifinin ebeveyni doğrudan marka teklifi değil, katılım (incoming_campaign) olabilir.
    if (!rootOffer?.id && counterOffer.parentOfferId) {
      const parentSnapshot = await get(ref(database, `offers/${counterOffer.parentOfferId}`));
      if (parentSnapshot.exists()) {
        const parentOffer = parentSnapshot.val() as FirebaseOffer;
        if (
          parentOffer.offerKind === 'incoming_campaign' &&
          parentOffer.sourceType === 'influencer' &&
          parentOffer.influencerId === counterOffer.influencerId &&
          parentOffer.brandId === data.brandId &&
          parentOffer.campaignId === data.campaignId
        ) {
          rootOffer = parentOffer;
        }
      }
    }

    if (!rootOffer?.id) {
      throw new Error('Ana teklif bulunamadi');
    }

    await assertBrandWalletCovers(data.brandId, Math.round(parsedPrice));

    const now = new Date().toISOString();
    const rootUpdates: Record<string, any> = {
      price: parsedPrice,
      message: data.message?.trim() || rootOffer.message || '',
      status: 'beklemede',
      updatedAt: now,
      respondedAt: null,
    };

    const processedCounterUpdates: Record<string, any> = {
      status: 'kabul',
      updatedAt: now,
      respondedAt: now,
    };

    const syncTasks: Promise<unknown>[] = [
      set(push(ref(database, `offers/${rootOffer.id}/negotiationHistory`)), {
        actor: 'brand',
        price: parsedPrice,
        message: rootUpdates.message || '',
        createdAt: now,
        type: 'revision',
      }),
      update(ref(database, `offers/${rootOffer.id}`), rootUpdates),
      update(ref(database, `offers/${counterOffer.id}`), processedCounterUpdates),
      update(
        ref(database, `brands/${data.brandId}/campaigns/${data.campaignId}/incomingOffers/${counterOffer.id}`),
        processedCounterUpdates
      ),
    ];
    if (rootOffer.offerKind === 'incoming_campaign') {
      syncTasks.push(
        update(
          ref(database, `brands/${data.brandId}/campaigns/${data.campaignId}/incomingOffers/${rootOffer.id}`),
          rootUpdates
        )
      );
    }
    await Promise.all(syncTasks);

    await sendOfferSystemMessage({
      eventType: 'brand_counter_sent',
      brandId: data.brandId,
      influencerId: counterOffer.influencerId,
      campaignId: data.campaignId,
      offerId: rootOffer.id,
      rootOfferId: rootOffer.id,
      price: parsedPrice,
    });
  } catch (error: any) {
    console.error('Karsi teklif thread guncelleme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Karşı teklif güncellenirken bir hata oluştu.'));
  }
}

export interface ReviseIncomingCampaignParticipationData {
  brandId: string;
  campaignId: string;
  offerId: string;
  price: number;
  message?: string;
}

/** Marka, katılım (incoming_campaign) teklifine karşı yeni tutar/mesaj gönderir; teklif beklemede kalır. */
export async function reviseIncomingCampaignParticipationOffer(
  data: ReviseIncomingCampaignParticipationData
): Promise<void> {
  try {
    const parsedPrice = Number(data.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      throw new Error('Teklif tutari 0\'dan buyuk olmali');
    }

    const offerSnapshot = await get(ref(database, `offers/${data.offerId}`));
    if (!offerSnapshot.exists()) {
      throw new Error('Teklif bulunamadi');
    }
    const offer = offerSnapshot.val() as FirebaseOffer;
    if (offer.brandId !== data.brandId || offer.campaignId !== data.campaignId) {
      throw new Error('Teklif bu kampanya ile eslesmiyor');
    }
    if (offer.offerKind !== 'incoming_campaign' || offer.sourceType !== 'influencer') {
      throw new Error('Bu teklif turu icin katilim revizyonu uygulanamaz');
    }
    if (offer.status !== 'beklemede') {
      throw new Error('Yalnizca beklemedeki teklifler guncellenebilir');
    }

    const selfMap: Record<string, FirebaseOffer> = { [offer.id]: offer };
    if (isAwaitingInfluencerAfterBrandNegotiation(offer, selfMap)) {
      throw new Error('Influencer yaniti bekleniyor; yeni karsi teklif gonderilemez');
    }

    await assertBrandWalletCovers(data.brandId, Math.round(parsedPrice));

    const now = new Date().toISOString();
    const message = data.message?.trim() || offer.message || '';
    const updates: Record<string, any> = {
      price: parsedPrice,
      message,
      updatedAt: now,
    };

    await Promise.all([
      set(push(ref(database, `offers/${data.offerId}/negotiationHistory`)), {
        actor: 'brand',
        price: parsedPrice,
        message,
        createdAt: now,
        type: 'revision',
      }),
      update(ref(database, `offers/${data.offerId}`), updates),
      update(
        ref(database, `brands/${data.brandId}/campaigns/${data.campaignId}/incomingOffers/${data.offerId}`),
        updates
      ),
    ]);

    await sendOfferSystemMessage({
      eventType: 'brand_counter_sent',
      brandId: data.brandId,
      influencerId: offer.influencerId,
      campaignId: data.campaignId,
      offerId: data.offerId,
      rootOfferId: data.offerId,
      price: parsedPrice,
    });
  } catch (error: any) {
    console.error('Katilim teklifi revizyon hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Karşı teklif güncellenirken bir hata oluştu.'));
  }
}

// Kampanyaya ait teklifleri getir
export async function getOffersByCampaign(campaignId: string): Promise<FirebaseOffer[]> {
  try {
    const offersRef = ref(database, 'offers');
    const snapshot = await get(offersRef);

    if (snapshot.exists()) {
      const offersObj = snapshot.val();
      const offers = Object.values(offersObj) as FirebaseOffer[];
      return offers.filter((offer) => offer.campaignId === campaignId);
    }
    return [];
  } catch (error: any) {
    console.error('Teklifler getirme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Teklifler getirilirken bir hata oluştu.'));
  }
}

// Markaya ait tum teklifleri getir
export async function getOffersByBrand(brandId: string): Promise<FirebaseOffer[]> {
  try {
    const offersRef = ref(database, 'offers');
    const snapshot = await get(offersRef);

    if (snapshot.exists()) {
      const offersObj = snapshot.val();
      const offers = Object.values(offersObj) as FirebaseOffer[];
      return offers.filter((offer) => offer.brandId === brandId);
    }
    return [];
  } catch (error: any) {
    console.error('Teklifler getirme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Teklifler getirilirken bir hata oluştu.'));
  }
}

// Influencer'a ait teklifleri getir
export async function getOffersByInfluencer(influencerId: string): Promise<FirebaseOffer[]> {
  try {
    const offersRef = ref(database, 'offers');
    const snapshot = await get(offersRef);

    if (snapshot.exists()) {
      const offersObj = snapshot.val();
      const offers = Object.values(offersObj) as FirebaseOffer[];
      return offers.filter((offer) => offer.influencerId === influencerId);
    }
    return [];
  } catch (error: any) {
    console.error('Teklifler getirme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Teklifler getirilirken bir hata oluştu.'));
  }
}

// Influencer tarafindan kampanyalara gonderilen teklifleri getir
export async function getIncomingOffersByInfluencer(influencerId: string): Promise<FirebaseOffer[]> {
  try {
    const offers = await getOffersByInfluencer(influencerId);
    const filtered = offers.filter(
      (offer) => offer.offerKind === 'incoming_campaign' || offer.sourceType === 'influencer'
    );
    return collapseIncomingParticipationThreadsForDisplay(filtered);
  } catch (error: any) {
    console.error('Influencer gelen teklifleri getirme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Teklifler getirilirken bir hata oluştu.'));
  }
}

/**
 * Kampanyada herhangi bir influencer ile anlaşma (kabul edilmiş teklif) var mı.
 * Gelen teklifler (incomingOffers) ve global offers tablosu birlikte kontrol edilir.
 */
export async function campaignHasAnyAcceptedOffer(brandId: string, campaignId: string): Promise<boolean> {
  try {
    const incoming = await getIncomingOffersByCampaign(brandId, campaignId);
    if (incoming.some((o) => o.status === 'kabul')) return true;
    const all = await getOffersByCampaign(campaignId);
    return all.some((o) => o.status === 'kabul');
  } catch (e) {
    console.error('campaignHasAnyAcceptedOffer:', e);
    return true;
  }
}

// Kampanya cluster'indaki gelen teklifleri getir
export async function getIncomingOffersByCampaign(
  brandId: string,
  campaignId: string
): Promise<FirebaseOffer[]> {
  try {
    const snapshot = await get(
      ref(database, `brands/${brandId}/campaigns/${campaignId}/incomingOffers`)
    );
    if (!snapshot.exists()) return [];

    const offers = Object.values(snapshot.val()) as FirebaseOffer[];
    return offers.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  } catch (error: any) {
    console.error('Kampanya gelen teklifleri getirme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Gelen teklifler getirilirken bir hata oluştu.'));
  }
}

// Kampanya cluster'indaki gelen teklif durumunu guncelle
export async function updateIncomingCampaignOfferStatus(
  brandId: string,
  campaignId: string,
  offerId: string,
  status: 'beklemede' | 'kabul' | 'red',
  opts?: { actorInfluencerResponse?: boolean }
): Promise<void> {
  try {
    const offerSnapshot = await get(ref(database, `offers/${offerId}`));
    if (!offerSnapshot.exists()) {
      throw new Error('Teklif bulunamadi');
    }
    const offer = offerSnapshot.val() as FirebaseOffer;
    if (offer.brandId !== brandId || offer.campaignId !== campaignId) {
      throw new Error('Teklif bu kampanya ile eslesmiyor');
    }

    if (opts?.actorInfluencerResponse) {
      const uid = auth.currentUser?.uid;
      if (!uid || uid !== offer.influencerId) {
        throw new Error('Bu teklifi yanitlayamazsiniz');
      }
      if (offer.offerKind !== 'incoming_campaign' || offer.sourceType !== 'influencer') {
        throw new Error('Bu islem yalnizca katilim teklifleri icin gecerlidir');
      }
    }

    if (offer.status === status) {
      return;
    }
    if (status === 'kabul' || status === 'red') {
      if (offer.status !== 'beklemede') {
        throw new Error('Yalnizca beklemedeki teklifler yanitlanabilir');
      }
      if (!opts?.actorInfluencerResponse) {
        const campaignOffers = await getOffersByCampaign(campaignId);
        const offerMap = campaignOffers.reduce<Record<string, FirebaseOffer>>((acc, o) => {
          acc[o.id] = o;
          return acc;
        }, {});
        if (isAwaitingInfluencerAfterBrandNegotiation(offer, offerMap)) {
          throw new Error(
            'Son adimi siz attiniz; influencer yanit verene kadar kabul veya red veremezsiniz'
          );
        }
      }
    } else if (status === 'beklemede' && offer.status !== 'beklemede') {
      throw new Error('Yanitlanmis teklif beklemede durumuna alinamaz');
    }

    const now = new Date().toISOString();

    const mainUpdates: Record<string, any> = {
      status,
      updatedAt: now,
    };
    if (status !== 'beklemede') {
      mainUpdates.respondedAt = now;
    }

    let rootOfferForBudget: FirebaseOffer | null = null;
    let rootOfferIdForBudget: string | null = null;
    let rootOfferPayload: Record<string, any> | null = null;

    // Influencer'dan gelen karÅŸÄ± teklif kabul edilirse, ilgili ana marka teklifi de kabul durumuna Ã§ekilir.
    if (
      status === 'kabul' &&
      offer.offerKind === 'counter_offer' &&
      offer.sourceType === 'influencer'
    ) {
      let current: FirebaseOffer | null = offer;
      let rootOffer: FirebaseOffer | null = null;
      const visited = new Set<string>();

      while (current?.parentOfferId && !visited.has(current.parentOfferId)) {
        visited.add(current.parentOfferId);
        const parentSnapshot = await get(ref(database, `offers/${current.parentOfferId}`));
        if (!parentSnapshot.exists()) break;
        const parent = parentSnapshot.val() as FirebaseOffer;
        if (parent.sourceType === 'brand' && parent.destinationType === 'influencer') {
          rootOffer = parent;
          break;
        }
        current = parent;
      }

      if (rootOffer?.id) {
        rootOfferForBudget = {
          ...rootOffer,
          price: offer.price,
          message: offer.message || rootOffer.message || '',
        };
        rootOfferIdForBudget = rootOffer.id;
        rootOfferPayload = {
          status: 'kabul',
          price: offer.price,
          message: offer.message || rootOffer.message || '',
          updatedAt: now,
          respondedAt: now,
        };
      }
    }

    if (status === 'kabul') {
      const budgetTargetOffer = rootOfferForBudget || offer;
      const targetBudgetOfferId = rootOfferIdForBudget || budgetTargetOffer.id;
      const budgetMeta = await maybeDeductBrandWalletForOfferAccept({
        actingOffer: offer,
        amount: budgetTargetOffer.price,
        targetOfferId: targetBudgetOfferId,
        campaignId,
        actorInfluencerIncomingKabul:
          opts?.actorInfluencerResponse === true && offer.offerKind === 'incoming_campaign',
      });

      if (budgetMeta) {
        if (targetBudgetOfferId === offerId) {
          Object.assign(mainUpdates, budgetMeta);
        } else {
          Object.assign(mainUpdates, budgetMeta);
          if (rootOfferPayload) {
            Object.assign(rootOfferPayload, budgetMeta);
          }
        }
      }
    }

    const ops: Promise<any>[] = [
      update(ref(database, `brands/${brandId}/campaigns/${campaignId}/incomingOffers/${offerId}`), mainUpdates),
      update(ref(database, `offers/${offerId}`), mainUpdates),
    ];

    if (rootOfferIdForBudget && rootOfferPayload) {
      ops.push(update(ref(database, `offers/${rootOfferIdForBudget}`), rootOfferPayload));
    }

    await Promise.all(ops);

    if (status === 'kabul' || status === 'red') {
      await sendOfferSystemMessage({
        eventType: status === 'kabul' ? 'offer_accepted' : 'offer_rejected',
        brandId,
        influencerId: offer.influencerId,
        campaignId,
        offerId,
        rootOfferId: offer.parentOfferId || offer.id,
        price: offer.price,
      });
    }
  } catch (error: any) {
    console.error('Kampanya gelen teklif durum guncelleme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Teklif durumu güncellenirken bir hata oluştu.'));
  }
}

/** Influencer, markanın revize ettiği katılım teklifini kabul / red eder (offers + kampanya incomingOffers senkron). */
export async function influencerRespondToIncomingCampaignParticipationOffer(
  offerId: string,
  status: 'kabul' | 'red'
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Oturum gerekli');
  }
  const offerSnapshot = await get(ref(database, `offers/${offerId}`));
  if (!offerSnapshot.exists()) {
    throw new Error('Teklif bulunamadi');
  }
  const offer = offerSnapshot.val() as FirebaseOffer;
  if (offer.influencerId !== uid) {
    throw new Error('Bu teklifi yanitlayamazsiniz');
  }
  await updateIncomingCampaignOfferStatus(offer.brandId, offer.campaignId, offerId, status, {
    actorInfluencerResponse: true,
  });
}

// Teklif durumunu guncelle
export async function updateOfferStatus(
  offerId: string,
  status: 'beklemede' | 'kabul' | 'red'
): Promise<void> {
  try {
    const offerSnapshot = await get(ref(database, `offers/${offerId}`));
    if (!offerSnapshot.exists()) {
      throw new Error('Teklif bulunamadi');
    }
    const offer = offerSnapshot.val() as FirebaseOffer;

    if (offer.status === status) {
      return;
    }

    const offerRef = ref(database, `offers/${offerId}`);
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status !== 'beklemede') {
      updates.respondedAt = new Date().toISOString();
    }

    if (status === 'kabul') {
      const budgetMeta = await maybeDeductBrandWalletForOfferAccept({
        actingOffer: offer,
        amount: offer.price,
        targetOfferId: offer.id,
        campaignId: offer.campaignId,
        actorInfluencerIncomingKabul: false,
      });
      if (budgetMeta) {
        Object.assign(updates, budgetMeta);
      }
    }

    await update(offerRef, updates);

    if (status === 'kabul' || status === 'red') {
      await sendOfferSystemMessage({
        eventType: status === 'kabul' ? 'offer_accepted' : 'offer_rejected',
        brandId: offer.brandId,
        influencerId: offer.influencerId,
        campaignId: offer.campaignId,
        offerId: offer.id,
        rootOfferId: offer.parentOfferId || offer.id,
        price: offer.price,
      });
    }
  } catch (error: any) {
    console.error('Teklif durumu guncelleme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Teklif durumu güncellenirken bir hata oluştu.'));
  }
}

// Offer icin icerik linki guncelle
export async function updateOfferContentLink(offerId: string, contentLink: string): Promise<void> {
  try {
    const offerRef = ref(database, `offers/${offerId}`);
    const snap = await get(offerRef);
    if (!snap.exists()) {
      throw new Error('Teklif bulunamadi');
    }
    const offer = snap.val() as FirebaseOffer;
    if (offer.contentApproved === true) {
      throw new Error('İçerik marka tarafından onaylandı; güncelleme yapılamaz.');
    }
    const trimmed = contentLink.trim();
    const now = new Date().toISOString();
    const synthetic: FirebaseOffer = { ...offer, contentLink: trimmed };
    await update(offerRef, {
      contentLink: trimmed,
      updatedAt: now,
      lastContentDeliveryAt: now,
      contentPreview: {
        fingerprint: computeOfferContentFingerprint(synthetic),
        consumed: false,
      },
    });
    await sendOfferSystemMessage({
      eventType: 'content_uploaded',
      brandId: offer.brandId,
      influencerId: offer.influencerId,
      campaignId: offer.campaignId,
      offerId: offer.id,
      rootOfferId: offer.parentOfferId || offer.id,
      price: offer.price,
    });
  } catch (error: any) {
    console.error('Icerik linki guncelleme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'İçerik linki güncellenirken bir hata oluştu.'));
  }
}

/**
 * Kampanya `contentLines` ile eşleşen çoklu teslim güncellenir (`lineId` = satır kimliği).
 * `contentLink` ilk bulunan teslim URL’si ile uyumluluk için doldurulur.
 */
export async function mergeOfferContentDeliveries(
  offerId: string,
  patchByLine: Record<string, { contentUrl?: string; shareLink?: string }>
): Promise<void> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('Oturum gerekli');
    }
    const snap = await get(ref(database, `offers/${offerId}`));
    if (!snap.exists()) {
      throw new Error('Teklif bulunamadi');
    }
    const offer = snap.val() as FirebaseOffer;
    if (offer.influencerId !== uid) {
      throw new Error('Bu teklif icin teslim yapamazsiniz');
    }
    if (offer.contentApproved === true) {
      throw new Error('İçerik marka tarafından onaylandı; güncelleme yapılamaz.');
    }
    if (offer.contentMediaApproved === true) {
      for (const patch of Object.values(patchByLine)) {
        if (patch.contentUrl !== undefined && patch.contentUrl?.trim()) {
          throw new Error('Ham içerik marka tarafından onaylandı; artık yalnızca paylaşım linki eklenebilir.');
        }
      }
    }

    const now = new Date().toISOString();
    const combined: Record<
      string,
      { contentUrl?: string; shareLink?: string; updatedAt?: string }
    > = { ...(offer.contentDeliveries || {}) };

    const updates: Record<string, unknown> = { updatedAt: now };

    let hasContentUpload = false;
    let hasShareLinkUpdate = false;
    for (const [lineId, patch] of Object.entries(patchByLine)) {
      const prev = combined[lineId] || {};
      if (patch.contentUrl !== undefined && patch.contentUrl?.trim()) {
        hasContentUpload = true;
      }
      if (patch.shareLink !== undefined && patch.shareLink?.trim()) {
        hasShareLinkUpdate = true;
      }
      const nextRow = {
        ...prev,
        ...(patch.shareLink !== undefined ? { shareLink: patch.shareLink?.trim() } : {}),
        ...(patch.contentUrl !== undefined ? { contentUrl: patch.contentUrl?.trim() } : {}),
        updatedAt: now,
      };
      combined[lineId] = nextRow;
      updates[`contentDeliveries/${lineId}`] = nextRow;
    }

    const primary =
      Object.values(combined)
        .map((r) => (typeof r?.contentUrl === 'string' ? r.contentUrl.trim() : ''))
        .find((s) => s.length > 0) || offer.contentLink?.trim();

    if (primary) {
      updates.contentLink = primary;
    }

    const synthetic: FirebaseOffer = {
      ...offer,
      contentLink: String(updates.contentLink ?? offer.contentLink ?? primary ?? ''),
      contentDeliveries: combined,
    };
    updates.lastContentDeliveryAt = now;
    updates.contentPreview = {
      fingerprint: computeOfferContentFingerprint(synthetic),
      consumed: false,
    };

    await update(ref(database, `offers/${offerId}`), updates);
    if (hasContentUpload) {
      await sendOfferSystemMessage({
        eventType: 'content_uploaded',
        brandId: offer.brandId,
        influencerId: offer.influencerId,
        campaignId: offer.campaignId,
        offerId: offer.id,
        rootOfferId: offer.parentOfferId || offer.id,
        price: offer.price,
      });
    }
    if (hasShareLinkUpdate) {
      await sendOfferSystemMessage({
        eventType: 'content_share_link_set',
        brandId: offer.brandId,
        influencerId: offer.influencerId,
        campaignId: offer.campaignId,
        offerId: offer.id,
        rootOfferId: offer.parentOfferId || offer.id,
        price: offer.price,
      });
    }
  } catch (error: any) {
    console.error('Coklu icerik teslim guncelleme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'İçerik teslimi güncellenirken bir hata oluştu.'));
  }
}

/** Marka: onaysız içerik kümesi için tek kullanımlık önizleme hakkı tükendi (modal kapandığında). */
export async function markOfferContentPreviewConsumed(offerId: string): Promise<void> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const offerRef = ref(database, `offers/${offerId}`);
    const snap = await get(offerRef);
    if (!snap.exists()) return;
    const offer = snap.val() as FirebaseOffer;
    if (uid !== offer.brandId || offer.contentApproved === true) return;

    const fp = computeOfferContentFingerprint(offer);
    if (!fp.trim()) return;

    const now = new Date().toISOString();
    await update(offerRef, {
      contentPreview: {
        fingerprint: fp,
        consumed: true,
      },
      updatedAt: now,
    });
  } catch (error: unknown) {
    console.warn('İçerik önizleme tüketimi yazılamadı:', error);
  }
}

// Offer icin revizyon notu ekle
export async function addOfferRevision(offerId: string, note: string): Promise<void> {
  try {
    const offerSnap = await get(ref(database, `offers/${offerId}`));
    if (!offerSnap.exists()) {
      throw new Error('Teklif bulunamadı');
    }
    const offer = offerSnap.val() as FirebaseOffer;
    if (offer.contentApproved === true) {
      throw new Error('İçerik zaten onaylandığı için revizyon talep edilemez.');
    }
    if (isRevisionResponsePending(offer)) {
      throw new Error(
        'Önceki revizyon için influencer yeni içeriği yükleyene kadar yeni revizyon talebi gönderilemez.'
      );
    }

    const revisionsRef = ref(database, `offers/${offerId}/revisions`);
    const newRevisionRef = push(revisionsRef);
    await set(newRevisionRef, {
      note,
      createdAt: new Date().toISOString(),
    });
    await update(ref(database, `offers/${offerId}`), {
      updatedAt: new Date().toISOString(),
    });
    await sendOfferSystemMessage({
      eventType: 'content_revision_requested',
      brandId: offer.brandId,
      influencerId: offer.influencerId,
      campaignId: offer.campaignId,
      offerId: offer.id,
      rootOfferId: offer.parentOfferId || offer.id,
      price: offer.price,
    });
  } catch (error: any) {
    console.error('Revizyon ekleme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Revizyon eklenirken bir hata oluştu.'));
  }
}

// Belirli bir influencer'a bu kampanya icin teklif gonderilmis mi kontrol et
export async function checkOfferExists(campaignId: string, influencerId: string): Promise<boolean> {
  try {
    const offers = await getOffersByCampaign(campaignId);
    return offers.some((offer) => offer.influencerId === influencerId);
  } catch (error) {
    return false;
  }
}

// Teklif istatistiklerini getir
export async function getOfferStats(brandId: string): Promise<{
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}> {
  try {
    const offers = collapseIncomingParticipationThreadsForDisplay(await getOffersByBrand(brandId));
    return {
      total: offers.length,
      pending: offers.filter((o) => o.status === 'beklemede').length,
      accepted: offers.filter((o) => o.status === 'kabul').length,
      rejected: offers.filter((o) => o.status === 'red').length,
    };
  } catch (error) {
    return { total: 0, pending: 0, accepted: 0, rejected: 0 };
  }
}

// Ä°Ã§eriÄŸi onayla ve influencer'a Ã¶deme transferi yap
export async function approveContent(offerId: string): Promise<void> {
  try {
    const offerSnapshot = await get(ref(database, `offers/${offerId}`));
    if (!offerSnapshot.exists()) {
      throw new Error('Teklif bulunamadi');
    }

    const offer = offerSnapshot.val() as FirebaseOffer;

    if (offer.contentApproved) {
      throw new Error('Ä°Ã§erik zaten onaylanmÄ±ÅŸ');
    }

    let campaignRow: Awaited<ReturnType<typeof getCampaignById>> = null;
    try {
      campaignRow = await getCampaignById(offer.brandId, offer.campaignId);
    } catch {
      campaignRow = null;
    }

	    if (!isOfferContentDeliveryCompleteForCampaign(offer, campaignRow)) {
	      throw new Error('Tüm içerik teslimleri tamamlanmadan onay verilemez.');
	    }
	    if (isCollaborationCampaign(campaignRow) && offer.contentMediaApproved !== true) {
	      throw new Error('İşbirliği kampanyalarında önce ham video/görsel onaylanmalıdır.');
	    }

    const now = new Date().toISOString();

    // Ä°Ã§erik onay durumunu gÃ¼ncelle
    await update(ref(database, `offers/${offerId}`), {
      contentApproved: true,
      contentApprovedAt: now,
      paymentHoldStatus: 'released',
      updatedAt: now,
    });

    /** Influencer cüzdanına doğrudan yazılamaz — çekilebilir tutar `offers` / grossWithdrawable ile görünür; arka planda `enqueuePendingBrandToInfluencerPayoutFromApproval` kuyruğu. */

    const currentUserId = auth.currentUser?.uid;
    if (currentUserId === offer.brandId) {
      try {
        await enqueuePendingBrandToInfluencerPayoutFromApproval({
          brandId: offer.brandId,
          offerId: offer.id,
          influencerId: offer.influencerId,
          amount: Math.round(Number(offer.price) || 0),
          campaignId: offer.campaignId,
        });
      } catch (e: unknown) {
        console.warn('Influencer ödeme sırasına alınamadı:', e);
      }
      await sendOfferSystemMessage({
        eventType: 'content_approved',
        brandId: offer.brandId,
        influencerId: offer.influencerId,
        campaignId: offer.campaignId,
        offerId: offer.id,
        price: offer.price,
      });
    }
  } catch (error: any) {
    console.error('Ä°Ã§erik onaylama hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'İçerik onaylanırken bir hata oluştu.'));
	  }
	}

// İşbirliği: ham video/görsel onayı. Escrow serbest bırakılmaz; influencer paylaşım linki aşamasına geçer.
export async function approveCollaborationRawContent(offerId: string): Promise<void> {
  try {
    const offerSnapshot = await get(ref(database, `offers/${offerId}`));
    if (!offerSnapshot.exists()) {
      throw new Error('Teklif bulunamadi');
    }

    const offer = offerSnapshot.val() as FirebaseOffer;
    if (offer.contentApproved) {
      throw new Error('İçerik zaten final onay aldı.');
    }
    if (offer.contentMediaApproved) {
      throw new Error('Ham içerik zaten onaylandı.');
    }

    let campaignRow: Awaited<ReturnType<typeof getCampaignById>> = null;
    try {
      campaignRow = await getCampaignById(offer.brandId, offer.campaignId);
    } catch {
      campaignRow = null;
    }
    if (!isCollaborationCampaign(campaignRow)) {
      throw new Error('Ham içerik onayı yalnızca işbirliği kampanyaları için geçerlidir.');
    }
    if (!isOfferRawContentCompleteForCampaign(offer, campaignRow)) {
      throw new Error('Ham video/görsel yüklenmeden onay verilemez.');
    }

    const now = new Date().toISOString();
    await update(ref(database, `offers/${offerId}`), {
      contentMediaApproved: true,
      contentMediaApprovedAt: now,
      updatedAt: now,
    });
    await sendOfferSystemMessage({
      eventType: 'content_media_approved',
      brandId: offer.brandId,
      influencerId: offer.influencerId,
      campaignId: offer.campaignId,
      offerId: offer.id,
      rootOfferId: offer.parentOfferId || offer.id,
      price: offer.price,
    });
  } catch (error: any) {
    console.error('Ham içerik onaylama hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Ham içerik onaylanırken bir hata oluştu.'));
  }
}

// Ä°Ã§eriÄŸi reddet
export async function rejectContent(offerId: string, reason?: string): Promise<void> {
  try {
    const offerSnapshot = await get(ref(database, `offers/${offerId}`));
    if (!offerSnapshot.exists()) {
      throw new Error('Teklif bulunamadi');
    }

    const offer = offerSnapshot.val() as FirebaseOffer;
    const now = new Date().toISOString();

    // Ä°Ã§erik red durumunu gÃ¼ncelle
    await update(ref(database, `offers/${offerId}`), {
      contentApproved: false,
      contentRejectedAt: now,
      contentRejectionReason: reason,
      updatedAt: now,
    });

    // Bildirim gÃ¶nder
    await sendOfferSystemMessage({
      eventType: 'content_rejected',
      brandId: offer.brandId,
      influencerId: offer.influencerId,
      campaignId: offer.campaignId,
      offerId: offer.id,
      price: offer.price,
    });
  } catch (error: any) {
    console.error('Ä°Ã§erik reddetme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'İçerik reddedilirken bir hata oluştu.'));
  }
}
