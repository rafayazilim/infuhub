import { useEffect, useMemo, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  getAuth,
} from 'firebase/auth';
import {
  Activity,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
  Target,
  Users,
  UserCheck,
  UserX,
  LineChart,
  LogOut,
  Wallet,
  Mail,
  MessageSquare,
  History,
  FileText,
  Handshake,
  TrendingUp,
  ArrowRight,
  Banknote,
} from 'lucide-react';
import { get, ref, update, set } from 'firebase/database';
import { auth, database, firebaseConfig } from '@/config/firebase';
import {
  adminApprovePayoutVerification,
  adminRejectPayoutVerification,
  buildWithdrawalAdminListsFromInfluencersRoot,
  markWithdrawalAsPaidByAdmin,
  type AdminWithdrawalHistoryRow,
  type AdminWithdrawalQueueRow,
  type PayoutVerificationRequest,
} from '@/services/firebaseInfluencerPayoutService';
import { isVerificationApproved, STATUS_ONAYLANDI } from '@/lib/verificationStatus';
import {
  normalizeInfluencerPlatformsToArray,
  sumPlatformFollowers,
} from '@/lib/influencerPlatforms';
import { isAudienceMatchComplete, type InfluencerAudienceMatch } from '@/lib/influencerAudienceMatch';
import { serverApiUrl } from '@/lib/serverApiUrl';
import type { BrandSorumlu } from '@/services/firebaseAuthService';
import {
  SUPPORT_MESSAGE_CATEGORIES,
  setSupportMessageReviewed,
  type SupportMessageRecord,
} from '@/services/firebaseSupportMessageService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminSystemActivityPanel } from '@/components/admin/AdminSystemActivityPanel';
import { getEffectiveCampaignStatus } from '@/services/firebaseCampaignService';
import type { FirebaseCampaign } from '@/services/firebaseCampaignService';
import { fetchPendingEmailRegistrationsFromRtdbOnly } from '@/services/firebaseAdminPendingRegistrationsService';
import { SUPPORT_CATEGORY_LABELS } from '@/services/firebaseSupportMessageService';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** Admin marka/influencer popup — açık arka plan (dark mode input lekesini önler) */
const ADMIN_POPUP_INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-[#08afd5] focus:outline-none focus:ring-1 focus:ring-[#08afd5]/30';

function sortBrandSorumluEntries(
  sorumlular: Record<string, BrandSorumlu> | undefined
): Array<{ key: string; data: BrandSorumlu }> {
  if (!sorumlular || typeof sorumlular !== 'object') return [];
  return Object.entries(sorumlular)
    .filter(([, v]) => v && typeof v === 'object')
    .map(([key, data]) => ({ key, data: data as BrandSorumlu }))
    .sort((a, b) => {
      if (a.key === 'birincil') return -1;
      if (b.key === 'birincil') return 1;
      return a.key.localeCompare(b.key);
    });
}

type DashboardOfferInsight = {
  total: number;
  beklemede: number;
  kabul: number;
  red: number;
  withContent: number;
  contentApproved: number;
};

type CampaignEffectiveStatus = 'aktif' | 'taslak' | 'tamamlandı' | 'iptal';
type DashboardCampaignStatusBreakdown = Record<CampaignEffectiveStatus, number>;
type DashboardRecentCampaign = {
  id: string;
  brandId: string;
  brandName: string;
  title: string;
  status: CampaignEffectiveStatus;
  updatedAt: string;
};

type BrandRecord = {
  id: string;
  brandName?: string;
  email?: string;
  createdAt?: string;
  status?: string;
  verificationRequestStatus?: string;
  verificationDocumentURL?: string;
  profilePhotoURL?: string;
  industry?: string;
  budget?: number;
  walletBalance?: number;
  walletLoadedTotal?: number;
  walletSpentTotal?: number;
  website?: string;
  campaignCount?: number;
  /** `brands/{id}/sorumlular` — iletişim sorumluları */
  sorumlular?: Record<string, BrandSorumlu>;
};

type InfluencerRecord = {
  id: string;
  fullName?: string;
  email?: string;
  createdAt?: string;
  phone?: string;
  status?: string;
  verificationRequestStatus?: string;
  verificationDocumentURL?: string;
  verificationPhotoURL?: string;
  profilePhotoURL?: string;
  platforms?: Array<{ id: string; username: string; followers: number }>;
  followersTotal?: number;
  audienceMatch?: Partial<InfluencerAudienceMatch> | null;
  payoutProfile?: {
    verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected' | string;
    verifiedAt?: string;
    submittedAt?: string;
  } | null;
};

type AdminRecord = {
  id: string;
  email?: string;
  createdAt?: string;
  createdBy?: string;
};

type VerificationRequest = {
  id?: string;
  userId?: string;
  userType?: string;
  email?: string;
  name?: string;
  documentURL?: string;
  status?: string;
  createdAt?: string;
  reviewedAt?: string;
  updatedAt?: string;
};

function registrationTime(value?: string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatRegistrationDate(value?: string | null): string {
  const t = registrationTime(value);
  if (!t) return 'Kayıt tarihi yok';
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(t));
}

function formatAdminPercent(value: number, total: number): string {
  if (!total) return '%0';
  return `%${Math.round((value / total) * 100)}`;
}

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseRegistrationDate(value?: string | null): Date | null {
  const t = registrationTime(value);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isBrandContactComplete(brand: BrandRecord): boolean {
  const brandName = Boolean(brand.brandName?.trim());
  const industry = Boolean(brand.industry?.trim());
  const website = Boolean(brand.website?.trim());
  const primary = brand.sorumlular?.birincil || Object.values(brand.sorumlular || {})[0];
  const contact =
    Boolean(primary?.firstName?.trim()) &&
    Boolean(primary?.lastName?.trim()) &&
    Boolean(primary?.title?.trim()) &&
    ((primary?.phone || '').replace(/\D/g, '').length >= 10);
  return brandName && industry && website && contact;
}

function ymdToBoundaryMs(value: string, boundary: 'start' | 'end'): number | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return null;
  const d =
    boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function isWithinRegistrationDateRange(
  createdAt: string | undefined,
  fromYmd: string,
  toYmd: string
): boolean {
  const from = ymdToBoundaryMs(fromYmd, 'start');
  const to = ymdToBoundaryMs(toYmd, 'end');
  if (from === null && to === null) return true;
  const t = registrationTime(createdAt);
  if (!t) return false;
  if (from !== null && t < from) return false;
  if (to !== null && t > to) return false;
  return true;
}

function sortNewestRegistrationFirst<T extends { createdAt?: string; id?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byTime = registrationTime(b.createdAt) - registrationTime(a.createdAt);
    if (byTime !== 0) return byTime;
    return String(b.id ?? '').localeCompare(String(a.id ?? ''), 'tr');
  });
}

