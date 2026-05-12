import { get, ref } from 'firebase/database';
import { database } from '@/config/firebase';

/**
 * @see AdminPanel `PendingEmailRegistrationRow` — aynı şekil (Auth alanları sunucu olmadan doldurulmaz)
 */
export type RtdbPendingEmailRow = {
  uid: string;
  accountType: 'brand' | 'influencer';
  email: string;
  displayName: string;
  createdAt: string | null;
  emailVerificationSentAt: string | null;
  hasActiveVerificationCode: boolean;
  /** Sunucu (Admin API) yok — Firebase Auth eşleşmesi alınamadı */
  authEmail: null;
  emailVerified: boolean;
  authError?: 'backend_unavailable';
};

function pushTree(
  treeVal: unknown,
  accountType: 'brand' | 'influencer',
  items: RtdbPendingEmailRow[]
) {
  if (!treeVal || typeof treeVal !== 'object') return;
  for (const [uid, raw] of Object.entries(treeVal as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const d = raw as Record<string, unknown>;
    const emailRtdb = typeof d.email === 'string' ? d.email : '';
    const displayName =
      accountType === 'brand'
        ? (typeof d.brandName === 'string' ? d.brandName : '') || emailRtdb
        : (typeof d.fullName === 'string' ? d.fullName : '') || emailRtdb;
    items.push({
      uid,
      accountType,
      email: emailRtdb,
      displayName,
      createdAt: typeof d.createdAt === 'string' ? d.createdAt : null,
      emailVerificationSentAt:
        typeof d.emailVerificationSentAt === 'string' ? d.emailVerificationSentAt : null,
      hasActiveVerificationCode: !!(
        d.emailVerification && typeof d.emailVerification === 'object'
      ),
      authEmail: null,
      emailVerified: false,
      authError: 'backend_unavailable',
    });
  }
}

/**
 * Node API yokken e-posta bekleyen geçici kayıtlar — sadece RTDB.
 * `authEmail` / `emailVerified` sunucu tarafı Admin API ile doldurulur.
 */
export async function fetchPendingEmailRegistrationsFromRtdbOnly(): Promise<RtdbPendingEmailRow[]> {
  const [brandsSnap, influencersSnap] = await Promise.all([
    get(ref(database, 'geciciMarkalar')),
    get(ref(database, 'geciciInfluencerlar')),
  ]);

  const items: RtdbPendingEmailRow[] = [];
  if (brandsSnap.exists()) pushTree(brandsSnap.val(), 'brand', items);
  if (influencersSnap.exists()) pushTree(influencersSnap.val(), 'influencer', items);

  items.sort((a, b) => {
    const av = a.emailVerified ? 1 : 0;
    const bv = b.emailVerified ? 1 : 0;
    if (av !== bv) return av - bv;
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });

  return items;
}
