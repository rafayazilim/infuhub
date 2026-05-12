import { get, push, ref, remove, set, update } from 'firebase/database';
import { auth, database } from '@/config/firebase';

export type BrandWalletTransactionType = 'topup' | 'payment' | 'adjustment';

export interface BrandWalletTransaction {
  id: string;
  type: BrandWalletTransactionType;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  note?: string;
  campaignId?: string;
  influencerId?: string;
  offerId?: string;
}

export interface BrandWalletOverview {
  balance: number;
  loadedTotal: number;
  spentTotal: number;
}

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

export async function ensureBrandWallet(brandId: string): Promise<BrandWalletOverview> {
  const brandRef = ref(database, `brands/${brandId}`);
  const snapshot = await get(brandRef);
  if (!snapshot.exists()) {
    throw new Error('Marka bulunamadı');
  }

  const brandValue = snapshot.val() as Record<string, unknown>;
  const current = {
    balance: toSafeNumber(brandValue.walletBalance),
    loadedTotal: toSafeNumber(brandValue.walletLoadedTotal),
    spentTotal: toSafeNumber(brandValue.walletSpentTotal),
  };

  const needsInit =
    typeof brandValue.walletBalance !== 'number' ||
    typeof brandValue.walletLoadedTotal !== 'number' ||
    typeof brandValue.walletSpentTotal !== 'number';

  if (needsInit) {
    await update(brandRef, {
      walletBalance: current.balance,
      walletLoadedTotal: current.loadedTotal,
      walletSpentTotal: current.spentTotal,
      updatedAt: new Date().toISOString(),
    });
  }

  return current;
}

/** Cüzdan yetersizliği — teklif kabulü / ödeme öncesi `assertBrandWalletCovers` ve `deductBudgetFromBrandWallet` */
export const BRAND_WALLET_INSUFFICIENT_ERROR_MESSAGE =
  'Marka bakiyesi yetersiz. Önce cüzdanınıza bütçe yükleyin, ardından teklifi kabul edin.';

export function isInsufficientBrandWalletError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  if (!msg) return false;
  return (
    msg.includes('Marka bakiyesi yetersiz') ||
    /bakiyeniz|bakiyesi yetersiz|yetersiz.*bakiy/i.test(msg) ||
    /bütce yükleyin|bütçe yükleyin/i.test(msg)
  );
}

/** Kabul anında cüzdandan çekilecek tutar (₺) */
export function getOfferPriceForWalletCheck(price: unknown): number {
  return Math.max(0, Math.round(Number(price) || 0));
}

/** Gelen teklif kabulü: teklif tutarı mevcut bakiyeden büyük mü */
export function isBalanceInsufficientForIncomingAccept(balance: number, offerPrice: unknown): boolean {
  const needed = getOfferPriceForWalletCheck(offerPrice);
  return needed > 0 && balance < needed;
}

export async function getBrandWalletTransactions(
  brandId: string,
  limit = 80
): Promise<BrandWalletTransaction[]> {
  const snapshot = await get(ref(database, `brands/${brandId}/walletTransactions`));
  if (!snapshot.exists()) return [];

  const rows = Object.values(snapshot.val()) as BrandWalletTransaction[];
  return rows
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, Math.max(1, limit));
}

export async function addBudgetToBrandWallet(
  brandId: string,
  amount: number,
  note?: string
): Promise<BrandWalletOverview> {
  const normalizedAmount = Math.round(Number(amount) || 0);
  if (normalizedAmount <= 0) {
    throw new Error('Yüklenecek tutar 0’dan büyük olmalı');
  }

  const wallet = await ensureBrandWallet(brandId);
  const next = {
    balance: wallet.balance + normalizedAmount,
    loadedTotal: wallet.loadedTotal + normalizedAmount,
    spentTotal: wallet.spentTotal,
  };
  const now = new Date().toISOString();

  await update(ref(database, `brands/${brandId}`), {
    walletBalance: next.balance,
    walletLoadedTotal: next.loadedTotal,
    walletSpentTotal: next.spentTotal,
    updatedAt: now,
  });

  const txRef = push(ref(database, `brands/${brandId}/walletTransactions`));
  await set(txRef, {
    id: txRef.key!,
    type: 'topup',
    amount: normalizedAmount,
    balanceAfter: next.balance,
    createdAt: now,
    note: note?.trim() || 'Manuel bütçe yükleme',
  } satisfies BrandWalletTransaction);

  return next;
}