function payoutVerificationLabel(status?: string): { text: string; ok: boolean; tone: string } {
  if (status === 'approved' || isVerificationApproved(status)) {
    return { text: 'Ödeme doğrulandı', ok: true, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  }
  if (status === 'pending' || status === 'beklemede') {
    return { text: 'Ödeme beklemede', ok: false, tone: 'bg-amber-50 text-amber-700 ring-amber-200' };
  }
  if (status === 'rejected' || status === 'reddedildi') {
    return { text: 'Ödeme reddedildi', ok: false, tone: 'bg-rose-50 text-rose-700 ring-rose-200' };
  }
  return { text: 'Ödeme yok', ok: false, tone: 'bg-slate-100 text-slate-600 ring-slate-200' };
}

/** RTDB `geciciMarkalar` / `geciciInfluencerlar` + Auth bilgisi (API: GET /api/admin/pending-email-registrations) */
type PendingEmailRegistrationRow = {
  uid: string;
  accountType: 'brand' | 'influencer';
  email: string;
  displayName: string;
  createdAt: string | null;
  emailVerificationSentAt: string | null;
  hasActiveVerificationCode: boolean;
  authEmail: string | null;
  emailVerified: boolean;
  authError?: string;
};

function resolveInfluencerVerificationDocUrl(
  inf: InfluencerRecord,
  requests: Record<string, VerificationRequest>
): string {
  const fromRequest = requests[inf.id]?.documentURL?.trim();
  if (fromRequest) return fromRequest;
  const doc = inf.verificationDocumentURL?.trim();
  if (doc) return doc;
  return inf.verificationPhotoURL?.trim() || '';
}

const getAdminCreatorAuth = () => {
  const existing = getApps().find((app) => app.name === 'adminCreator');
  const app = existing || initializeApp(firebaseConfig, 'adminCreator');
  return getAuth(app);
};


const sendInfluencerApprovedNotificationEmail = async (email: string, name: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Admin oturumu bulunamad\u0131. L\u00fctfen tekrar giri\u015f yap\u0131n.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(serverApiUrl('/api/admin/approve-influencer'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + idToken,
    },
    body: JSON.stringify({ email, name }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    if (response.status === 404) {
      throw new Error(
        'API bu isteği bulamadı (404). Backend sunucusunu son kodla yeniden başlatıp dağıtın; VITE_API_BASE_URL kök adres olmalı (sonunda /api olmamalı).'
      );
    }
    throw new Error(payload?.message || 'Onay maili g\u00f6nderilemedi.');
  }
};

const sendPayoutVerificationApprovedNotificationEmail = async (email: string, name: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Admin oturumu bulunamad\u0131. L\u00fctfen tekrar giri\u015f yap\u0131n.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(serverApiUrl('/api/admin/approve-payout-verification'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + idToken,
    },
    body: JSON.stringify({ email, name }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    if (response.status === 404) {
      throw new Error(
        'Ödeme doğrulama e-postası için API yolu bulunamadı (404). API sunucunuzu bu repodaki güncel server koduyla yeniden dağıtıp yeniden başlatın. Yerelde `server` içinde `node index.js` sürecini güncel kodla çalıştırdığınızdan emin olun.'
      );
    }
    throw new Error(payload?.message || '\u00d6deme do\u011frulama maili g\u00f6nderilemedi.');
  }
};

const sendBrandApprovedNotificationEmail = async (email: string, name: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Admin oturumu bulunamad\u0131. L\u00fctfen tekrar giri\u015f yap\u0131n.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(serverApiUrl('/api/admin/approve-brand'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + idToken,
    },
    body: JSON.stringify({ email, name }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    if (response.status === 404) {
      throw new Error(
        'Marka onay e-postası için API yolu bulunamadı (404). Sunucuyu güncel kodla yeniden başlatın.'
      );
    }
    throw new Error(payload?.message || 'Marka onay maili g\u00f6nderilemedi.');
  }
};

const sendProfileVerificationRejectedNotificationEmail = async (
  email: string,
  name: string,
  accountType: 'brand' | 'influencer'
) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Admin oturumu bulunamad\u0131. L\u00fctfen tekrar giri\u015f yap\u0131n.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(serverApiUrl('/api/admin/reject-profile-verification'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + idToken,
    },
    body: JSON.stringify({ email, name, accountType }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    if (response.status === 404) {
      throw new Error(
        'Red bilgilendirme e-postası için API yolu bulunamadı (404). Sunucuyu güncel kodla yeniden başlatın.'
      );
    }
    throw new Error(payload?.message || 'Red bilgilendirme maili g\u00f6nderilemedi.');
  }
};

const deleteAdminAccount = async (uid: string, accountType: 'brand' | 'influencer') => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Admin oturumu bulunamadı. Lütfen tekrar giriş yapın.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(serverApiUrl('/api/admin/delete-account'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + idToken,
    },
    body: JSON.stringify({ uid, accountType }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    if (response.status === 404) {
      throw new Error(
        'Kullanıcı silme API yolu bulunamadı (404). Backend sunucusunu güncel kodla yeniden başlatın.'
      );
    }
    throw new Error(payload?.message || 'Kullanıcı silinemedi.');
  }
};

const AdminPanel = () => {
  const [authReady, setAuthReady] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [influencers, setInfluencers] = useState<InfluencerRecord[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [brandRequests, setBrandRequests] = useState<Record<string, VerificationRequest>>({});
  const [influencerRequests, setInfluencerRequests] = useState<Record<string, VerificationRequest>>({});
  const [loadingData, setLoadingData] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminCreateError, setAdminCreateError] = useState('');
  const [adminCreateLoading, setAdminCreateLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<
    | 'dashboard'
    | 'systemActivity'
    | 'pendingEmailRegistrations'
    | 'brands'
    | 'influencers'
    | 'admins'
    | 'payoutVerifications'
    | 'payoutTransferRequests'
    | 'supportMessages'
  >('dashboard');
  const [payoutRequests, setPayoutRequests] = useState<Record<string, PayoutVerificationRequest>>({});
  const [withdrawalQueuePending, setWithdrawalQueuePending] = useState<AdminWithdrawalQueueRow[]>([]);
  const [withdrawalQueueHistory, setWithdrawalQueueHistory] = useState<AdminWithdrawalHistoryRow[]>([]);
  const [withdrawalDetailOpen, setWithdrawalDetailOpen] = useState<AdminWithdrawalQueueRow | null>(null);
  const [markPaidReference, setMarkPaidReference] = useState('');
  const [markPaidBusy, setMarkPaidBusy] = useState(false);
  const [profileStatusFilter, setProfileStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [registrationDateFrom, setRegistrationDateFrom] = useState('');
  const [registrationDateTo, setRegistrationDateTo] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<BrandRecord | null>(null);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerRecord | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [brandPage, setBrandPage] = useState(1);
  const [influencerPage, setInfluencerPage] = useState(1);
  const pageSize = 6;

  const [pendingEmailRows, setPendingEmailRows] = useState<PendingEmailRegistrationRow[]>([]);
  /** API kapalıyken RTDB yedek listesi; manuel doğrulama yine Node API ister */
  const [pendingEmailRtdbFallback, setPendingEmailRtdbFallback] = useState(false);
  const [loadingPendingEmail, setLoadingPendingEmail] = useState(false);
  const [verifyingUid, setVerifyingUid] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessageRecord[]>([]);
  const [supportCategoryFilter, setSupportCategoryFilter] = useState<string>('all');
  const [supportDetailOpen, setSupportDetailOpen] = useState<SupportMessageRecord | null>(null);
  const [supportReviewBusy, setSupportReviewBusy] = useState(false);

  const [offerInsight, setOfferInsight] = useState<DashboardOfferInsight>({
    total: 0,
    beklemede: 0,
    kabul: 0,
    red: 0,
    withContent: 0,
    contentApproved: 0,
  });
  const [campaignStatusBreakdown, setCampaignStatusBreakdown] = useState<DashboardCampaignStatusBreakdown>({
    aktif: 0,
    taslak: 0,
    tamamlandı: 0,
    iptal: 0,
  });
  const [recentCampaignsDash, setRecentCampaignsDash] = useState<DashboardRecentCampaign[]>([]);
  const [totalBrandWalletTry, setTotalBrandWalletTry] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthReady(true);
      if (!user) {
        setCurrentUid(null);
        setIsAdmin(false);
        return;
      }
      setCurrentUid(user.uid);
      const adminSnap = await get(ref(database, `admins/${user.uid}`));
      setIsAdmin(adminSnap.exists());
      if (!adminSnap.exists()) {
        await signOut(auth);
      }
    });
    return unsubscribe;
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [brandsSnap, influencersSnap, adminsSnap, requestsSnap, payoutSnap, offersSnap] = await Promise.all([
        get(ref(database, 'brands')),
        get(ref(database, 'influencers')),
        get(ref(database, 'admins')),
        get(ref(database, 'verificationRequests')),
        get(ref(database, 'payoutVerificationRequests/influencer')),
        get(ref(database, 'offers')),
      ]);

      let supportSnap: Awaited<ReturnType<typeof get>> | null = null;
      try {
        supportSnap = await get(ref(database, 'supportMessages'));
      } catch {
        supportSnap = null;
      }

      const brandList: BrandRecord[] = brandsSnap.exists()
        ? Object.values(brandsSnap.val()).map((b: any) => ({
            id: b.id,
            brandName: b.brandName,
            email: b.email,
            createdAt: b.createdAt,
            status: b.status,
            verificationRequestStatus: b.verificationRequestStatus,
            verificationDocumentURL: b.verificationDocumentURL,
            profilePhotoURL: b.profilePhotoURL,
            industry: b.industry,
            budget: b.budget,
            walletBalance: Math.round(Number(b.walletBalance) || 0),
            walletLoadedTotal: Math.round(Number(b.walletLoadedTotal) || 0),
            walletSpentTotal: Math.round(Number(b.walletSpentTotal) || 0),
            website: b.website,
            campaignCount: b.campaigns ? Object.keys(b.campaigns).length : 0,
            sorumlular:
              b.sorumlular && typeof b.sorumlular === 'object'
                ? (b.sorumlular as Record<string, BrandSorumlu>)
                : undefined,
          }))
        : [];

      const influencerList: InfluencerRecord[] = influencersSnap.exists()
        ? Object.values(influencersSnap.val()).map((i: any) => {
            const platforms = normalizeInfluencerPlatformsToArray(i.platforms);
            return {
              id: i.id,
              fullName: i.fullName,
              email: i.email,
              createdAt: i.createdAt,
              phone: typeof i.phone === 'string' ? i.phone : undefined,
              status: i.status,
              verificationRequestStatus: i.verificationRequestStatus,
              verificationDocumentURL: i.verificationDocumentURL,
              verificationPhotoURL: i.verificationPhotoURL,
	              profilePhotoURL: i.profilePhotoURL,
	              platforms,
	              followersTotal: sumPlatformFollowers(i.platforms),
	              audienceMatch:
	                i.audienceMatch && typeof i.audienceMatch === 'object'
	                  ? (i.audienceMatch as Partial<InfluencerAudienceMatch>)
	                  : null,
	              payoutProfile:
	                i.payoutProfile && typeof i.payoutProfile === 'object'
	                  ? {
	                      verificationStatus: i.payoutProfile.verificationStatus,
	                      verifiedAt: i.payoutProfile.verifiedAt,
	                      submittedAt: i.payoutProfile.submittedAt,
	                    }
	                  : null,
	            };
          })
        : [];

      const adminList: AdminRecord[] = adminsSnap.exists()
        ? Object.values(adminsSnap.val()).map((a: any) => ({
            id: a.id,
            email: a.email,
            createdAt: a.createdAt,
            createdBy: a.createdBy,
          }))
        : [];

      const requestsValue = requestsSnap.exists() ? requestsSnap.val() : {};
      const brandReqs = (requestsValue?.brand || {}) as Record<string, VerificationRequest>;
      const influencerReqs = (requestsValue?.influencer || {}) as Record<string, VerificationRequest>;

      setBrands(brandList);
      setInfluencers(influencerList);
      setAdmins(adminList);
      setBrandRequests(brandReqs);
      setInfluencerRequests(influencerReqs);
      setPayoutRequests(payoutSnap.exists() ? (payoutSnap.val() as Record<string, PayoutVerificationRequest>) : {});

      const wlists = buildWithdrawalAdminListsFromInfluencersRoot(
        influencersSnap.exists() ? influencersSnap.val() : null
      );
      setWithdrawalQueuePending(wlists.pending);
      setWithdrawalQueueHistory(wlists.history);

      const supportList: SupportMessageRecord[] = [];
      if (supportSnap && supportSnap.exists()) {
        const raw = supportSnap.val() as Record<string, Partial<SupportMessageRecord>>;
        for (const [id, row] of Object.entries(raw)) {
          if (!row || typeof row !== 'object') continue;
          supportList.push({
            id,
            category: String(row.category ?? ''),
            firstName: String(row.firstName ?? ''),
            lastName: String(row.lastName ?? ''),
            subject: String(row.subject ?? ''),
            email: String(row.email ?? ''),
            phone: String(row.phone ?? ''),
            message: String(row.message ?? ''),
            createdAt: String(row.createdAt ?? ''),
            senderUid:
              row.senderUid === null || row.senderUid === undefined ? null : String(row.senderUid),
            reviewed: typeof row.reviewed === 'boolean' ? row.reviewed : false,
            reviewedAt: typeof row.reviewedAt === 'string' ? row.reviewedAt : undefined,
            reviewedBy: typeof row.reviewedBy === 'string' ? row.reviewedBy : undefined,
          });
        }
      }
      supportList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setSupportMessages(supportList);

      const nextOfferInsight: DashboardOfferInsight = {
        total: 0,
        beklemede: 0,
        kabul: 0,
        red: 0,
        withContent: 0,
        contentApproved: 0,
      };
      if (offersSnap.exists()) {
        const offersVal = offersSnap.val() as Record<string, Record<string, unknown>>;
        for (const o of Object.values(offersVal)) {
          if (!o || typeof o !== 'object') continue;
          nextOfferInsight.total++;
          const st = o.status;
          if (st === 'beklemede') nextOfferInsight.beklemede++;
          else if (st === 'kabul') nextOfferInsight.kabul++;
          else if (st === 'red') nextOfferInsight.red++;
          if (o.contentLink) nextOfferInsight.withContent++;
          if (o.contentApproved === true) nextOfferInsight.contentApproved++;
        }
      }
      setOfferInsight(nextOfferInsight);

      const nextCamp: DashboardCampaignStatusBreakdown = {
        aktif: 0,
        taslak: 0,
        tamamlandı: 0,
        iptal: 0,
      };
      const recent: DashboardRecentCampaign[] = [];
      let walletSum = 0;
      if (brandsSnap.exists()) {
        const rawBrands = brandsSnap.val() as Record<string, Record<string, unknown>>;
        for (const [brandId, b] of Object.entries(rawBrands)) {
          if (!b || typeof b !== 'object') continue;
          walletSum += Math.round(Number(b.walletBalance) || 0);
          const brandName = typeof b.brandName === 'string' ? b.brandName : brandId;
          const camps = b.campaigns;
          if (!camps || typeof camps !== 'object') continue;
          for (const [cid, c] of Object.entries(camps as Record<string, unknown>)) {
            if (!c || typeof c !== 'object') continue;
            const camp = { ...(c as Record<string, unknown>), id: cid, brandId } as FirebaseCampaign;
            const eff = getEffectiveCampaignStatus(camp);
            nextCamp[eff]++;
            recent.push({
              id: cid,
              brandId,
              brandName,
              title:
                (typeof (c as { title?: string }).title === 'string' && (c as { title?: string }).title) ||
                (typeof (c as { campaignName?: string }).campaignName === 'string' &&
                  (c as { campaignName?: string }).campaignName) ||
                cid,
              status: eff,
              updatedAt:
                typeof (c as { updatedAt?: string }).updatedAt === 'string'
                  ? (c as { updatedAt: string }).updatedAt
                  : typeof (c as { createdAt?: string }).createdAt === 'string'
                    ? (c as { createdAt: string }).createdAt
                    : '',
            });
          }
        }
      }
      setCampaignStatusBreakdown(nextCamp);
      setTotalBrandWalletTry(walletSum);
      recent.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      setRecentCampaignsDash(recent.slice(0, 8));
    } finally {
      setLoadingData(false);
    }
  };

  const handleSupportMessageReviewed = async (messageId: string, reviewed: boolean) => {
    setSupportReviewBusy(true);
    try {
      await setSupportMessageReviewed(messageId, reviewed);
      await loadData();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'İşlem başarısız.');
    } finally {
      setSupportReviewBusy(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const handleLogin = async () => {
    setLoginError('');
    setLoadingLogin(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
    } catch (error: any) {
      console.error('Admin login error:', error);
      setLoginError(error?.code || error?.message || 'Giriş başarısız. Bilgileri kontrol et.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleCreateAdmin = async () => {
    setAdminCreateError('');
    setAdminCreateLoading(true);
    try {
      const adminAuth = getAdminCreatorAuth();
      const cred = await createUserWithEmailAndPassword(
        adminAuth,
        newAdminEmail.trim(),
        newAdminPassword
      );
      const now = new Date().toISOString();
      await set(ref(database, `admins/${cred.user.uid}`), {
        id: cred.user.uid,
        email: newAdminEmail.trim(),
        createdAt: now,
        createdBy: currentUid,
      });
      setNewAdminEmail('');
      setNewAdminPassword('');
      await loadData();
    } catch (error: any) {
      setAdminCreateError(error?.message || 'Admin eklenemedi.');
    } finally {
      setAdminCreateLoading(false);
    }
  };

  const handleApprove = async (type: 'brand' | 'influencer', id: string) => {
    try {
      if (type === 'influencer') {
        const inf = influencers.find((item) => item.id === id);
        if (inf && !resolveInfluencerVerificationDocUrl(inf, influencerRequests)) {
          window.alert(
            'Doğrulama belgesi veya doğrulama fotoğrafı yüklenmemiş influencer onaylanamaz. Önce kullanıcının belge yüklemesini bekleyin.'
          );
          return;
        }
      }

      const now = new Date().toISOString();
      const userPath = type === 'brand' ? ('brands/' + id) : ('influencers/' + id);
      const requestPath = 'verificationRequests/' + type + '/' + id;

      await Promise.all([
        update(ref(database, userPath), {
          status: STATUS_ONAYLANDI,
          verificationRequestStatus: STATUS_ONAYLANDI,
          updatedAt: now,
        }),
        update(ref(database, requestPath), {
          status: STATUS_ONAYLANDI,
          reviewedAt: now,
          updatedAt: now,
        }),
      ]);

      await loadData();

      if (type === 'brand') {
        const brand = brands.find((item) => item.id === id);
        const brandEmail = brand?.email?.trim();
        const brandName = brand?.brandName?.trim() || 'Marka';
        if (brandEmail) {
          try {
            await sendBrandApprovedNotificationEmail(brandEmail, brandName);
          } catch (mailErr: any) {
            window.alert(
              mailErr?.message ||
                'Onay kaydedildi fakat bilgilendirme e-postası gönderilemedi. SMTP veya ağı kontrol edin.'
            );
          }
        } else {
          window.alert('Marka onaylandı fakat kayıtlı e-posta bulunamadı; mail gönderilemedi.');
        }
        setSelectedBrand(null);
        return;
      }

      const influencer = influencers.find((item) => item.id === id);
      const influencerEmail = influencer?.email?.trim();
      const influencerName = influencer?.fullName?.trim() || 'Influencer';

      if (influencerEmail) {
        try {
          await sendInfluencerApprovedNotificationEmail(influencerEmail, influencerName);
        } catch (mailErr: any) {
          window.alert(
            mailErr?.message ||
              'Onay kaydedildi fakat bilgilendirme e-postası gönderilemedi. SMTP veya ağı kontrol edin.'
          );
        }
      } else {
        window.alert('Influencer onaylandı fakat kayıtlı e-posta bulunamadı; mail gönderilemedi.');
      }

      setSelectedInfluencer(null);
    } catch (error: any) {
      console.error('Onaylama hatası:', error);
      window.alert(error?.message || 'Onaylama işlemi sırasında bir hata oluştu.');
    }
  };

  const handleApprovePayout = async (influencerId: string) => {
    const reqSnapshot = payoutRequests[influencerId];
    try {
      await adminApprovePayoutVerification(influencerId);
      await loadData();

      const email = reqSnapshot?.email?.trim();
      const name =
        (reqSnapshot?.payoutAccountFullName && String(reqSnapshot.payoutAccountFullName).trim()) ||
        reqSnapshot?.fullName?.trim() ||
        'Influencer';
      if (email) {
        try {
          await sendPayoutVerificationApprovedNotificationEmail(email, name);
        } catch (mailErr: any) {
          window.alert(
            mailErr?.message ||
              'Onay kaydedildi fakat bilgilendirme e-postası gönderilemedi. SMTP veya ağı kontrol edin.'
          );
        }
      } else {
        window.alert('Ödeme doğrulaması onaylandı fakat kayıtlı e-posta bulunamadı; mail gönderilemedi.');
      }
    } catch (e: any) {
      window.alert(e?.message || 'Onaylanamadı');
    }
  };

  const handleRejectPayout = async (influencerId: string) => {
    const reason = window.prompt('Red nedeni (isteğe bağlı):') || undefined;
    try {
      await adminRejectPayoutVerification(influencerId, reason);
      await loadData();
    } catch (e: any) {
      window.alert(e?.message || 'Reddedilemedi');
    }
  };

  const handleMarkWithdrawalPaid = async () => {
    const row = withdrawalDetailOpen;
    if (!row) return;
    const eftName = row.payoutAccountFullName || row.fullName;
    const ok = window.confirm(
      `Havaleyi yaptığınızı onaylıyor musunuz?\n\nAlıcı: ${eftName}\nNet: ₺${row.amountNet.toLocaleString('tr-TR')}\nIBAN: ${row.iban}`
    );
    if (!ok) return;
    setMarkPaidBusy(true);
    try {
      await markWithdrawalAsPaidByAdmin(row.influencerId, row.withdrawalId, {
        paymentReference: markPaidReference.trim() || undefined,
      });
      setWithdrawalDetailOpen(null);
      setMarkPaidReference('');
      await loadData();
      window.alert('Kayıt güncellendi: ödeme tamamlandı (Firebase: influencers/.../withdrawals).');
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : 'İşlem başarısız.');
    } finally {
      setMarkPaidBusy(false);
    }
  };

  const handleReject = async (type: 'brand' | 'influencer', id: string) => {
    try {
      const now = new Date().toISOString();
      const userPath = type === 'brand' ? `brands/${id}` : `influencers/${id}`;
      const requestPath = `verificationRequests/${type}/${id}`;

      await Promise.all([
        update(ref(database, userPath), {
          status: 'reddedildi',
          verificationRequestStatus: 'reddedildi',
          updatedAt: now,
        }),
        update(ref(database, requestPath), {
          status: 'reddedildi',
          reviewedAt: now,
          updatedAt: now,
        }),
      ]);
      await loadData();

      if (type === 'brand') {
        const brand = brands.find((item) => item.id === id);
        const brandEmail = brand?.email?.trim();
        const brandName = brand?.brandName?.trim() || 'Marka';
        if (brandEmail) {
          try {
            await sendProfileVerificationRejectedNotificationEmail(brandEmail, brandName, 'brand');
          } catch (mailErr: any) {
            window.alert(
              mailErr?.message ||
                'Red kaydedildi fakat bilgilendirme e-postası gönderilemedi. SMTP veya ağı kontrol edin.'
            );
          }
        } else {
          window.alert('Red kaydedildi fakat kayıtlı e-posta bulunamadı; mail gönderilemedi.');
        }
        setSelectedBrand(null);
        return;
      }

      const influencer = influencers.find((item) => item.id === id);
      const influencerEmail = influencer?.email?.trim();
      const influencerName = influencer?.fullName?.trim() || 'Influencer';
      if (influencerEmail) {
        try {
          await sendProfileVerificationRejectedNotificationEmail(influencerEmail, influencerName, 'influencer');
        } catch (mailErr: any) {
          window.alert(
            mailErr?.message ||
              'Red kaydedildi fakat bilgilendirme e-postası gönderilemedi. SMTP veya ağı kontrol edin.'
          );
        }
      } else {
        window.alert('Red kaydedildi fakat kayıtlı e-posta bulunamadı; mail gönderilemedi.');
      }

      setSelectedInfluencer(null);
    } catch (error: any) {
      console.error('Reddetme hatası:', error);
      window.alert(error?.message || 'Red işlemi sırasında bir hata oluştu.');
    }
  };

  const handleUpdateBrand = async (brand: BrandRecord) => {
    await update(ref(database, `brands/${brand.id}`), {
      brandName: brand.brandName || '',
      industry: brand.industry || '',
      budget: typeof brand.budget === 'number' ? brand.budget : 0,
      website: brand.website || '',
      updatedAt: new Date().toISOString(),
    });
    await loadData();
  };

  const handleUpdateInfluencer = async (inf: InfluencerRecord) => {
    const platforms = normalizeInfluencerPlatformsToArray(inf.platforms);
    await update(ref(database, `influencers/${inf.id}`), {
      fullName: inf.fullName || '',
      phone: typeof inf.phone === 'string' ? inf.phone.trim() : '',
      platforms,
      updatedAt: new Date().toISOString(),
    });
    await loadData();
  };

  const handleDeleteInfluencer = async (inf: InfluencerRecord) => {
    const confirmed = window.confirm(
      `Bu influencer sistemden kalıcı olarak silinsin mi?\n\n${inf.fullName || inf.email || inf.id}\n\n` +
        'RTDB kaydı ve Firebase Authentication kullanıcısı silinir. Geri alınamaz.'
    );
    if (!confirmed) return;
    try {
      await deleteAdminAccount(inf.id, 'influencer');
      if (selectedInfluencer?.id === inf.id) setSelectedInfluencer(null);
      await loadData();
    } catch (error: unknown) {
      console.error('Influencer silinemedi:', error);
      window.alert(error instanceof Error ? error.message : 'Influencer silinirken bir hata oluştu.');
    }
  };

  const handleDeleteBrand = async (brand: BrandRecord) => {
    const confirmed = window.confirm(
      `Bu marka sistemden kalıcı olarak silinsin mi?\n\n${brand.brandName || brand.email || brand.id}\n\n` +
        'RTDB kaydı ve Firebase Authentication kullanıcısı silinir. Geri alınamaz.'
    );
    if (!confirmed) return;
    try {
      await deleteAdminAccount(brand.id, 'brand');
      if (selectedBrand?.id === brand.id) setSelectedBrand(null);
      await loadData();
    } catch (error: unknown) {
      console.error('Marka silinemedi:', error);
      window.alert(error instanceof Error ? error.message : 'Marka silinirken bir hata oluştu.');
    }
  };

  const loadPendingEmailRegistrations = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      window.alert('Oturum bulunamadı.');
      return;
    }
    setLoadingPendingEmail(true);
    setPendingEmailRtdbFallback(false);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(serverApiUrl('/api/admin/pending-email-registrations'), {
        headers: { Authorization: 'Bearer ' + idToken },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message ||
            (response.status === 404
              ? 'API bulunamadı (404). Sunucuyu güncel kodla yeniden başlatın.'
              : 'Liste yüklenemedi.')
        );
      }
      setPendingEmailRows(Array.isArray(payload.items) ? payload.items : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const isNetwork =
        e instanceof TypeError ||
        /failed to fetch|networkerror|load failed|connection refused|fetch/i.test(msg);
      if (isNetwork) {
        try {
          const rows = await fetchPendingEmailRegistrationsFromRtdbOnly();
          setPendingEmailRows(rows as PendingEmailRegistrationRow[]);
          setPendingEmailRtdbFallback(true);
        } catch (rtdbErr) {
          window.alert(
            e instanceof Error
              ? `${e.message}\n\nRTDB yedek okuması da başarısız: ${rtdbErr instanceof Error ? rtdbErr.message : 'Bilinmeyen hata'}`
              : 'Liste yüklenemedi.'
          );
        }
        return;
      }
      window.alert(e instanceof Error ? e.message : 'Liste yüklenemedi.');
    } finally {
      setLoadingPendingEmail(false);
    }
  };

  const handleManualVerifyRegistrationEmail = async (row: PendingEmailRegistrationRow) => {
    const confirmed = window.confirm(
      `Bu kayıt için e-posta manuel doğrulanacak ve profil verisi brands/influencers altına taşınacak.\n\n` +
        `${row.displayName || row.email}\n${row.uid}\n\nDevam edilsin mi?`
    );
    if (!confirmed) return;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      window.alert('Oturum bulunamadı.');
      return;
    }
    setVerifyingUid(row.uid);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(serverApiUrl('/api/admin/manual-verify-registration-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + idToken,
        },
        body: JSON.stringify({ uid: row.uid }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message ||
            (response.status === 404
              ? 'API bulunamadı (404). Sunucuyu güncel kodla yeniden başlatın.'
              : 'İşlem başarısız.')
        );
      }
      setPendingEmailRows((prev) => prev.filter((r) => r.uid !== row.uid));
      await loadData();
      window.alert(payload?.message || 'E-posta doğrulandı. Kayıt ana tabloya taşındı.');
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : 'İşlem başarısız.');
    } finally {
      setVerifyingUid(null);
    }
  };

  const isApproved = isVerificationApproved;

  const currentAdmin = useMemo(() => {
    if (!currentUid) return null;
    return admins.find((a) => a.id === currentUid) || null;
  }, [admins, currentUid]);

  const pendingPayoutVerifications = useMemo(
    () => Object.entries(payoutRequests).filter(([, r]) => r.status === 'beklemede'),
    [payoutRequests]
  );

  const brandDoc = selectedBrand
    ? brandRequests[selectedBrand.id]?.documentURL || selectedBrand.verificationDocumentURL
    : '';
  const influencerDoc = selectedInfluencer
    ? influencerRequests[selectedInfluencer.id]?.documentURL ||
      selectedInfluencer.verificationDocumentURL ||
      selectedInfluencer.verificationPhotoURL
    : '';

	  const selectedInfluencerHasVerificationDoc = useMemo(() => {
	    if (!selectedInfluencer) return false;
	    return Boolean(resolveInfluencerVerificationDocUrl(selectedInfluencer, influencerRequests));
	  }, [selectedInfluencer, influencerRequests]);
	  const selectedInfluencerAudienceComplete = selectedInfluencer
	    ? isAudienceMatchComplete(selectedInfluencer)
	    : false;
	  const selectedInfluencerPayoutStatus = selectedInfluencer
	    ? payoutVerificationLabel(selectedInfluencer.payoutProfile?.verificationStatus)
	    : null;

  const metrics = useMemo(() => {
    const pendingCount =
      brands.filter((b) => !isApproved(b.status)).length +
      influencers.filter((i) => !isApproved(i.status)).length;
    const totalCampaigns = brands.reduce((sum, b) => sum + (b.campaignCount ?? 0), 0);
    const totalFollowers = influencers.reduce((sum, i) => sum + (i.followersTotal ?? 0), 0);
    return [
      { label: 'Toplam Marka', value: brands.length, icon: Building2 },
      { label: 'Toplam Influencer', value: influencers.length, icon: Users },
      { label: 'Onay Bekleyen', value: pendingCount, icon: UserX },
      { label: 'Toplam Admin', value: admins.length, icon: ShieldCheck },
      { label: 'Onaylı Marka', value: brands.filter((b) => isApproved(b.status)).length, icon: UserCheck },
      { label: 'Onaylı Influencer', value: influencers.filter((i) => isApproved(i.status)).length, icon: Target },
      { label: 'Toplam Kampanya', value: totalCampaigns, icon: BarChart3 },
      { label: 'Toplam Takipçi', value: totalFollowers, icon: Activity },
    ];
  }, [admins.length, brands, influencers]);

  const platformTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    influencers.forEach((inf) => {
      (inf.platforms || []).forEach((p) => {
        const key = String(p.id || 'unknown');
        totals[key] = (totals[key] || 0) + (Number(p.followers) || 0);
      });
    });
    return Object.entries(totals)
      .map(([platform, total]) => ({ platform, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [influencers]);

  const dashboardAnalytics = useMemo(() => {
    const brandTotal = brands.length;
    const influencerTotal = influencers.length;
    const totalAccounts = brandTotal + influencerTotal;
    const brandVerified = brands.filter((b) => isApproved(b.status)).length;
    const influencerVerified = influencers.filter((i) => isApproved(i.status)).length;
    const brandLogo = brands.filter((b) => Boolean(b.profilePhotoURL)).length;
    const influencerPhoto = influencers.filter((i) => Boolean(i.profilePhotoURL)).length;
    const brandDocUploaded = brands.filter((b) => Boolean(b.verificationDocumentURL || brandRequests[b.id]?.documentURL)).length;
    const influencerDocUploaded = influencers.filter((i) =>
      Boolean(resolveInfluencerVerificationDocUrl(i, influencerRequests))
    ).length;
    const influencerSurvey = influencers.filter((i) => isAudienceMatchComplete(i)).length;
    const payoutSubmitted = influencers.filter((i) => {
      const p = i.payoutProfile;
      const req = payoutRequests[i.id];
      return Boolean(
        p?.submittedAt ||
          p?.verifiedAt ||
          (p?.verificationStatus && p.verificationStatus !== 'none') ||
          req
      );
    }).length;
    const payoutApproved = influencers.filter((i) => i.payoutProfile?.verificationStatus === 'approved').length;
    const brandProfileComplete = brands.filter(isBrandContactComplete).length;
    const platformConnected = influencers.filter((i) => (i.platforms || []).length > 0).length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const daysAgo7 = new Date(todayStart);
    daysAgo7.setDate(daysAgo7.getDate() - 6);
    const daysAgo30 = new Date(todayStart);
    daysAgo30.setDate(daysAgo30.getDate() - 29);
    const registeredAfter = (value: string | undefined, from: Date) => {
      const d = parseRegistrationDate(value);
      return d ? d.getTime() >= from.getTime() : false;
    };
    const new7 =
      brands.filter((b) => registeredAfter(b.createdAt, daysAgo7)).length +
      influencers.filter((i) => registeredAfter(i.createdAt, daysAgo7)).length;
    const new30 =
      brands.filter((b) => registeredAfter(b.createdAt, daysAgo30)).length +
      influencers.filter((i) => registeredAfter(i.createdAt, daysAgo30)).length;

    const registrationTrend = Array.from({ length: 14 }, (_, idx) => {
      const d = new Date(todayStart);
      d.setDate(todayStart.getDate() - (13 - idx));
      return {
        key: localDayKey(d),
        label: d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
        Marka: 0,
        Influencer: 0,
      };
    });
    const trendByKey = new Map(registrationTrend.map((row) => [row.key, row]));
    brands.forEach((b) => {
      const d = parseRegistrationDate(b.createdAt);
      if (!d) return;
      const row = trendByKey.get(localDayKey(d));
      if (row) row.Marka += 1;
    });
    influencers.forEach((i) => {
      const d = parseRegistrationDate(i.createdAt);
      if (!d) return;
      const row = trendByKey.get(localDayKey(d));
      if (row) row.Influencer += 1;
    });

    const accountFunnel = [
      {
        step: 'Kayıt',
        Marka: brandTotal,
        Influencer: influencerTotal,
      },
      {
        step: 'Belge',
        Marka: brandDocUploaded,
        Influencer: influencerDocUploaded,
      },
      {
        step: 'Profil foto',
        Marka: brandLogo,
        Influencer: influencerPhoto,
      },
      {
        step: 'Profil onay',
        Marka: brandVerified,
        Influencer: influencerVerified,
      },
    ];

    const influencerReadiness = [
      { label: 'Profil fotoğrafı', value: influencerPhoto, total: influencerTotal, color: 'bg-[#08afd5]' },
      { label: 'Profil doğrulama', value: influencerVerified, total: influencerTotal, color: 'bg-emerald-500' },
      { label: 'Ödeme belgesi', value: payoutSubmitted, total: influencerTotal, color: 'bg-indigo-500' },
      { label: 'Ödeme onayı', value: payoutApproved, total: influencerTotal, color: 'bg-violet-500' },
      { label: 'Anket', value: influencerSurvey, total: influencerTotal, color: 'bg-pink-500' },
      { label: 'Sosyal hesap', value: platformConnected, total: influencerTotal, color: 'bg-amber-500' },
    ];

    const brandReadiness = [
      { label: 'Logo', value: brandLogo, total: brandTotal, color: 'bg-[#08afd5]' },
      { label: 'Belge yükleme', value: brandDocUploaded, total: brandTotal, color: 'bg-indigo-500' },
      { label: 'Profil onayı', value: brandVerified, total: brandTotal, color: 'bg-emerald-500' },
      { label: 'Yetkili bilgileri', value: brandProfileComplete, total: brandTotal, color: 'bg-amber-500' },
      { label: 'Kampanyası var', value: brands.filter((b) => (b.campaignCount || 0) > 0).length, total: brandTotal, color: 'bg-pink-500' },
    ];

    return {
      totalAccounts,
      brandTotal,
      influencerTotal,
      brandVerified,
      influencerVerified,
      brandLogo,
      influencerPhoto,
      brandDocUploaded,
      influencerDocUploaded,
      influencerSurvey,
      payoutSubmitted,
      payoutApproved,
      brandProfileComplete,
      platformConnected,
      new7,
      new30,
      registrationTrend,
      accountFunnel,
      influencerReadiness,
      brandReadiness,
      pendingBrandVerification: brandTotal - brandVerified,
      pendingInfluencerVerification: influencerTotal - influencerVerified,
    };
  }, [brands, influencers, brandRequests, influencerRequests, payoutRequests, isApproved]);

  const unreviewedSupportCount = useMemo(
    () => supportMessages.filter((m) => !m.reviewed).length,
    [supportMessages]
  );

  const sparkline = (value: number) => {
    const base = Math.max(1, Number(value) || 1);
    const points = [
      base * 0.6,
      base * 0.75,
      base * 0.9,
      base * 0.8,
      base * 1.0,
      base * 0.95,
    ];
    const max = Math.max(...points);
    const min = Math.min(...points);
    return points.map((p) => (max === min ? 50 : 100 - ((p - min) / (max - min)) * 80));
  };

  const filteredBrands = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sortNewestRegistrationFirst(
      brands
      .filter((b) =>
        profileStatusFilter === 'approved'
          ? isApproved(b.status)
          : profileStatusFilter === 'pending'
            ? !isApproved(b.status)
            : true
      )
      .filter((b) =>
        isWithinRegistrationDateRange(b.createdAt, registrationDateFrom, registrationDateTo)
      )
      .filter(
      (b) =>
        b.brandName?.toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q) ||
        b.id?.toLowerCase().includes(q)
      )
    );
  }, [brands, searchQuery, profileStatusFilter, registrationDateFrom, registrationDateTo]);

  const filteredInfluencers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sortNewestRegistrationFirst(
      influencers
      .filter((i) =>
        profileStatusFilter === 'approved'
          ? isApproved(i.status)
          : profileStatusFilter === 'pending'
            ? !isApproved(i.status)
            : true
      )
      .filter((i) =>
        isWithinRegistrationDateRange(i.createdAt, registrationDateFrom, registrationDateTo)
      )
      .filter(
      (i) =>
        i.fullName?.toLowerCase().includes(q) ||
        i.email?.toLowerCase().includes(q) ||
        i.id?.toLowerCase().includes(q)
      )
    );
  }, [influencers, searchQuery, profileStatusFilter, registrationDateFrom, registrationDateTo]);

  const filteredSupportMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return supportMessages.filter((m) => {
      if (supportCategoryFilter !== 'all' && m.category !== supportCategoryFilter) return false;
      if (!q) return true;
      return (
        m.email.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q) ||
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.senderUid && m.senderUid.toLowerCase().includes(q))
      );
    });
  }, [supportMessages, searchQuery, supportCategoryFilter]);

  useEffect(() => {
    setSupportDetailOpen((prev) => {
      if (!prev) return null;
      const u = supportMessages.find((m) => m.id === prev.id);
      return u ?? prev;
    });
  }, [supportMessages]);

  const brandPageCount = Math.max(1, Math.ceil(filteredBrands.length / pageSize));
  const influencerPageCount = Math.max(1, Math.ceil(filteredInfluencers.length / pageSize));
  const pagedBrands = filteredBrands.slice((brandPage - 1) * pageSize, brandPage * pageSize);
  const pagedInfluencers = filteredInfluencers.slice((influencerPage - 1) * pageSize, influencerPage * pageSize);

  useEffect(() => {
    setBrandPage(1);
    setInfluencerPage(1);
  }, [searchQuery, profileStatusFilter, registrationDateFrom, registrationDateTo, activeSection]);

  useEffect(() => {
    setBrandPage((prev) => Math.min(prev, brandPageCount));
  }, [brandPageCount]);

  useEffect(() => {
    setInfluencerPage((prev) => Math.min(prev, influencerPageCount));
  }, [influencerPageCount]);

  useEffect(() => {
    if (!isAdmin || activeSection !== 'pendingEmailRegistrations') return;
    void loadPendingEmailRegistrations();
    // loadPendingEmailRegistrations yalnızca sekme açılınca tetiklenmeli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeSection]);

  if (!authReady) {
    return <div className="p-8">Yükleniyor...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6">
          <h1 className="text-xl font-semibold mb-4">Admin Girişi</h1>
          <label className="block text-sm text-gray-600 mb-1">Admin E-posta</label>
          <input
            className="w-full border rounded-lg px-3 py-2 mb-3"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            type="email"
          />
          <label className="block text-sm text-gray-600 mb-1">Şifre</label>
          <input
            className="w-full border rounded-lg px-3 py-2 mb-4"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            type="password"
          />
          {loginError && <p className="text-sm text-red-600 mb-3">{loginError}</p>}
          <button
            className="w-full bg-black text-white rounded-lg py-2 disabled:opacity-60"
            onClick={handleLogin}
            disabled={loadingLogin}
          >
            {loadingLogin ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full min-w-0 bg-slate-950 text-slate-100">
      <div className="flex w-full min-w-0 min-h-0 items-stretch">
        <aside
          className={`sticky top-0 z-30 h-dvh min-h-0 self-start shrink-0 border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 flex flex-col p-6 transition-all duration-300 ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          <div className="shrink-0 mb-6">
            {!sidebarCollapsed && (
              <div className="mb-8">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Infuhub</div>
                <h1 className="text-xl font-semibold">Admin Yönetim</h1>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="mb-6 w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 mx-auto">
                IH
              </div>
            )}

            {!sidebarCollapsed && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">Giriş Yapan Admin</div>
                <div className="text-sm font-semibold text-slate-100">
                  {currentAdmin?.email || currentUid || 'Bilinmiyor'}
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 flex flex-col overflow-y-auto overflow-x-hidden -mr-1 pr-1 pb-1 [scrollbar-gutter:stable]">
            <div className={`space-y-2 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
              {[
                { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
                { id: 'systemActivity', label: 'Sistem Hareketleri', icon: History },
                {
                  id: 'pendingEmailRegistrations',
                  label: 'E-posta doğrulama bekleyenler',
                  icon: Mail,
                },
                { id: 'supportMessages', label: 'Destek mesajları', icon: MessageSquare },
                { id: 'brands', label: 'Markalar', icon: Building2 },
                { id: 'influencers', label: 'Influencerlar', icon: Users },
                { id: 'payoutVerifications', label: 'Ödeme doğrulamaları', icon: Wallet },
                { id: 'payoutTransferRequests', label: 'Ödeme talepleri', icon: Banknote },
                { id: 'admins', label: 'Adminler', icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                const payoutBadge =
                  item.id === 'payoutVerifications' && pendingPayoutVerifications.length > 0
                    ? pendingPayoutVerifications.length
                    : item.id === 'payoutTransferRequests' && withdrawalQueuePending.length > 0
                      ? withdrawalQueuePending.length
                      : null;
                return (
                  <button
                    key={item.id}
                    onClick={() =>
                      setActiveSection(
                        item.id as
                          | 'dashboard'
                          | 'systemActivity'
                          | 'pendingEmailRegistrations'
                          | 'supportMessages'
                          | 'brands'
                          | 'influencers'
                          | 'admins'
                          | 'payoutVerifications'
                          | 'payoutTransferRequests'
                      )
                    }
                    className={`text-sm transition flex items-center gap-3 ${
                      sidebarCollapsed
                        ? 'w-12 h-12 rounded-full justify-center mx-auto relative'
                        : 'w-full rounded-xl px-4 py-3 text-left'
                    } ${
                      activeSection === item.id
                        ? 'bg-[#08afd5]/20 text-[#6edff3] shadow-[inset_0_0_0_1px_rgba(110,223,243,0.4)]'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="relative inline-flex">
                      <Icon size={18} />
                      {sidebarCollapsed && payoutBadge !== null && (
                        <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-amber-500 text-[10px] text-slate-950 font-bold flex items-center justify-center">
                          {payoutBadge}
                        </span>
                      )}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="flex items-center justify-between flex-1 gap-2 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {payoutBadge !== null && (
                          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/90 text-slate-950 font-semibold">
                            {payoutBadge}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {!sidebarCollapsed && (
              <div className="mt-8">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-3">Admin Listesi</div>
                <div className="space-y-2 text-sm text-slate-300">
                  {admins.map((adminItem) => (
                    <div
                      key={adminItem.id}
                      className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2 gap-2"
                    >
                      <span className="truncate min-w-0">{adminItem.email || adminItem.id}</span>
                      {adminItem.id === currentUid && (
                        <span className="shrink-0 text-[10px] uppercase text-[#6edff3]">Sen</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            className={`shrink-0 pt-4 mt-3 border-t border-slate-800/80 space-y-3 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}
          >
            <button
              className={`border border-slate-800 text-slate-200 hover:bg-slate-900 flex items-center justify-center gap-2 transition ${
                sidebarCollapsed ? 'w-12 h-12 rounded-full mx-auto' : 'w-full rounded-xl px-4 py-2'
              }`}
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              title={sidebarCollapsed ? 'Menüyü Aç' : 'Menüyü Kapat'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              {!sidebarCollapsed && <span>Menüyü Kapat</span>}
            </button>

            <button
              className={`border border-slate-800 text-slate-200 hover:bg-slate-900 flex items-center justify-center gap-2 transition ${
                sidebarCollapsed ? 'w-12 h-12 rounded-full mx-auto' : 'w-full rounded-xl px-4 py-2'
              }`}
              onClick={() => signOut(auth)}
              title={sidebarCollapsed ? 'Çıkış Yap' : undefined}
            >
              {!sidebarCollapsed && <span>Çıkış Yap</span>}
              {sidebarCollapsed && (
                <span className="inline-flex" aria-hidden>
                  <LogOut size={16} />
                </span>
              )}
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 w-full min-h-screen bg-slate-50 text-slate-900">
          <div className="border-b border-slate-200 bg-white/70 px-8 py-6 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Kontrol Merkezi</div>
                <h2 className="text-2xl font-semibold">Infuhub Yönetim Paneli</h2>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <input
                  className="w-full min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#08afd5]/40"
                  placeholder="İsim / e-posta / ID ara"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {(activeSection === 'brands' || activeSection === 'influencers') && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">Kayıt tarihi</span>
                    <input
                      type="date"
                      aria-label="Kayıt başlangıç tarihi"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[#08afd5]/35"
                      value={registrationDateFrom}
                      onChange={(e) => setRegistrationDateFrom(e.target.value)}
                    />
                    <span className="text-xs text-slate-400">-</span>
                    <input
                      type="date"
                      aria-label="Kayıt bitiş tarihi"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[#08afd5]/35"
                      value={registrationDateTo}
                      onChange={(e) => setRegistrationDateTo(e.target.value)}
                    />
                    {(registrationDateFrom || registrationDateTo) && (
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-xs font-medium text-[#08afd5] hover:bg-[#08afd5]/10"
                        onClick={() => {
                          setRegistrationDateFrom('');
                          setRegistrationDateTo('');
                        }}
                      >
                        Sıfırla
                      </button>
                    )}
                  </div>
                )}
                {(activeSection === 'brands' || activeSection === 'influencers') && (
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    {(
                      [
                        ['all', 'Tümü'],
                        ['pending', 'Onay Bekleyen'],
                        ['approved', 'Onaylı'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`rounded-lg px-3 py-1.5 text-sm transition ${
                          profileStatusFilter === value
                            ? 'bg-[#08afd5]/10 text-[#08afd5] shadow-[inset_0_0_0_1px_rgba(8,175,213,0.35)]'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setProfileStatusFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {activeSection === 'systemActivity' && <AdminSystemActivityPanel />}

            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                {loadingData && (
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full border-2 border-[#08afd5] border-t-transparent animate-spin"
                      aria-hidden
                    />
                    Veriler senkronize ediliyor…
                  </p>
                )}

                {(unreviewedSupportCount > 0 || pendingPayoutVerifications.length > 0) && (
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                    <span className="font-medium">Dikkat:</span>
                    {unreviewedSupportCount > 0 && (
                      <span>
                        {unreviewedSupportCount} destek mesajı incelenmeyi bekliyor.
                      </span>
                    )}
                    {pendingPayoutVerifications.length > 0 && (
                      <span>
                        {unreviewedSupportCount > 0 ? ' · ' : ''}
                        {pendingPayoutVerifications.length} ödeme doğrulama talebi beklemede.
                      </span>
                    )}
                  </div>
                )}

                <div className="rounded-[28px] border border-slate-800 bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Yönetim özeti</div>
                      <h2 className="mt-2 text-2xl font-semibold">Kayıt, doğrulama ve hazır olma durumu</h2>
                      <p className="mt-1 max-w-3xl text-sm text-slate-400">
                        Marka ve influencer kayıtlarının onboarding kalitesi, profil doğrulama, ödeme doğrulama,
                        profil fotoğrafı, anket ve sosyal hesap tamamlanma oranları.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="text-2xl font-bold tabular-nums">{dashboardAnalytics.totalAccounts}</div>
                        <div className="text-[11px] text-slate-400">Toplam kayıt</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="text-2xl font-bold tabular-nums">{dashboardAnalytics.new7}</div>
                        <div className="text-[11px] text-slate-400">Son 7 gün</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="text-2xl font-bold tabular-nums">{dashboardAnalytics.new30}</div>
                        <div className="text-[11px] text-slate-400">Son 30 gün</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: 'Marka profil onayı',
                        value: dashboardAnalytics.brandVerified,
                        total: dashboardAnalytics.brandTotal,
                        sub: `${dashboardAnalytics.pendingBrandVerification} onay bekliyor`,
                        icon: Building2,
                      },
                      {
                        label: 'Influencer profil onayı',
                        value: dashboardAnalytics.influencerVerified,
                        total: dashboardAnalytics.influencerTotal,
                        sub: `${dashboardAnalytics.pendingInfluencerVerification} onay bekliyor`,
                        icon: UserCheck,
                      },
                      {
                        label: 'Ödeme belgesi yükleyen',
                        value: dashboardAnalytics.payoutSubmitted,
                        total: dashboardAnalytics.influencerTotal,
                        sub: `${dashboardAnalytics.payoutApproved} ödeme onaylı`,
                        icon: Wallet,
                      },
                      {
                        label: 'Anketi tamamlayan',
                        value: dashboardAnalytics.influencerSurvey,
                        total: dashboardAnalytics.influencerTotal,
                        sub: 'Influencer kitle eşleşmesi',
                        icon: Target,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const pct = item.total ? Math.round((item.value / item.total) * 100) : 0;
                      return (
                        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs text-slate-400">{item.label}</div>
                              <div className="mt-1 text-2xl font-semibold tabular-nums">
                                {item.value}/{item.total}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">{item.sub}</div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                              <Icon size={18} />
                            </div>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#08afd5] to-[#e3447c]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-1 text-right text-[11px] text-slate-400">%{pct}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase text-slate-400">Kayıt trendi</div>
                        <div className="text-lg font-semibold text-slate-900">Son 14 gün marka / influencer</div>
                      </div>
                      <Activity size={18} className="text-slate-400" />
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardAnalytics.registrationTrend}>
                          <defs>
                            <linearGradient id="adminBrandTrend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#08afd5" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#08afd5" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="adminInfluencerTrend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e3447c" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#e3447c" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <Tooltip />
                          <Area type="monotone" dataKey="Marka" stroke="#08afd5" fill="url(#adminBrandTrend)" strokeWidth={2} />
                          <Area type="monotone" dataKey="Influencer" stroke="#e3447c" fill="url(#adminInfluencerTrend)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase text-slate-400">Onboarding hunisi</div>
                        <div className="text-lg font-semibold text-slate-900">Kayıttan onaya ilerleme</div>
                      </div>
                      <BarChart3 size={18} className="text-slate-400" />
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardAnalytics.accountFunnel}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <Tooltip />
                          <Bar dataKey="Marka" fill="#08afd5" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="Influencer" fill="#e3447c" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[
                    { title: 'Influencer hazır olma kontrolü', rows: dashboardAnalytics.influencerReadiness },
                    { title: 'Marka hazır olma kontrolü', rows: dashboardAnalytics.brandReadiness },
                  ].map((section) => (
                    <div key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 text-lg font-semibold text-slate-900">{section.title}</div>
                      <div className="space-y-3">
                        {section.rows.map((row) => {
                          const width = row.total ? Math.min(100, (row.value / row.total) * 100) : 0;
                          return (
                            <div key={row.label}>
                              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                                <span>{row.label}</span>
                                <span className="tabular-nums">
                                  {row.value}/{row.total} <span className="text-slate-400">({formatAdminPercent(row.value, row.total)})</span>
                                </span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full ${row.color}`} style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(
                    [
                      { label: 'Toplam teklif', v: offerInsight.total, sub: 'Tüm teklif kayıtları', icon: Handshake },
                      { label: 'Bekleyen teklif', v: offerInsight.beklemede, sub: 'Yanıt bekleyen', icon: FileText },
                      { label: 'Kabul / red', v: `${offerInsight.kabul} / ${offerInsight.red}`, sub: 'Kapanmış işlemler', icon: TrendingUp },
                      { label: 'İçerik teslimi', v: offerInsight.withContent, sub: 'Link yüklenmiş', icon: FileText },
                      { label: 'İçerik onaylı', v: offerInsight.contentApproved, sub: 'Marka onayı', icon: UserCheck },
                      { label: 'Marka cüzdan (toplam)', v: `₺${totalBrandWalletTry.toLocaleString('tr-TR')}`, sub: 'Bakiye toplamı', icon: Wallet },
                    ] as const
                  ).map((row) => {
                    const Ic = row.icon;
                    return (
                      <div
                        key={row.label}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-[#08afd5]/70"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">{row.label}</div>
                            <div className="text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5 tabular-nums">
                              {row.v}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{row.sub}</div>
                          </div>
                          <div className="w-9 h-9 rounded-xl bg-[#08afd5]/10 flex items-center justify-center text-[#0a7a94] shrink-0">
                            <Ic size={18} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">Kullanıcı & ağ</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSection('systemActivity')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-[#08afd5]/50"
                      >
                        Sistem hareketleri
                        <ArrowRight size={14} className="text-[#08afd5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('supportMessages')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Destek mesajları
                        {unreviewedSupportCount > 0 && (
                          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-amber-950">
                            {unreviewedSupportCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {metrics.map((metric) => {
                      const Icon = metric.icon;
                      return (
                        <div
                          key={metric.label}
                          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:scale-[1.02] hover:shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs uppercase text-slate-400">{metric.label}</div>
                              <div className="text-2xl font-semibold tabular-nums">{metric.value}</div>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                              <Icon size={18} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-xs uppercase text-slate-400">Kampanyalar (etkin durum)</div>
                        <div className="text-lg font-semibold">Yayın penceresine göre</div>
                      </div>
                      <Target size={18} className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      Taslak / aktif / tamamlandı, tarih ve durum alanlarına göre hesaplanır.
                    </p>
                    {(() => {
                      const c = campaignStatusBreakdown;
                      const tot = Math.max(1, c.aktif + c.taslak + c.tamamlandı + c.iptal);
                      const rows: { label: string; value: number; color: string }[] = [
                        { label: 'Aktif', value: c.aktif, color: 'bg-emerald-500' },
                        { label: 'Taslak', value: c.taslak, color: 'bg-slate-400' },
                        { label: 'Tamamlandı', value: c.tamamlandı, color: 'bg-sky-500' },
                        { label: 'İptal', value: c.iptal, color: 'bg-rose-500' },
                      ];
                      return (
                        <div className="space-y-2.5">
                          {rows.map((item) => {
                            const width = Math.min(100, (item.value / tot) * 100);
                            return (
                              <div key={item.label}>
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                  <span>{item.label}</span>
                                  <span className="tabular-nums">{item.value}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div className={`h-full ${item.color}`} style={{ width: `${width}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-xs uppercase text-slate-400">Teklif durumu</div>
                        <div className="text-lg font-semibold">Tüm teklifler</div>
                      </div>
                      <Handshake size={18} className="text-slate-400" />
                    </div>
                    {(() => {
                      const t = Math.max(1, offerInsight.total);
                      const offerBars = [
                        { label: 'Beklemede', value: offerInsight.beklemede, color: 'bg-amber-400' },
                        { label: 'Kabul', value: offerInsight.kabul, color: 'bg-emerald-500' },
                        { label: 'Red', value: offerInsight.red, color: 'bg-rose-400' },
                      ];
                      return (
                        <div className="space-y-2.5">
                          {offerBars.map((item) => {
                            const width = Math.min(100, (item.value / t) * 100);
                            return (
                              <div key={item.label}>
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                  <span>{item.label}</span>
                                  <span className="tabular-nums">
                                    {item.value}{' '}
                                    <span className="text-slate-400">({Math.round((item.value / t) * 100)}%)</span>
                                  </span>
                                </div>
                                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div className={`h-full ${item.color}`} style={{ width: `${width}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-xs uppercase text-slate-400">Onay kuyruğu</div>
                        <div className="text-lg font-semibold">Marka + influencer</div>
                      </div>
                      <LineChart size={18} className="text-slate-400" />
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Onaylı', value: metrics[4]!.value + metrics[5]!.value, color: 'bg-emerald-400' },
                        { label: 'Beklemede', value: metrics[2]!.value, color: 'bg-amber-400' },
                      ].map((item) => {
                        const total = Math.max(1, metrics[0]!.value + metrics[1]!.value);
                        const width = Math.min(100, (item.value / total) * 100);
                        return (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                              <span>{item.label}</span>
                              <span className="tabular-nums">{item.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-xs uppercase text-slate-400">Takipçi dağılımı</div>
                        <div className="text-lg font-semibold">Platform bazlı</div>
                      </div>
                      <BarChart3 size={18} className="text-slate-400" />
                    </div>
                    <div className="space-y-3">
                      {platformTotals.length === 0 && (
                        <p className="text-sm text-slate-400">Henüz veri yok.</p>
                      )}
                      {platformTotals.map((row) => {
                        const max = Math.max(1, platformTotals[0]?.total || 1);
                        const width = Math.min(100, (row.total / max) * 100);
                        return (
                          <div key={row.platform}>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                              <span className="capitalize">{row.platform}</span>
                              <span className="tabular-nums">{row.total.toLocaleString('tr-TR')}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-[#08afd5]" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                    <div>
                      <div className="text-xs uppercase text-slate-400">Operasyon</div>
                      <div className="text-lg font-semibold text-slate-900">Son güncellenen kampanyalar</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('systemActivity')}
                      className="text-xs font-medium text-[#0a7a94] hover:underline"
                    >
                      Tüm hareketleri aç
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-100 bg-white">
                          <th className="px-4 py-3 font-medium">Güncellendi</th>
                          <th className="px-4 py-3 font-medium">Kampanya</th>
                          <th className="px-4 py-3 font-medium">Marka</th>
                          <th className="px-4 py-3 font-medium">Etkin durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentCampaignsDash.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">
                              Henüz kampanya yok.
                            </td>
                          </tr>
                        ) : (
                          recentCampaignsDash.map((row) => {
                            const stClass =
                              row.status === 'aktif'
                                ? 'bg-emerald-100 text-emerald-900'
                                : row.status === 'taslak'
                                  ? 'bg-slate-100 text-slate-800'
                                  : row.status === 'tamamlandı'
                                    ? 'bg-sky-100 text-sky-900'
                                    : 'bg-rose-100 text-rose-900';
                            return (
                              <tr key={`${row.brandId}_${row.id}`} className="border-t border-slate-100 hover:bg-slate-50/80">
                                <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                                  {row.updatedAt
                                    ? new Date(row.updatedAt).toLocaleString('tr-TR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '—'}
                                </td>
                                <td className="px-4 py-2.5 max-w-[200px]">
                                  <div className="font-medium text-slate-900 truncate" title={row.title}>
                                    {row.title}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 truncate">{row.id}</div>
                                </td>
                                <td className="px-4 py-2.5 text-slate-700 max-w-[180px] truncate" title={row.brandName}>
                                  {row.brandName}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${stClass}`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'pendingEmailRegistrations' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">E-posta doğrulaması bekleyen kayıtlar</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Kaynak: Realtime Database{' '}
                      <code className="text-xs bg-slate-100 px-1 rounded">geciciMarkalar</code> ve{' '}
                      <code className="text-xs bg-slate-100 px-1 rounded">geciciInfluencerlar</code>.
                      Manuel doğrulama, normal kullanıcı akışındaki kod doğrulamasıyla aynı sonucu üretir (Auth{' '}
                      <code className="text-xs bg-slate-100 px-1 rounded">emailVerified</code>, ardından{' '}
                      <code className="text-xs bg-slate-100 px-1 rounded">brands/</code> veya{' '}
                      <code className="text-xs bg-slate-100 px-1 rounded">influencers/</code> taşıması).
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-50"
                    disabled={loadingPendingEmail}
                    onClick={() => void loadPendingEmailRegistrations()}
                  >
                    {loadingPendingEmail ? 'Yenileniyor...' : 'Listeyi yenile'}
                  </button>
                </div>

                {pendingEmailRtdbFallback && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p className="font-medium">Yerel API&apos;ye bağlanılamadı (ör. port 3002 kapalı).</p>
                    <p className="mt-1 text-amber-900/90">
                      Liste doğrudan Realtime Database&apos;den yüklendi; Auth e-posta eşlemesi ve &quot;Manuel doğrulama&quot;
                      için Node sunucusunun çalışması gerekir. Geliştirme: proje kökünde{' '}
                      <code className="text-xs bg-white/80 px-1 rounded border border-amber-200/80">cd server &amp;&amp; npm run dev</code>{' '}
                      (veya <code className="text-xs bg-white/80 px-1 rounded border border-amber-200/80">npm start</code>
                      ). Sunucu açıldıktan sonra &quot;Listeyi yenile&quot; ile tam görünüme geçin.
                    </p>
                  </div>
                )}

                {loadingPendingEmail && pendingEmailRows.length === 0 ? (
                  <p className="text-sm text-slate-500">Yükleniyor...</p>
                ) : pendingEmailRows.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Şu an bekleyen geçici kayıt yok. Yeni kayıtlar e-posta doğrulanana kadar burada listelenir.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                          <th className="px-3 py-2 font-medium">Tip</th>
                          <th className="px-3 py-2 font-medium">Ad / Marka</th>
                          <th className="px-3 py-2 font-medium">E-posta (RTDB)</th>
                          <th className="px-3 py-2 font-medium">Auth e-posta</th>
                          <th className="px-3 py-2 font-medium">Durum</th>
                          <th className="px-3 py-2 font-medium">Kod</th>
                          <th className="px-3 py-2 font-medium w-40">İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingEmailRows.map((row) => {
                          const authMismatch =
                            row.authEmail &&
                            row.email &&
                            row.authEmail.trim().toLowerCase() !== row.email.trim().toLowerCase();
                          return (
                            <tr key={row.uid} className="border-t border-slate-100">
                              <td className="px-3 py-2 whitespace-nowrap">
                                {row.accountType === 'brand' ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs">
                                    Marka
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full bg-violet-50 text-violet-800 text-xs">
                                    Influencer
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 max-w-[200px]">
                                <div className="font-medium text-slate-800 truncate">{row.displayName || '—'}</div>
                                <div className="text-xs text-slate-400 font-mono truncate">{row.uid}</div>
                              </td>
                              <td className="px-3 py-2 text-slate-700">{row.email || '—'}</td>
                              <td className="px-3 py-2">
                                {row.authError === 'backend_unavailable' ? (
                                  <span className="text-slate-600 text-xs">API yok — Auth eşlemesi okunamadı</span>
                                ) : row.authError ? (
                                  <span className="text-amber-700 text-xs">Auth: {row.authError}</span>
                                ) : (
                                  <span className="text-slate-700">{row.authEmail || '—'}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {row.emailVerified ? (
                                  <span className="text-emerald-700 text-xs">Auth: doğrulanmış</span>
                                ) : (
                                  <span className="text-amber-700 text-xs">E-posta bekleniyor</span>
                                )}
                                {authMismatch && (
                                  <div className="text-xs text-red-600 mt-0.5">RTDB ≠ Auth e-posta</div>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                                {row.hasActiveVerificationCode ? 'Aktif kod var' : '—'}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  className="text-xs px-2 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
                                  disabled={
                                    verifyingUid === row.uid ||
                                    !!authMismatch ||
                                    !!row.authError ||
                                    pendingEmailRtdbFallback
                                  }
                                  title={
                                    pendingEmailRtdbFallback
                                      ? 'Manuel doğrulama için Node API (server) çalışıyor olmalı.'
                                      : authMismatch
                                        ? 'E-posta eşleşmediği için manuel doğrulama kapalı. Önce RTDB/Auth tutarlılığını düzeltin.'
                                        : row.authError
                                          ? 'Auth hatası veya API gerekli.'
                                          : undefined
                                  }
                                  onClick={() => void handleManualVerifyRegistrationEmail(row)}
                                >
                                  {verifyingUid === row.uid ? 'İşleniyor...' : 'Manuel doğrula'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'admins' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold mb-3">Admin Ekle</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      className="border rounded-lg px-3 py-2"
                      placeholder="admin@infuhub.local"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                    />
                    <input
                      className="border rounded-lg px-3 py-2"
                      placeholder="Şifre"
                      type="password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                    />
                    <button
                      className="bg-slate-900 text-white rounded-lg px-3 py-2 disabled:opacity-60"
                      onClick={handleCreateAdmin}
                      disabled={adminCreateLoading}
                    >
                      {adminCreateLoading ? 'Ekleniyor...' : 'Admin Ekle'}
                    </button>
                    {adminCreateError && <p className="text-sm text-red-600">{adminCreateError}</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold mb-3">Kayıtlı Adminler</h3>
                  <div className="space-y-3">
                    {admins.map((adminItem) => (
                      <div key={adminItem.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="text-sm font-semibold">{adminItem.email || adminItem.id}</div>
                        <div className="text-xs text-slate-500">
                          ID: {adminItem.id}
                        </div>
                        {adminItem.createdAt && (
                          <div className="text-xs text-slate-500">Oluşturma: {adminItem.createdAt}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'supportMessages' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">İletişim / destek mesajları</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        İletişim sayfasından gönderilen; etiketli kayıtlar (Firebase{' '}
                        <code className="text-xs bg-slate-100 px-1 rounded">supportMessages</code>).
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-slate-500 flex items-center gap-2">
                        Kategori
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                          value={supportCategoryFilter}
                          onChange={(e) => setSupportCategoryFilter(e.target.value)}
                        >
                          <option value="all">Tümü</option>
                          {SUPPORT_MESSAGE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {SUPPORT_CATEGORY_LABELS[c] || c}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                        onClick={() => loadData()}
                      >
                        Yenile
                      </button>
                    </div>
                  </div>
                  {loadingData ? (
                    <p>Yükleniyor...</p>
                  ) : filteredSupportMessages.length === 0 ? (
                    <p className="text-sm text-slate-500">Kayıt yok veya arama sonucu boş.</p>
                  ) : (
                    <>
                      <table className="w-full text-sm min-w-[980px]">
                        <thead>
                          <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                            <th className="pb-2 pr-2">Tarih</th>
                            <th className="pb-2 pr-2">Etiket</th>
                            <th className="pb-2 pr-2">Durum</th>
                            <th className="pb-2 pr-2">Ad Soyad</th>
                            <th className="pb-2 pr-2">Konu</th>
                            <th className="pb-2 pr-2">E-posta</th>
                            <th className="pb-2 pr-2">Özet</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSupportMessages.map((m) => {
                            const fullName = `${m.firstName || ''} ${m.lastName || ''}`.trim() || '—';
                            return (
                              <tr
                                key={m.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSupportDetailOpen(m)}
                                onKeyDown={(ev) => {
                                  if (ev.key === 'Enter' || ev.key === ' ') {
                                    ev.preventDefault();
                                    setSupportDetailOpen(m);
                                  }
                                }}
                                className="border-b border-slate-100 align-top cursor-pointer hover:bg-slate-50 transition-colors"
                              >
                                <td className="py-2 pr-2 text-xs text-slate-500 whitespace-nowrap">
                                  {m.createdAt ? new Date(m.createdAt).toLocaleString('tr-TR') : '—'}
                                </td>
                                <td className="py-2 pr-2">
                                  <span className="text-xs px-2 py-1 rounded-full bg-[#08afd5]/15 text-[#0790b3] font-medium">
                                    {SUPPORT_CATEGORY_LABELS[m.category] || m.category}
                                  </span>
                                </td>
                                <td className="py-2 pr-2 whitespace-nowrap">
                                  {m.reviewed ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                                      İncelendi
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                                      Bekliyor
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 pr-2 text-xs font-medium text-slate-800 max-w-[140px] truncate" title={fullName}>
                                  {fullName}
                                </td>
                                <td className="py-2 pr-2 text-xs max-w-[180px] truncate" title={m.subject || ''}>
                                  {m.subject || '—'}
                                </td>
                                <td className="py-2 pr-2 text-xs break-all max-w-[160px] truncate">{m.email}</td>
                                <td className="py-2 pr-2 text-xs text-slate-600 max-w-[220px]">
                                  <span className="line-clamp-2">{m.message}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="text-xs text-slate-400 mt-2">Detay için satıra tıklayın.</p>

                      <Dialog open={supportDetailOpen !== null} onOpenChange={(open) => !open && setSupportDetailOpen(null)}>
                        <DialogContent
                          className="max-w-3xl max-h-[90vh] overflow-y-auto sm:max-w-3xl gap-0 border-0 p-0 shadow-2xl ring-1 ring-slate-200/80 bg-white text-slate-900 rounded-2xl
                          [&>button]:right-3 [&>button]:top-3.5 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:text-slate-400 [&>button]:hover:bg-slate-100 [&>button]:hover:text-slate-700"
                        >
                          {supportDetailOpen ? (
                            <div className="flex flex-col max-h-[min(90vh,720px)]">
                              <div className="shrink-0 border-b border-slate-200/90 bg-gradient-to-br from-slate-50 to-white px-5 pt-5 pb-4 pr-14">
                                <DialogHeader className="space-y-3 text-left sm:pr-0">
                                  <DialogTitle className="text-lg font-semibold text-slate-900 leading-snug pr-0">
                                    {supportDetailOpen.subject || 'Mesaj detayı'}
                                  </DialogTitle>
                                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                                    <time
                                      className="inline-flex items-center gap-1.5 text-slate-500 tabular-nums"
                                      dateTime={supportDetailOpen.createdAt}
                                    >
                                      {supportDetailOpen.createdAt
                                        ? new Date(supportDetailOpen.createdAt).toLocaleString('tr-TR')
                                        : '—'}
                                    </time>
                                    <span className="text-slate-300 select-none" aria-hidden>
                                      |
                                    </span>
                                    <span className="inline-flex items-center rounded-md bg-[#08afd5]/10 px-2 py-0.5 text-xs font-medium text-[#0a7a94] ring-1 ring-inset ring-[#08afd5]/20">
                                      {SUPPORT_CATEGORY_LABELS[supportDetailOpen.category] || supportDetailOpen.category}
                                    </span>
                                    {supportDetailOpen.reviewed ? (
                                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200/80">
                                        İncelendi
                                        {supportDetailOpen.reviewedAt && (
                                          <span className="ml-1.5 text-emerald-600/90 font-normal tabular-nums">
                                            · {new Date(supportDetailOpen.reviewedAt).toLocaleString('tr-TR')}
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200/90">
                                        İncelenmedi
                                      </span>
                                    )}
                                  </div>
                                </DialogHeader>
                                <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                                  {supportReviewBusy && (
                                    <span className="text-xs text-slate-500 order-last sm:order-none">Kaydediliyor…</span>
                                  )}
                                  {supportDetailOpen.reviewed ? (
                                    <button
                                      type="button"
                                      disabled={supportReviewBusy}
                                      className="w-full sm:w-auto text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
                                      onClick={() => handleSupportMessageReviewed(supportDetailOpen.id, false)}
                                    >
                                      İncelendi işaretini kaldır
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={supportReviewBusy}
                                      className="w-full sm:w-auto text-sm font-medium px-4 py-2.5 rounded-xl bg-[#08afd5] text-white shadow-sm shadow-[#08afd5]/20 hover:bg-[#0799bc] active:scale-[0.99] transition-all disabled:opacity-50"
                                      onClick={() => handleSupportMessageReviewed(supportDetailOpen.id, true)}
                                    >
                                      İncelendi olarak işaretle
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 text-sm">
                                <div className="grid gap-2.5 sm:grid-cols-2">
                                  {[
                                    { label: 'Ad', value: supportDetailOpen.firstName || '—' },
                                    { label: 'Soyad', value: supportDetailOpen.lastName || '—' },
                                    {
                                      label: 'E-posta',
                                      value: supportDetailOpen.email,
                                      wide: true,
                                      mono: false,
                                    },
                                    { label: 'Telefon', value: supportDetailOpen.phone || '—' },
                                    {
                                      label: 'Gönderen UID',
                                      value: supportDetailOpen.senderUid || '—',
                                      mono: true,
                                    },
                                  ].map((field) => (
                                    <div
                                      key={field.label}
                                      className={`rounded-xl border border-slate-200/80 bg-slate-50/90 px-3.5 py-2.5 ${field.wide ? 'sm:col-span-2' : ''}`}
                                    >
                                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                        {field.label}
                                      </div>
                                      <div
                                        className={`mt-1.5 text-slate-900 font-medium break-words ${field.mono ? 'text-xs font-mono text-slate-600 font-normal' : ''}`}
                                      >
                                        {field.value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                                    Mesaj
                                  </div>
                                  <div className="rounded-xl border border-slate-200/90 bg-slate-100/60 p-4 text-slate-800 whitespace-pre-wrap text-sm leading-relaxed min-h-[min(200px,40vh)] shadow-inner">
                                    {supportDetailOpen.message}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'payoutVerifications' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Ödeme doğrulama talepleri</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        IBAN, bankadaki alıcı adı (havale/EFT) ve vergi istisna belgesi. Onaylanan bilgiler
                        influencer profiline yazılır.
                      </p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                      Bekleyen: {pendingPayoutVerifications.length}
                    </span>
                  </div>
                  {loadingData ? (
                    <p>Yükleniyor...</p>
                  ) : pendingPayoutVerifications.length === 0 ? (
                    <p className="text-sm text-slate-500">Bekleyen ödeme doğrulama talebi yok.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {pendingPayoutVerifications.map(([influencerId, req]) => (
                        <div
                          key={influencerId}
                          className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">{req.fullName}</div>
                            <div className="text-xs text-slate-600">{req.email}</div>
                            <div className="text-[11px] text-slate-400 mt-1 font-mono">{influencerId}</div>
                          </div>
                          <div className="text-sm">
                            <div>
                              <span className="text-slate-500">Havale/EFT alıcı adı: </span>
                              <span className="font-medium text-slate-800">
                                {req.payoutAccountFullName?.trim() || req.fullName}
                              </span>
                            </div>
                            <div className="mt-0.5">
                              <span className="text-slate-500">IBAN: </span>
                              <span className="font-mono font-medium">{req.iban}</span>
                            </div>
                          </div>
                          <a
                            href={req.taxDocumentURL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-sm text-[#08afd5] underline"
                          >
                            Vergi istisna belgesini aç
                          </a>
                          <div className="text-xs text-slate-400">
                            Gönderim: {req.createdAt ? new Date(req.createdAt).toLocaleString('tr-TR') : '—'}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              className="text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => handleApprovePayout(influencerId)}
                            >
                              Onayla
                            </button>
                            <button
                              type="button"
                              className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => handleRejectPayout(influencerId)}
                            >
                              Reddet
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
                  <h3 className="text-lg font-semibold mb-3">Tüm kayıtlar</h3>
                  {Object.keys(payoutRequests).length === 0 ? (
                    <p className="text-sm text-slate-500">Kayıt yok.</p>
                  ) : (
                    <table className="w-full text-sm min-w-[720px]">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                          <th className="pb-2 pr-2">Influencer</th>
                          <th className="pb-2 pr-2">Havale adı</th>
                          <th className="pb-2 pr-2">E-posta</th>
                          <th className="pb-2 pr-2">IBAN</th>
                          <th className="pb-2 pr-2">Durum</th>
                          <th className="pb-2">Güncelleme</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(payoutRequests).map(([id, req]) => (
                          <tr key={id} className="border-b border-slate-100">
                            <td className="py-2 pr-2">
                              <div className="font-medium">{req.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{id}</div>
                            </td>
                            <td className="py-2 pr-2 text-xs max-w-[160px]" title={req.payoutAccountFullName || req.fullName}>
                              {req.payoutAccountFullName?.trim() || req.fullName}
                            </td>
                            <td className="py-2 pr-2 text-xs">{req.email}</td>
                            <td className="py-2 pr-2 font-mono text-xs">{req.iban}</td>
                            <td className="py-2 pr-2">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  isVerificationApproved(req.status)
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : req.status === 'reddedildi'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isVerificationApproved(req.status)
                                  ? 'Onaylandı'
                                  : req.status === 'reddedildi'
                                    ? 'Reddedildi'
                                    : 'Beklemede'}
                              </span>
                            </td>
                            <td className="py-2 text-xs text-slate-500">
                              {req.updatedAt ? new Date(req.updatedAt).toLocaleString('tr-TR') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'payoutTransferRequests' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Ödeme talepleri (para çekim)</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Influencer panelinden oluşturulan havale talepleri. Detayda IBAN ve tutarlar görünür;
                        bankadan ödedikten sonra &quot;Ödeme yapıldı&quot; ile kayıt tamamlanır (Firebase&apos;de{' '}
                        <code className="text-xs bg-slate-100 px-1 rounded">influencers/.../withdrawals</code>).
                      </p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-cyan-100 text-cyan-900 font-medium">
                      Bekleyen: {withdrawalQueuePending.length}
                    </span>
                  </div>
                  {loadingData ? (
                    <p className="text-sm text-slate-500">Yükleniyor...</p>
                  ) : withdrawalQueuePending.length === 0 ? (
                    <p className="text-sm text-slate-500">Bekleyen çekim talebi yok.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <th className="px-3 py-2 font-medium">Tarih</th>
                            <th className="px-3 py-2 font-medium">Influencer</th>
                            <th className="px-3 py-2 font-medium">Havale adı</th>
                            <th className="px-3 py-2 font-medium">Net (₺)</th>
                            <th className="px-3 py-2 font-medium">Brüt (₺)</th>
                            <th className="px-3 py-2 font-medium w-32">İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {withdrawalQueuePending.map((row) => (
                            <tr key={`${row.influencerId}_${row.withdrawalId}`} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                                {row.createdAt
                                  ? new Date(row.createdAt).toLocaleString('tr-TR')
                                  : '—'}
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-medium text-slate-900">{row.fullName}</div>
                                <div className="text-xs text-slate-500">{row.email}</div>
                              </td>
                              <td className="px-3 py-2 text-xs text-slate-800 max-w-[140px]">
                                {row.payoutAccountFullName || row.fullName}
                              </td>
                              <td className="px-3 py-2 font-semibold tabular-nums">
                                ₺{row.amountNet.toLocaleString('tr-TR')}
                              </td>
                              <td className="px-3 py-2 text-slate-600 tabular-nums">
                                ₺{row.amountGross.toLocaleString('tr-TR')}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  className="text-xs px-3 py-1.5 rounded-lg border border-[#08afd5] text-[#0a7a94] bg-[#08afd5]/10 hover:bg-[#08afd5]/20"
                                  onClick={() => {
                                    setMarkPaidReference('');
                                    setWithdrawalDetailOpen(row);
                                  }}
                                >
                                  Detay / öde
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
                  <h3 className="text-lg font-semibold mb-1">Son tamamlanan / iptal çekimler</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Kayıt yeri: aynı çekim düğümü (ödeme yapıldığında{' '}
                    <code className="text-xs bg-slate-100 px-1 rounded">paidAt</code>, referans ve admin UID eklenir).
                  </p>
                  {withdrawalQueueHistory.length === 0 ? (
                    <p className="text-sm text-slate-500">Henüz arşiv kaydı yok.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                          <th className="px-3 py-2 font-medium">Ödeme / güncelleme</th>
                          <th className="px-3 py-2 font-medium">Influencer</th>
                          <th className="px-3 py-2 font-medium">Net</th>
                          <th className="px-3 py-2 font-medium">Durum</th>
                          <th className="px-3 py-2 font-medium">Referans</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawalQueueHistory.map((row) => (
                          <tr key={`${row.influencerId}_${row.withdrawalId}`} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                              {row.paidAt
                                ? new Date(row.paidAt).toLocaleString('tr-TR')
                                : row.updatedAt
                                  ? new Date(row.updatedAt).toLocaleString('tr-TR')
                                  : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{row.fullName}</div>
                              <div className="text-[10px] font-mono text-slate-400">{row.influencerId}</div>
                            </td>
                            <td className="px-3 py-2 tabular-nums">₺{row.amountNet.toLocaleString('tr-TR')}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  row.status === 'tamamlandı'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {row.status === 'tamamlandı' ? 'Tamamlandı' : 'İptal'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-600 max-w-[200px] break-words">
                              {row.paymentReference || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <Dialog
                  open={withdrawalDetailOpen !== null}
                  onOpenChange={(open) => {
                    if (!open) {
                      setWithdrawalDetailOpen(null);
                      setMarkPaidReference('');
                    }
                  }}
                >
                  <DialogContent className="max-w-lg gap-0 border-0 p-0 shadow-2xl ring-1 ring-slate-200/80 bg-white text-slate-900 rounded-2xl [&>button]:right-3 [&>button]:top-3.5 [&>button]:rounded-full [&>button]:text-slate-400 [&>button]:hover:bg-slate-100">
                    {withdrawalDetailOpen ? (
                      <div className="p-6">
                        <DialogHeader>
                          <DialogTitle className="text-left pr-6">Havale bilgileri</DialogTitle>
                          <p className="text-xs text-slate-500 text-left">
                            Talep:{' '}
                            {withdrawalDetailOpen.createdAt
                              ? new Date(withdrawalDetailOpen.createdAt).toLocaleString('tr-TR')
                              : '—'}
                          </p>
                        </DialogHeader>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-3">
                              <div className="text-[10px] uppercase text-slate-500">Havale/EFT alıcı adı</div>
                              <div className="font-semibold text-slate-900">
                                {withdrawalDetailOpen.payoutAccountFullName || withdrawalDetailOpen.fullName}
                              </div>
                              {withdrawalDetailOpen.payoutAccountFullName &&
                                withdrawalDetailOpen.payoutAccountFullName.trim() !==
                                  withdrawalDetailOpen.fullName.trim() && (
                                  <div className="text-[11px] text-slate-500 mt-1">
                                    Profil adı: {withdrawalDetailOpen.fullName}
                                  </div>
                                )}
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-3">
                              <div className="text-[10px] uppercase text-slate-500">E-posta</div>
                              <div className="break-all">{withdrawalDetailOpen.email}</div>
                            </div>
                            {withdrawalDetailOpen.phone && (
                              <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-3 sm:col-span-2">
                                <div className="text-[10px] uppercase text-slate-500">Telefon</div>
                                <div className="font-mono">{withdrawalDetailOpen.phone}</div>
                              </div>
                            )}
                          </div>
                          <div className="rounded-lg border-2 border-[#08afd5]/30 bg-[#08afd5]/5 p-3">
                            <div className="text-[10px] uppercase text-slate-500 mb-1">IBAN (tam)</div>
                            <div className="font-mono text-base font-medium tracking-tight break-all select-all">
                              {withdrawalDetailOpen.iban}
                            </div>
                            {withdrawalDetailOpen.iban === '—' && (
                              <p className="text-xs text-amber-800 mt-2">
                                Profilde IBAN yok. Önce &quot;Ödeme doğrulamaları&quot; onayı ve profil senkronu gerekir.
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center rounded-lg border border-slate-200 p-3">
                            <div>
                              <div className="text-[10px] text-slate-500">Brüt</div>
                              <div className="font-semibold tabular-nums">
                                ₺{withdrawalDetailOpen.amountGross.toLocaleString('tr-TR')}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">Komisyon</div>
                              <div className="font-semibold text-amber-700 tabular-nums">
                                −₺{withdrawalDetailOpen.platformFee.toLocaleString('tr-TR')}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">Net</div>
                              <div className="font-bold text-[#0a7a94] tabular-nums">
                                ₺{withdrawalDetailOpen.amountNet.toLocaleString('tr-TR')}
                              </div>
                            </div>
                          </div>
                          {withdrawalDetailOpen.taxDocumentURL && (
                            <a
                              href={withdrawalDetailOpen.taxDocumentURL}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex text-sm text-[#08afd5] underline"
                            >
                              Vergi istisna belgesini aç
                            </a>
                          )}
                          <div>
                            <label className="text-xs font-medium text-slate-600">
                              Ödeme referansı (opsiyonel — dekont açıklaması, EFT no)
                            </label>
                            <input
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              value={markPaidReference}
                              onChange={(e) => setMarkPaidReference(e.target.value)}
                              placeholder="Örn. FAST ref / işlem açıklaması"
                            />
                          </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                            onClick={() => {
                              setWithdrawalDetailOpen(null);
                              setMarkPaidReference('');
                            }}
                          >
                            Kapat
                          </button>
                          <button
                            type="button"
                            className="rounded-xl bg-[#08afd5] text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-[#0799bc] disabled:opacity-50"
                            disabled={markPaidBusy}
                            onClick={() => void handleMarkWithdrawalPaid()}
                          >
                            {markPaidBusy ? 'Kaydediliyor…' : 'Ödeme yapıldı (Firebase’e kaydet)'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {activeSection === 'brands' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Markalar</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      className={`px-3 py-1 rounded-lg border ${
                        viewMode === 'cards' ? 'border-[#08afd5] text-[#08afd5]' : 'border-slate-200'
                      }`}
                      onClick={() => setViewMode('cards')}
                    >
                      Kart
                    </button>
                    <button
                      className={`px-3 py-1 rounded-lg border ${
                        viewMode === 'list' ? 'border-[#08afd5] text-[#08afd5]' : 'border-slate-200'
                      }`}
                      onClick={() => setViewMode('list')}
                    >
                      Liste
                    </button>
                  </div>
                </div>
                {loadingData ? (
                  <p>Yükleniyor...</p>
                ) : (
                  <div className={viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
                    {pagedBrands.map((brand) => {
                      const doc =
                        brandRequests[brand.id]?.documentURL ||
                        brand.verificationDocumentURL;
                      const approved = isApproved(brand.status);
                      return (
                        <div
                          key={brand.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedBrand(brand)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedBrand(brand);
                            }
                          }}
                          className={`text-left border rounded-xl p-4 space-y-2 hover:shadow-sm transition cursor-pointer ${
                            viewMode === 'list' ? 'flex items-center gap-4' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {brand.profilePhotoURL ? (
                              <img
                                src={brand.profilePhotoURL}
                                alt={brand.brandName || 'Brand'}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm">
                                {(brand.brandName || 'B').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold">{brand.brandName || 'Marka'}</div>
                              <div className="text-xs text-gray-600">{brand.email}</div>
                              <time
                                className="mt-0.5 block text-[11px] text-slate-500"
                                dateTime={brand.createdAt || undefined}
                              >
                                Kayıt: {formatRegistrationDate(brand.createdAt)}
                              </time>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">{brand.id}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {approved ? 'Onaylı' : 'Beklemede'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                            <span className="px-2 py-1 rounded-full bg-slate-100">
                              Kampanya: {brand.campaignCount ?? 0}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-slate-100">
                              Bütçe: {brand.budget ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between w-full">
                            {doc ? (
                              <span className="text-xs text-[#08afd5]">Belge mevcut</span>
                            ) : (
                              <span className="text-xs text-slate-400">Belge yok</span>
                            )}
                            <button
                              type="button"
                              className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteBrand(brand);
                              }}
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {brandPageCount > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <button
                      className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-50"
                      onClick={() => setBrandPage((prev) => Math.max(1, prev - 1))}
                      disabled={brandPage === 1}
                    >
                      Önceki
                    </button>
                    <div>
                      Sayfa {brandPage} / {brandPageCount}
                    </div>
                    <button
                      className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-50"
                      onClick={() => setBrandPage((prev) => Math.min(brandPageCount, prev + 1))}
                      disabled={brandPage === brandPageCount}
                    >
                      Sonraki
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'influencers' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Influencerlar</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      className={`px-3 py-1 rounded-lg border ${
                        viewMode === 'cards' ? 'border-[#08afd5] text-[#08afd5]' : 'border-slate-200'
                      }`}
                      onClick={() => setViewMode('cards')}
                    >
                      Kart
                    </button>
                    <button
                      className={`px-3 py-1 rounded-lg border ${
                        viewMode === 'list' ? 'border-[#08afd5] text-[#08afd5]' : 'border-slate-200'
                      }`}
                      onClick={() => setViewMode('list')}
                    >
                      Liste
                    </button>
                  </div>
                </div>
                {loadingData ? (
                  <p>Yükleniyor...</p>
                ) : (
                  <div className={viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
                    {pagedInfluencers.map((inf) => {
	                      const doc =
	                        influencerRequests[inf.id]?.documentURL ||
	                        inf.verificationDocumentURL ||
	                        inf.verificationPhotoURL;
	                      const approved = isApproved(inf.status);
	                      const hasProfilePhoto = Boolean(inf.profilePhotoURL);
	                      const audienceComplete = isAudienceMatchComplete(inf);
	                      const payoutStatus = payoutVerificationLabel(inf.payoutProfile?.verificationStatus);
	                      return (
                        <div
                          key={inf.id}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setSelectedInfluencer({
                              ...inf,
                              platforms: normalizeInfluencerPlatformsToArray(inf.platforms),
                            })
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedInfluencer({
                                ...inf,
                                platforms: normalizeInfluencerPlatformsToArray(inf.platforms),
                              });
                            }
                          }}
                          className={`text-left border rounded-xl p-4 space-y-2 hover:shadow-sm transition cursor-pointer ${
                            viewMode === 'list' ? 'flex items-center gap-4' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {inf.profilePhotoURL ? (
                              <img
                                src={inf.profilePhotoURL}
                                alt={inf.fullName || 'Influencer'}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm">
                                {(inf.fullName || 'I').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold">{inf.fullName || 'Influencer'}</div>
                              <div className="text-xs text-gray-600">{inf.email}</div>
                              <time
                                className="mt-0.5 block text-[11px] text-slate-500"
                                dateTime={inf.createdAt || undefined}
                              >
                                Kayıt: {formatRegistrationDate(inf.createdAt)}
                              </time>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">{inf.id}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {approved ? 'Onaylı' : 'Beklemede'}
                            </span>
                          </div>
	                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
	                            <span className="px-2 py-1 rounded-full bg-slate-100">
	                              Takipçi: {inf.followersTotal ?? 0}
	                            </span>
	                            <span className="px-2 py-1 rounded-full bg-slate-100">
	                              Platform: {inf.platforms?.length ?? 0}
	                            </span>
	                          </div>
	                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
	                            <span
	                              className={`rounded-lg px-2 py-1 ring-1 ${
	                                hasProfilePhoto
	                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
	                                  : 'bg-slate-100 text-slate-600 ring-slate-200'
	                              }`}
	                            >
	                              Foto: {hasProfilePhoto ? 'Var' : 'Yok'}
	                            </span>
	                            <span
	                              className={`rounded-lg px-2 py-1 ring-1 ${
	                                audienceComplete
	                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
	                                  : 'bg-amber-50 text-amber-700 ring-amber-200'
	                              }`}
	                            >
	                              Anket: {audienceComplete ? 'Tamam' : 'Eksik'}
	                            </span>
	                            <span className={`rounded-lg px-2 py-1 ring-1 ${payoutStatus.tone}`}>
	                              {payoutStatus.text}
	                            </span>
	                          </div>
	                          <div className="flex items-center justify-between">
                            {doc ? (
                              <span className="text-xs text-[#08afd5]">Belge mevcut</span>
                            ) : (
                              <span className="text-xs text-slate-400">Belge yok</span>
                            )}
                            <button
                              type="button"
                              className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteInfluencer(inf);
                              }}
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {influencerPageCount > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <button
                      className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-50"
                      onClick={() => setInfluencerPage((prev) => Math.max(1, prev - 1))}
                      disabled={influencerPage === 1}
                    >
                      Önceki
                    </button>
                    <div>
                      Sayfa {influencerPage} / {influencerPageCount}
                    </div>
                    <button
                      className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-50"
                      onClick={() => setInfluencerPage((prev) => Math.min(influencerPageCount, prev + 1))}
                      disabled={influencerPage === influencerPageCount}
                    >
                      Sonraki
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedBrand && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-xl text-slate-900">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-xl font-semibold">Marka özeti</h3>
                <p className="text-sm text-slate-500 mt-0.5">Profil ve sorumlu bilgileri</p>
              </div>
              <button
                type="button"
                className="text-sm text-slate-600 hover:text-slate-900 shrink-0"
                onClick={() => setSelectedBrand(null)}
              >
                Kapat
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5 pb-5 border-b border-slate-100">
              {selectedBrand.profilePhotoURL ? (
                <img
                  src={selectedBrand.profilePhotoURL}
                  alt={selectedBrand.brandName}
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xl font-medium ring-2 ring-slate-100">
                  {(selectedBrand.brandName || 'B').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-lg font-semibold text-slate-900">{selectedBrand.brandName}</div>
                <div className="text-sm text-slate-600">{selectedBrand.email}</div>
                <div className="text-xs font-mono text-slate-400 break-all">{selectedBrand.id}</div>
                <time
                  className="block text-xs text-slate-500"
                  dateTime={selectedBrand.createdAt || undefined}
                >
                  Kayıt tarihi: {formatRegistrationDate(selectedBrand.createdAt)}
                </time>
                {selectedBrand.status ? (
                  <span
                    className={`inline-flex mt-2 text-xs font-medium px-2.5 py-1 rounded-full ${
                      isApproved(selectedBrand.status)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedBrand.status}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-cyan-700">
                  Yüklenen cüzdan
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-cyan-950">
                  ₺{(selectedBrand.walletLoadedTotal ?? 0).toLocaleString('tr-TR')}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                  Güncel bakiye
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-emerald-950">
                  ₺{(selectedBrand.walletBalance ?? 0).toLocaleString('tr-TR')}
                </div>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-rose-700">
                  Harcanan
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-rose-950">
                  ₺{(selectedBrand.walletSpentTotal ?? 0).toLocaleString('tr-TR')}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 mb-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Sorumlu kişi bilgileri</div>
              {sortBrandSorumluEntries(selectedBrand.sorumlular).length === 0 ? (
                <p className="text-sm text-slate-500">Kayıtlı sorumlu bilgisi yok.</p>
              ) : (
                <ul className="space-y-3">
                  {sortBrandSorumluEntries(selectedBrand.sorumlular).map(({ key, data: s }) => (
                    <li
                      key={key}
                      className="rounded-lg border border-white bg-white p-3 shadow-sm text-sm"
                    >
                      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
                        {key === 'birincil' ? 'Birincil sorumlu' : `Kayıt: ${key}`}
                      </div>
                      <div className="font-semibold text-slate-900">
                        {[s.firstName, s.lastName].filter(Boolean).join(' ') || '—'}
                      </div>
                      {s.title ? <div className="text-slate-600 mt-0.5">{s.title}</div> : null}
                      {s.phone ? (
                        <div className="text-slate-800 font-mono text-sm mt-1">{s.phone}</div>
                      ) : (
                        <div className="text-slate-400 text-xs mt-1">Telefon yok</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Düzenlenebilir alanlar</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Sektör</div>
                  <input
                    className={ADMIN_POPUP_INPUT_CLASS}
                    value={selectedBrand.industry || ''}
                    onChange={(e) =>
                      setSelectedBrand((prev) => (prev ? { ...prev, industry: e.target.value } : prev))
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Bütçe</div>
                  <input
                    type="number"
                    className={ADMIN_POPUP_INPUT_CLASS}
                    value={selectedBrand.budget ?? 0}
                    onChange={(e) =>
                      setSelectedBrand((prev) =>
                        prev ? { ...prev, budget: Number(e.target.value) || 0 } : prev
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs text-slate-500 mb-1">Website</div>
                  <input
                    className={ADMIN_POPUP_INPUT_CLASS}
                    value={selectedBrand.website || ''}
                    onChange={(e) =>
                      setSelectedBrand((prev) => (prev ? { ...prev, website: e.target.value } : prev))
                    }
                  />
                </div>
              </div>
            </div>
            {brandDoc && (
              <div className="mt-4 space-y-2">
                <a className="text-sm text-[#08afd5] underline" href={brandDoc} target="_blank" rel="noreferrer">
                  Doğrulama belgesini aç
                </a>
                {!brandDoc.toLowerCase().includes('.pdf') && (
                  <img src={brandDoc} alt="Doğrulama belgesi" className="w-full max-h-80 object-contain rounded-xl border" />
                )}
              </div>
            )}
            <div className="mt-4 flex gap-2 flex-wrap items-center">
              {!isApproved(selectedBrand.status) && (
                <>
                  <button className="text-sm px-3 py-1 border rounded" onClick={() => handleApprove('brand', selectedBrand.id)}>
                    Onayla
                  </button>
                  <button className="text-sm px-3 py-1 border rounded" onClick={() => handleReject('brand', selectedBrand.id)}>
                    Reddet
                  </button>
                </>
              )}
              <button className="text-sm px-3 py-1 border rounded" onClick={() => handleUpdateBrand(selectedBrand)}>
                Kaydet
              </button>
              <button
                type="button"
                className="text-sm px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                onClick={() => handleDeleteBrand(selectedBrand)}
              >
                Markayı sil
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInfluencer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-xl text-slate-900">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-xl font-semibold">Influencer özeti</h3>
                <p className="text-sm text-slate-500 mt-0.5">İletişim ve platform bilgileri</p>
              </div>
              <button
                type="button"
                className="text-sm text-slate-600 hover:text-slate-900 shrink-0"
                onClick={() => setSelectedInfluencer(null)}
              >
                Kapat
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5 pb-5 border-b border-slate-100">
              {selectedInfluencer.profilePhotoURL ? (
                <img
                  src={selectedInfluencer.profilePhotoURL}
                  alt={selectedInfluencer.fullName}
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xl font-medium ring-2 ring-slate-100">
                  {(selectedInfluencer.fullName || 'I').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-lg font-semibold text-slate-900">{selectedInfluencer.fullName}</div>
                <div className="text-xs font-mono text-slate-400 break-all">{selectedInfluencer.id}</div>
                <time
                  className="block text-xs text-slate-500"
                  dateTime={selectedInfluencer.createdAt || undefined}
                >
                  Kayıt tarihi: {formatRegistrationDate(selectedInfluencer.createdAt)}
                </time>
                {selectedInfluencer.status ? (
                  <span
                    className={`inline-flex mt-2 text-xs font-medium px-2.5 py-1 rounded-full ${
                      isApproved(selectedInfluencer.status)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedInfluencer.status}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 mb-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">İletişim</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-1">E-posta</div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 break-all">
                    {selectedInfluencer.email || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Telefon numarası</div>
                  <input
                    className={ADMIN_POPUP_INPUT_CLASS}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Kayıtlı telefon"
                    value={selectedInfluencer.phone ?? ''}
                    onChange={(e) =>
                      setSelectedInfluencer((prev) =>
                        prev ? { ...prev, phone: e.target.value } : prev
                      )
                    }
                  />
                </div>
              </div>
	              {typeof selectedInfluencer.followersTotal === 'number' ? (
	                <div className="text-sm text-slate-600 pt-1">
	                  Toplam takipçi (özet):{' '}
	                  <span className="font-semibold text-slate-900">
	                    {selectedInfluencer.followersTotal.toLocaleString('tr-TR')}
	                  </span>
	                </div>
	              ) : null}
	              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs">
	                <div
	                  className={`rounded-lg px-3 py-2 ring-1 ${
	                    selectedInfluencer.profilePhotoURL
	                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
	                      : 'bg-slate-100 text-slate-600 ring-slate-200'
	                  }`}
	                >
	                  <div className="font-semibold">Profil fotoğrafı</div>
	                  <div>{selectedInfluencer.profilePhotoURL ? 'Eklendi' : 'Eksik'}</div>
	                </div>
	                <div
	                  className={`rounded-lg px-3 py-2 ring-1 ${
	                    selectedInfluencerAudienceComplete
	                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
	                      : 'bg-amber-50 text-amber-700 ring-amber-200'
	                  }`}
	                >
	                  <div className="font-semibold">Anket</div>
	                  <div>{selectedInfluencerAudienceComplete ? 'Tamamlandı' : 'Doldurulmadı'}</div>
	                </div>
	                <div
	                  className={`rounded-lg px-3 py-2 ring-1 ${
	                    selectedInfluencerPayoutStatus?.tone || 'bg-slate-100 text-slate-600 ring-slate-200'
	                  }`}
	                >
	                  <div className="font-semibold">Ödeme doğrulaması</div>
	                  <div>{selectedInfluencerPayoutStatus?.text || 'Ödeme yok'}</div>
	                </div>
	              </div>
	            </div>

            <div className="mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Platformlar</div>
              <div className="space-y-2">
                {(selectedInfluencer.platforms || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Kayıtlı platform yok.</p>
                ) : null}
                {(selectedInfluencer.platforms || []).map((p, idx) => (
                  <div key={`${selectedInfluencer.id}-${p.id}-${idx}`} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input className={ADMIN_POPUP_INPUT_CLASS} readOnly value={p.id} />
                    <input className={ADMIN_POPUP_INPUT_CLASS} readOnly value={p.username} />
                    <input
                      className={ADMIN_POPUP_INPUT_CLASS}
                      type="number"
                      value={p.followers ?? 0}
                      onChange={(e) => {
                        const nextFollowers = Number(e.target.value) || 0;
                        setSelectedInfluencer((prev) =>
                          prev
                            ? {
                                ...prev,
                                platforms: (prev.platforms || []).map((pl, pIdx) =>
                                  pIdx === idx ? { ...pl, followers: nextFollowers } : pl
                                ),
                              }
                            : prev
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            {influencerDoc && (
              <div className="mt-4 space-y-2">
                <a className="text-sm text-[#08afd5] underline" href={influencerDoc} target="_blank" rel="noreferrer">
                  Doğrulama belgesini aç
                </a>
                {!influencerDoc.toLowerCase().includes('.pdf') && (
                  <img src={influencerDoc} alt="Doğrulama belgesi" className="w-full max-h-80 object-contain rounded-xl border" />
                )}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-2">
              {!isApproved(selectedInfluencer.status) && !selectedInfluencerHasVerificationDoc && (
                <p className="text-xs text-amber-700 dark:text-amber-400/90">
                  Doğrulama belgesi veya fotoğrafı olmadan onay verilemez. Influencer belge yükleyene kadar &quot;Onayla&quot; devre dışıdır.
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
              {!isApproved(selectedInfluencer.status) && (
                <>
                  <button
                    type="button"
                    className="text-sm px-3 py-1 border rounded disabled:opacity-45 disabled:cursor-not-allowed"
                    disabled={!selectedInfluencerHasVerificationDoc}
                    title={
                      selectedInfluencerHasVerificationDoc
                        ? undefined
                        : 'Doğrulama belgesi veya fotoğrafı yüklenmeden onay verilemez.'
                    }
                    onClick={() => handleApprove('influencer', selectedInfluencer.id)}
                  >
                    Onayla
                  </button>
                  <button className="text-sm px-3 py-1 border rounded" onClick={() => handleReject('influencer', selectedInfluencer.id)}>
                    Reddet
                  </button>
                </>
              )}
              <button className="text-sm px-3 py-1 border rounded" onClick={() => handleUpdateInfluencer(selectedInfluencer)}>
                Kaydet
              </button>
              <button
                className="text-sm px-3 py-1 border border-red-200 text-red-600 rounded"
                onClick={() => handleDeleteInfluencer(selectedInfluencer)}
              >
                Sil
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
