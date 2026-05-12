import { get, push, ref, set, update } from 'firebase/database';
import { auth, database } from '@/config/firebase';
import { uploadFile } from '@/services/firebaseStorageService';
import { getInfluencerProfile } from '@/services/firebaseInfluencerService';
import {
  isGenuineInfluencerCampaignAcceptance,
  type FirebaseOffer,
} from '@/services/firebaseOfferService';
import {
  PAYOUT_MIN_WITHDRAWAL_GROSS,
  PAYOUT_PLATFORM_COMMISSION_RATE,
} from '@/constants/payout';

export type PayoutVerificationUiStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface InfluencerPayoutProfile {
  verificationStatus: PayoutVerificationUiStatus;
  taxDocumentURL?: string;
  iban?: string;
  /** Havale/EFT açıklamasında kullanılacak banka hesabı adı (tam ad) */
  payoutAccountFullName?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface PayoutVerificationRequest {
  influencerId: string;
  fullName: string;
  email: string;
  /** Havale/EFT alıcı adı (eski kayıtlarda yoksa `fullName` yedek) */
  payoutAccountFullName?: string;
  taxDocumentURL: string;
  iban: string;
  status: 'beklemede' | 'onaylandı' | 'reddedildi';
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface WithdrawalRecord {
  id: string;
  amountGross: number;
  platformFee: number;
  amountNet: number;
  status: 'beklemede' | 'tamamlandı' | 'iptal';
  createdAt: string;
  updatedAt?: string;
  /** Havale sonrası — admin panelden */
  paidAt?: string;
  processedByAdminUid?: string;
  paymentReference?: string | null;
}

const requestsPath = (influencerId: string) =>
  `payoutVerificationRequests/influencer/${influencerId}`;

const withdrawalsPath = (influencerId: string) => `influencers/${influencerId}/withdrawals`;

export function normalizeTrIban(input: string): string | null {
  const s = input.replace(/\s/g, '').toUpperCase();
  if (!/^TR\d{24}$/.test(s)) return null;
  return s;
}

/** Havale/EFT alıcı adı: en az 3 karakter, boşluk ve Türkçe isimlere uygun. */
export function normalizePayoutAccountFullName(input: string): string | null {
  const t = input.replace(/\s+/g, ' ').trim();
  if (t.length < 3 || t.length > 200) return null;
  if (!/[\p{L}]/u.test(t)) return null;
  return t;
}

/**
 * Pazarlıkta aynı anlaşma için hem üst (marka/kök) teklif hem `counter_offer` satırı `kabul` olabilir;
 * toplamı çift saymamak için yalnızca nihai anlaşma satırları (karşı teklif satırı hariç) toplanır.
 */
export function grossEarningsFromOffers(offers: FirebaseOffer[]): number {
  return offers
    .filter((o) => isGenuineInfluencerCampaignAcceptance(o))
    .filter((o) => o.paymentHoldStatus !== 'refunded')
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
}

/** İçerik marka tarafından onaylandığında çekime dahil olur */
export function grossWithdrawableFromOffers(offers: FirebaseOffer[]): number {
  return offers
    .filter((o) => isGenuineInfluencerCampaignAcceptance(o))
    .filter((o) => o.paymentHoldStatus !== 'refunded')
    .filter((o) => o.contentApproved === true)
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
}

/** Kesilmiş bütçe var, içerik onayı bekleniyor (çekime kapalı) */
export function grossEscrowPendingFromOffers(offers: FirebaseOffer[]): number {
  return offers
    .filter((o) => isGenuineInfluencerCampaignAcceptance(o))
    .filter((o) => o.paymentHoldStatus !== 'refunded')
    .filter((o) => o.budgetDeductedAt && o.contentApproved !== true)
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
}

export async function listWithdrawals(influencerId: string): Promise<WithdrawalRecord[]> {
  const snap = await get(ref(database, withdrawalsPath(influencerId)));
  if (!snap.exists()) return [];
  const val = snap.val() as Record<string, Omit<WithdrawalRecord, 'id'>>;
  return Object.entries(val).map(([id, row]) => ({ id, ...row }));
}

/** Brüt bakiye: kabul edilen teklifler toplamı eksi iptal dışı çekim taleplerinin brüt toplamı. */
export function computeAvailableGross(grossEarnings: number, withdrawals: WithdrawalRecord[]): number {
  const taken = withdrawals
    .filter((w) => w.status !== 'iptal')
    .reduce((s, w) => s + (Number(w.amountGross) || 0), 0);
  return Math.max(0, Math.round((grossEarnings - taken) * 100) / 100);
}

export function splitWithdrawalAmounts(amountGross: number): { fee: number; net: number } {
  const fee = Math.round(amountGross * PAYOUT_PLATFORM_COMMISSION_RATE * 100) / 100;
  const net = Math.round((amountGross - fee) * 100) / 100;
  return { fee, net };
}

export async function submitPayoutVerification(params: {
  influencerId: string;
  fullName: string;
  email: string;
  file: File;
  iban: string;
  /** Bankada geçen tam ad (havale/EFT alıcı adı) */
  payoutAccountFullName: string;
}): Promise<void> {
  const ibanNorm = normalizeTrIban(params.iban);
  if (!ibanNorm) {
    throw new Error('Geçerli bir TR IBAN girin (TR + 24 rakam).');
  }
  const payoutNameNorm = normalizePayoutAccountFullName(params.payoutAccountFullName);
  if (!payoutNameNorm) {
    throw new Error('Havale/EFT alıcı adı en az 3 harf/rakam içermeli (bankadaki tam adı yazın).');
  }
  const url = await uploadFile(params.file, `payout-tax-docs/${params.influencerId}`);
  const now = new Date().toISOString();

  // Önce admin kuyruğu — izin hatası olursa profil "incelemede" kalmaz (tutarlılık)
  await set(ref(database, requestsPath(params.influencerId)), {
    influencerId: params.influencerId,
    fullName: params.fullName,
    email: params.email,
    payoutAccountFullName: payoutNameNorm,
    taxDocumentURL: url,
    iban: ibanNorm,
    status: 'beklemede',
    createdAt: now,
    updatedAt: now,
  } satisfies PayoutVerificationRequest);

  await update(ref(database, `influencers/${params.influencerId}/payoutProfile`), {
    verificationStatus: 'pending',
    taxDocumentURL: url,
    payoutAccountFullName: payoutNameNorm,
    submittedAt: now,
    rejectionReason: null,
    verifiedAt: null,
    iban: null,
    updatedAt: now,
  });
}

export async function createWithdrawalRequest(
  influencerId: string,
  amountGross: number,
  offers: FirebaseOffer[]
): Promise<void> {
  const profile = await getInfluencerProfile(influencerId);
  if (!profile) throw new Error('Profil bulunamadı.');

  if (profile.payoutProfile?.verificationStatus !== 'approved') {
    throw new Error('Para çekmek için ödeme doğrulamasının onaylanması gerekir.');
  }

  const gross = Math.round(Number(amountGross) * 100) / 100;
  if (gross < PAYOUT_MIN_WITHDRAWAL_GROSS) {
    throw new Error(`Minimum çekim tutarı ₺${PAYOUT_MIN_WITHDRAWAL_GROSS} brüttür.`);
  }

  const earnings = grossWithdrawableFromOffers(offers);
  const withdrawals = await listWithdrawals(influencerId);
  const available = computeAvailableGross(earnings, withdrawals);

  if (gross > available + 0.009) {
    throw new Error('Yetersiz bakiye.');
  }

  const { fee, net } = splitWithdrawalAmounts(gross);
  const now = new Date().toISOString();

  await push(ref(database, withdrawalsPath(influencerId)), {
    amountGross: gross,
    platformFee: fee,
    amountNet: net,
    status: 'beklemede',
    createdAt: now,
    updatedAt: now,
  });
}

/** Admin: ödeme doğrulamasını onayla — IBAN ve belge influencer profiline yazılır. */
export async function adminApprovePayoutVerification(influencerId: string): Promise<void> {
  const reqSnap = await get(ref(database, requestsPath(influencerId)));
  if (!reqSnap.exists()) throw new Error('Talep bulunamadı.');
  const req = reqSnap.val() as PayoutVerificationRequest;
  const now = new Date().toISOString();

  await update(ref(database, `influencers/${influencerId}/payoutProfile`), {
    verificationStatus: 'approved',
    iban: req.iban,
    taxDocumentURL: req.taxDocumentURL,
    payoutAccountFullName: (req.payoutAccountFullName && String(req.payoutAccountFullName).trim()) || req.fullName,
    verifiedAt: now,
    rejectionReason: null,
    updatedAt: now,
  });

  await update(ref(database, requestsPath(influencerId)), {
    status: 'onaylandı',
    reviewedAt: now,
    updatedAt: now,
  });
}

export async function adminRejectPayoutVerification(
  influencerId: string,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  await update(ref(database, `influencers/${influencerId}/payoutProfile`), {
    verificationStatus: 'rejected',
    rejectionReason: reason || 'Belge veya IBAN uygun bulunmadı.',
    verifiedAt: null,
    iban: null,
    payoutAccountFullName: null,
    updatedAt: now,
  });

  const reqSnap = await get(ref(database, requestsPath(influencerId)));
  if (reqSnap.exists()) {
    await update(ref(database, requestsPath(influencerId)), {
      status: 'reddedildi',
      reviewedAt: now,
      updatedAt: now,
      rejectionReason: reason || 'Belge veya IBAN uygun bulunmadı.',
    });
  }
}

export async function loadPayoutVerificationRequests(): Promise<
  Record<string, PayoutVerificationRequest>
> {
  const snap = await get(ref(database, 'payoutVerificationRequests/influencer'));
  if (!snap.exists()) return {};
  return snap.val() as Record<string, PayoutVerificationRequest>;
}

/**
 * Admin: çekim talebini bankadan ödendikten sonra tamamlandı işaretle.
 * Kayıt: `influencers/{influencerId}/withdrawals/{id}`.
 */
export async function markWithdrawalAsPaidByAdmin(
  influencerId: string,
  withdrawalId: string,
  opts?: { paymentReference?: string }
): Promise<void> {
  const adminUid = auth.currentUser?.uid;
  if (!adminUid) throw new Error('Oturum gerekli.');
  const path = `influencers/${influencerId}/withdrawals/${withdrawalId}`;
  const snap = await get(ref(database, path));
  if (!snap.exists()) throw new Error('Talep bulunamadı.');
  const cur = snap.val() as WithdrawalRecord;
  if (cur.status !== 'beklemede') {
    throw new Error('Bu talep zaten sonuçlandırılmış (tamamlandı veya iptal).');
  }
  const now = new Date().toISOString();
  const refNote = opts?.paymentReference?.trim();
  await update(ref(database, path), {
    status: 'tamamlandı',
    updatedAt: now,
    paidAt: now,
    processedByAdminUid: adminUid,
    paymentReference: refNote && refNote.length > 0 ? refNote : null,
  });
}

/** Aylık brüt kazanç (kabul edilen teklifler, respondedAt veya updatedAt ayına göre). */
export function monthlyEarningsSeries(
  offers: FirebaseOffer[],
  monthsBack = 6
): { month: string; label: string; brut: number }[] {
  const accepted = offers.filter((o) => isGenuineInfluencerCampaignAcceptance(o));
  const now = new Date();
  const buckets: { key: string; label: string; brut: number }[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
    buckets.push({ key, label, brut: 0 });
  }

  for (const o of accepted) {
    const raw = o.respondedAt || o.updatedAt || o.createdAt;
    const dt = raw ? new Date(raw) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.brut += Number(o.price) || 0;
  }

  return buckets.map(({ key, label, brut }) => ({ month: key, label, brut }));
}

export function maskIban(iban?: string | null): string {
  if (!iban || iban.length < 8) return '—';
  return `${iban.slice(0, 4)} **** **** ${iban.slice(-4)}`;
}

/** Admin panel: `influencers` snapshot’ından çekim satırları */
export type AdminWithdrawalQueueRow = {
  withdrawalId: string;
  influencerId: string;
  fullName: string;
  /** Havale/EFT; yoksa eski kayıtlar için profil adı kullanılır */
  payoutAccountFullName?: string;
  email: string;
  phone?: string;
  iban: string;
  amountGross: number;
  platformFee: number;
  amountNet: number;
  createdAt: string;
  taxDocumentURL?: string;
};

export type AdminWithdrawalHistoryRow = AdminWithdrawalQueueRow & {
  status: 'tamamlandı' | 'iptal';
  paidAt?: string;
  processedByAdminUid?: string;
  paymentReference?: string | null;
  updatedAt?: string;
};

/**
 * `get(influencers)` cevabındaki tüm `withdrawals` alt kayıtlarını listeler.
 */
export function buildWithdrawalAdminListsFromInfluencersRoot(influencersVal: unknown): {
  pending: AdminWithdrawalQueueRow[];
  history: AdminWithdrawalHistoryRow[];
} {
  const pending: AdminWithdrawalQueueRow[] = [];
  const history: AdminWithdrawalHistoryRow[] = [];
  if (!influencersVal || typeof influencersVal !== 'object') {
    return { pending, history };
  }
  for (const [iid, inf] of Object.entries(influencersVal as Record<string, unknown>)) {
    if (!inf || typeof inf !== 'object') continue;
    const row = inf as Record<string, unknown>;
    const wraw = row.withdrawals;
    if (!wraw || typeof wraw !== 'object') continue;
    const fullName = String(row.fullName || '—');
    const email = String(row.email || '—');
    const phone = typeof row.phone === 'string' ? row.phone : undefined;
    const pp = row.payoutProfile as
      | {
          iban?: string;
          taxDocumentURL?: string;
          verificationStatus?: string;
          payoutAccountFullName?: string | null;
        }
      | undefined;
    const iban = (pp?.iban && String(pp.iban)) || '—';
    const taxDocumentURL = typeof pp?.taxDocumentURL === 'string' ? pp.taxDocumentURL : undefined;
    const payoutAccountFullNameRaw = pp?.payoutAccountFullName;
    const payoutAccountFullName =
      typeof payoutAccountFullNameRaw === 'string' && payoutAccountFullNameRaw.trim().length > 0
        ? payoutAccountFullNameRaw.trim()
        : undefined;

    for (const [wid, w] of Object.entries(wraw as Record<string, unknown>)) {
      if (!w || typeof w !== 'object') continue;
      const rec = w as WithdrawalRecord;
      if (rec.status === 'beklemede') {
        pending.push({
          withdrawalId: wid,
          influencerId: iid,
          fullName,
          payoutAccountFullName,
          email,
          phone,
          iban,
          amountGross: Number(rec.amountGross) || 0,
          platformFee: Number(rec.platformFee) || 0,
          amountNet: Number(rec.amountNet) || 0,
          createdAt: String(rec.createdAt || ''),
          taxDocumentURL,
        });
      } else if (rec.status === 'tamamlandı' || rec.status === 'iptal') {
        history.push({
          withdrawalId: wid,
          influencerId: iid,
          fullName,
          payoutAccountFullName,
          email,
          phone,
          iban,
          amountGross: Number(rec.amountGross) || 0,
          platformFee: Number(rec.platformFee) || 0,
          amountNet: Number(rec.amountNet) || 0,
          createdAt: String(rec.createdAt || ''),
          taxDocumentURL,
          status: rec.status,
          paidAt: rec.paidAt,
          processedByAdminUid: rec.processedByAdminUid,
          paymentReference: rec.paymentReference ?? null,
          updatedAt: rec.updatedAt,
        });
      }
    }
  }
  const sortByCreated = (a: { createdAt: string }, b: { createdAt: string }) =>
    (b.createdAt || '').localeCompare(a.createdAt || '');
  pending.sort(sortByCreated);
  history.sort((a, b) => (b.paidAt || b.updatedAt || b.createdAt || '').localeCompare(a.paidAt || a.updatedAt || a.createdAt || ''));
  return { pending, history: history.slice(0, 100) };
}