/** Yeterli bakiye yoksa hata fırlatır (teklif verme / kabul öncesi kontrol). */
export async function assertBrandWalletCovers(brandId: string, amount: number): Promise<void> {
  const normalizedAmount = Math.round(Number(amount) || 0);
  if (normalizedAmount <= 0) {
    throw new Error('Tutar 0’dan büyük olmalı');
  }
  const wallet = await ensureBrandWallet(brandId);
  if (wallet.balance < normalizedAmount) {
    throw new Error(BRAND_WALLET_INSUFFICIENT_ERROR_MESSAGE);
  }
}

export interface PendingBrandWalletDebitPayload {
  brandId: string;
  offerId: string;
  influencerId: string;
  amount: number;
  campaignId: string;
}

/**
 * Influencer teklifi kabul ettiğinde marka cüzdanına doğrudan yazılamaz (RTDB kuralları).
 * Kesinti marka oturumunda processPendingBrandWalletDebitsForBrand ile uygulanır.
 */
export async function enqueuePendingBrandWalletDebit(payload: PendingBrandWalletDebitPayload): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== payload.influencerId) {
    throw new Error('Oturum gerekli');
  }
  const amount = Math.round(Number(payload.amount) || 0);
  if (amount <= 0) {
    throw new Error('Gecersiz tutar');
  }
  const path = `pendingBrandWalletDebits/${payload.brandId}/${payload.offerId}`;
  const existing = await get(ref(database, path));
  if (existing.exists()) {
    return;
  }
  const now = new Date().toISOString();
  await set(ref(database, path), {
    brandId: payload.brandId,
    offerId: payload.offerId,
    influencerId: payload.influencerId,
    amount,
    campaignId: payload.campaignId,
    createdAt: now,
    createdByInfluencerUid: uid,
  });
}

export interface PendingBrandToInfluencerPayoutPayload {
  brandId: string;
  offerId: string;
  influencerId: string;
  amount: number;
  campaignId: string;
}

/** İçerik onayı sonrası influencer cüzdana doğrudan yazılamaz; ödeme/ledger için RTDB sırasına alınır (`database.rules`: `pendingBrandToInfluencerPayouts`). */
export async function enqueuePendingBrandToInfluencerPayoutFromApproval(
  payload: PendingBrandToInfluencerPayoutPayload
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== payload.brandId) {
    return;
  }
  const amount = Math.round(Number(payload.amount) || 0);
  if (amount <= 0) {
    return;
  }
  const path = `pendingBrandToInfluencerPayouts/${payload.brandId}/${payload.offerId}`;
  const existing = await get(ref(database, path));
  if (existing.exists()) {
    return;
  }
  const now = new Date().toISOString();
  await set(ref(database, path), {
    brandId: payload.brandId,
    offerId: payload.offerId,
    influencerId: payload.influencerId,
    amount,
    campaignId: payload.campaignId,
    createdAt: now,
    createdByBrandUid: uid,
    kind: 'content_approval',
  });
}

/** Marka paneli açıldığında bekleyen kabul kesintilerini cüzdana işler. */
export async function processPendingBrandWalletDebitsForBrand(brandId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== brandId) {
    return;
  }
  const pendingRoot = ref(database, `pendingBrandWalletDebits/${brandId}`);
  const snap = await get(pendingRoot);
  if (!snap.exists()) {
    return;
  }
  const entries = snap.val() as Record<
    string,
    {
      offerId?: string;
      amount?: number;
      influencerId?: string;
      campaignId?: string;
    }
  >;

  for (const [offerId, row] of Object.entries(entries)) {
    if (!row || typeof row.amount !== 'number') {
      continue;
    }
    const offerSnap = await get(ref(database, `offers/${offerId}`));
    if (!offerSnap.exists()) {
      await remove(ref(database, `pendingBrandWalletDebits/${brandId}/${offerId}`));
      continue;
    }
    const offer = offerSnap.val() as {
      status?: string;
      budgetDeductedAt?: string;
      campaignId?: string;
      influencerId?: string;
    };
    if (offer.status !== 'kabul') {
      continue;
    }
    if (offer.budgetDeductedAt) {
      await remove(ref(database, `pendingBrandWalletDebits/${brandId}/${offerId}`));
      continue;
    }

    const normalizedAmount = Math.round(row.amount);
    try {
      await deductBudgetFromBrandWallet({
        brandId,
        amount: normalizedAmount,
        campaignId: row.campaignId || offer.campaignId,
        influencerId: row.influencerId || offer.influencerId,
        offerId,
        note: 'Teklif kabulu sonrasi odeme ayrildi',
      });
      const now = new Date().toISOString();
      await update(ref(database, `offers/${offerId}`), {
        budgetDeductedAt: now,
        budgetDeductedAmount: normalizedAmount,
        paymentHoldStatus: 'active',
        updatedAt: now,
      });
    } catch (e) {
      console.error('Bekleyen cüzdan kesintisi uygulanamadı:', offerId, e);
      continue;
    }
    await remove(ref(database, `pendingBrandWalletDebits/${brandId}/${offerId}`));
  }
}

