import { get, ref, update } from 'firebase/database';
import { auth, database } from '@/config/firebase';
import { shouldRefundEscrowForOffer } from '@/lib/offerContentCompleteness';
import { getFirebaseErrorMessage } from '@/lib/firebaseErrorMessages';
import { getCampaignById } from '@/services/firebaseCampaignService';
import { creditBrandWalletEscrowRefund } from '@/services/firebaseBrandWalletService';
import type { FirebaseOffer } from '@/services/firebaseOfferService';

/**
 * Teklif kabulünde bütçe kesilmişse influencer tarafından askıda tutulur (`paymentHoldStatus`).
 * Bu işlem güvenilir şekilde yalnızca bir kez çalışmalıdır.
 */
async function refundEscrowOfferToBrandAtomic(offer: FirebaseOffer): Promise<boolean> {
  const offerId = offer.id;
  if (!offer.brandId || !offer.influencerId) return false;
  const amount = Math.round(Number(offer.budgetDeductedAmount ?? offer.price ?? 0) || 0);
  if (amount <= 0) return false;

  const snapshot = await get(ref(database, `offers/${offerId}`));
  if (!snapshot.exists()) return false;
  const current = snapshot.val() as FirebaseOffer;

  if (current.paymentHoldStatus === 'refunded') return false;
  if (current.paymentHoldStatus === 'released') return false;
  if (!current.budgetDeductedAt || current.contentApproved === true) return false;

  const campaign = await getCampaignById(current.brandId, current.campaignId);
  if (!shouldRefundEscrowForOffer(current, campaign)) return false;

  const now = new Date().toISOString();
  await creditBrandWalletEscrowRefund({
    brandId: current.brandId,
    amount,
    campaignId: current.campaignId,
    influencerId: current.influencerId,
    offerId: current.id || offerId,
    note: 'Son yayın tarihi sonrası içerik onayı olmadığı için askıdaki ödeme iade edildi',
  });

  await update(ref(database, `offers/${offerId}`), {
    paymentHoldStatus: 'refunded',
    paymentEscrowRefundedAt: now,
    updatedAt: now,
  });

  return true;
}

/** Influencer kampanya listesinden: süresi dolmuş askılar markaya döner */
export async function processStaleEscrowRefundsForInfluencerOffers(offers: FirebaseOffer[]): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const candidates = offers.filter(
    (o) =>
      o.influencerId === uid &&
      o.status === 'kabul' &&
      o.budgetDeductedAt &&
      !o.contentApproved &&
      o.paymentHoldStatus !== 'refunded'
  );

  for (const o of candidates) {
    try {
      await refundEscrowOfferToBrandAtomic(o);
    } catch (e: unknown) {
      console.warn('Escrow iade işlenemedi (influencer):', o.id, e);
    }
  }
}

/** Marka paneli yüklendiğinde: kampanya süresi dolmuş bekleyen askılar */
export async function processStaleEscrowRefundsForBrandOffers(offers: FirebaseOffer[]): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const candidates = offers.filter(
    (o) =>
      o.brandId === uid &&
      o.status === 'kabul' &&
      o.budgetDeductedAt &&
      !o.contentApproved &&
      o.paymentHoldStatus !== 'refunded'
  );

  for (const o of candidates) {
    try {
      await refundEscrowOfferToBrandAtomic(o);
    } catch (e: unknown) {
      console.warn('Escrow iade işlenemedi (marka):', o.id, e);
    }
  }
}

export async function refundEscrowOfferToBrandManual(offerId: string): Promise<void> {
  try {
    const snap = await get(ref(database, `offers/${offerId}`));
    if (!snap.exists()) throw new Error('Teklif bulunamadı');
    await refundEscrowOfferToBrandAtomic(snap.val() as FirebaseOffer);
  } catch (e: unknown) {
    throw new Error(getFirebaseErrorMessage(e, 'İşlem tamamlanamadı'));
  }
}