export async function deductBudgetFromBrandWallet(input: {
  brandId: string;
  amount: number;
  campaignId?: string;
  influencerId?: string;
  offerId?: string;
  note?: string;
}): Promise<BrandWalletOverview> {
  const normalizedAmount = Math.round(Number(input.amount) || 0);
  if (normalizedAmount <= 0) {
    throw new Error('Kesilecek tutar 0’dan büyük olmalı');
  }

  const wallet = await ensureBrandWallet(input.brandId);
  if (wallet.balance < normalizedAmount) {
    throw new Error(BRAND_WALLET_INSUFFICIENT_ERROR_MESSAGE);
  }

  const next = {
    balance: wallet.balance - normalizedAmount,
    loadedTotal: wallet.loadedTotal,
    spentTotal: wallet.spentTotal + normalizedAmount,
  };
  const now = new Date().toISOString();

  await update(ref(database, `brands/${input.brandId}`), {
    walletBalance: next.balance,
    walletLoadedTotal: next.loadedTotal,
    walletSpentTotal: next.spentTotal,
    updatedAt: now,
  });

  const txRef = push(ref(database, `brands/${input.brandId}/walletTransactions`));
  await set(txRef, {
    id: txRef.key!,
    type: 'payment',
    amount: -normalizedAmount,
    balanceAfter: next.balance,
    createdAt: now,
    note: input.note?.trim() || 'Influencer anlaşma ödemesi',
    campaignId: input.campaignId,
    influencerId: input.influencerId,
    offerId: input.offerId,
  } satisfies BrandWalletTransaction);

  return next;
}

/**
 * Yayın süresi dolduğu hâlde içerik onayı yoksa askıdaki tutarı marka cüzdanına geri yükler — `spentTotal` düşer.
 */
export async function creditBrandWalletEscrowRefund(input: {
  brandId: string;
  amount: number;
  campaignId?: string;
  influencerId?: string;
  offerId?: string;
  note?: string;
}): Promise<BrandWalletOverview> {
  const normalizedAmount = Math.round(Number(input.amount) || 0);
  if (normalizedAmount <= 0) {
    throw new Error('İade tutarı 0’dan büyük olmalı.');
  }

  const wallet = await ensureBrandWallet(input.brandId);
  const credit = normalizedAmount;
  const nextSpent = Math.max(0, wallet.spentTotal - credit);
  const next = {
    balance: wallet.balance + credit,
    loadedTotal: wallet.loadedTotal,
    spentTotal: nextSpent,
  };
  const now = new Date().toISOString();

  await update(ref(database, `brands/${input.brandId}`), {
    walletBalance: next.balance,
    walletLoadedTotal: next.loadedTotal,
    walletSpentTotal: next.spentTotal,
    updatedAt: now,
  });

  const txRef = push(ref(database, `brands/${input.brandId}/walletTransactions`));
  await set(txRef, {
    id: txRef.key!,
    type: 'adjustment',
    amount: credit,
    balanceAfter: next.balance,
    createdAt: now,
    note: input.note?.trim() || 'Kampanya süresi / içerik onayı — askıdaki ödeme iadesi',
    campaignId: input.campaignId,
    influencerId: input.influencerId,
    offerId: input.offerId,
  } satisfies BrandWalletTransaction);

  return next;
}

