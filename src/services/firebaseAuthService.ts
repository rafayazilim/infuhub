import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
} from 'firebase/auth';
import { ref, set, get, update, remove } from 'firebase/database';
import { auth, database } from '@/config/firebase';
import { getFirebaseErrorMessage } from '@/lib/firebaseErrorMessages';
import { isVerificationApproved } from '@/lib/verificationStatus';
import { buildApiUrl } from '@/lib/apiConfig';

/** E-posta doğrulanana kadar kayıt tutulur; doğrulama sonrası `brands` / `influencers`e taşınır */
export const GECICI_MARKA_PATH = (uid: string) => `geciciMarkalar/${uid}`;
export const GECICI_INFLUENCER_PATH = (uid: string) => `geciciInfluencerlar/${uid}`;

/** Marka sorumlusu — `brands/{uid}/sorumlular/{key}` altında saklanır */
export interface BrandSorumlu {
  firstName: string;
  lastName: string;
  title: string;
  phone: string;
  createdAt: string;
}

export interface BrandData {
  id: string;
  brandName: string;
  email: string;
  /** Geriye dönük uyumluluk: genelde `categories[0]` ile doldurulur */
  industry: string;
  /** Influencer ile aynı üst kategori seçimi */
  categories?: string[];
  subCategories?: Record<string, string[]>;
  /** Eski kayıtlar — yeni kayıtta yazılmaz */
  industrySubCategories?: string[];
  budget: number;
  walletBalance?: number;
  walletLoadedTotal?: number;
  walletSpentTotal?: number;
  website?: string;
  sorumlular?: Record<string, BrandSorumlu>;
  status: 'do\u011frulanmad\u0131' | 'beklemede' | 'onayland\u0131' | 'reddedildi';
  verificationRequestStatus?: 'yok' | 'beklemede' | 'onayland\u0131' | 'reddedildi';
  userType: 'brand';
  createdAt: string;
  updatedAt: string;
}

export interface InfluencerData {
  id: string;
  fullName: string;
  email: string;
  /** Kayıt / profil iletişim (KVKK aydınlatma kapsamı) */
  phone?: string;
  platforms: Array<{ id: string; username: string; followers: number }>;
  followerRange: string;
  categories: string[];
  subCategories?: Record<string, string[]>;
  contentPricing?: {
    post?: number;
    story?: number;
    reels?: number;
    video?: number;
  };
  verificationPhotoURL?: string;
  status: 'do\u011frulanmad\u0131' | 'beklemede' | 'onayland\u0131' | 'reddedildi';
  verificationRequestStatus?: 'yok' | 'beklemede' | 'onayland\u0131' | 'reddedildi';
  verificationDocumentURL?: string;
  userType: 'influencer';
  subscriptionType?: 'defaultUser' | 'premiumUser'; // Abonelik tipi
  /** RTDB: marka eşleşmesi (kampanya alanları ile aynı sözlük) */
  audienceMatch?: {
    completedAt?: string;
    gender?: 'female' | 'male' | 'all';
    minAge?: string;
    maxAge?: string;
    productSubcategories?: string[];
    location?: string[];
    campaignHelpGoal?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/** RTDB set() undefined kabul etmez; iç içe objelerde de temizler */
function stripUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item));
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (v === undefined) continue;
    const cleaned = stripUndefinedDeep(v);
    if (cleaned !== undefined) {
      out[key] = cleaned;
    }
  }
  return out;
}

async function movePendingBrandToMain(uid: string, authEmail: string | null): Promise<void> {
  const pendingSnap = await get(ref(database, GECICI_MARKA_PATH(uid)));
  if (!pendingSnap.exists()) return;

  const existing = await get(ref(database, `brands/${uid}`));
  if (existing.exists()) {
    await remove(ref(database, GECICI_MARKA_PATH(uid)));
    return;
  }

  const p = pendingSnap.val();
  const now = new Date().toISOString();
  const brandData: BrandData = {
    id: uid,
    email: (authEmail || p.email || '') as string,
    brandName: p.brandName,
    industry: p.industry,
    categories: Array.isArray(p.categories) ? p.categories : undefined,
    subCategories:
      p.subCategories && typeof p.subCategories === 'object' && !Array.isArray(p.subCategories)
        ? (p.subCategories as Record<string, string[]>)
        : undefined,
    industrySubCategories: Array.isArray(p.industrySubCategories) ? p.industrySubCategories : undefined,
    budget: p.budget,
    website: p.website,
    sorumlular: p.sorumlular,
    walletBalance: p.walletBalance ?? 0,
    walletLoadedTotal: p.walletLoadedTotal ?? 0,
    walletSpentTotal: p.walletSpentTotal ?? 0,
    status: p.status ?? 'do\u011frulanmad\u0131',
    verificationRequestStatus: p.verificationRequestStatus ?? 'yok',
    userType: 'brand',
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : now,
    updatedAt: now,
  };

  await set(ref(database, `brands/${uid}`), stripUndefinedDeep(brandData));
  await remove(ref(database, GECICI_MARKA_PATH(uid)));
}

async function movePendingInfluencerToMain(uid: string, authEmail: string | null): Promise<void> {
  const pendingSnap = await get(ref(database, GECICI_INFLUENCER_PATH(uid)));
  if (!pendingSnap.exists()) return;

  const existing = await get(ref(database, `influencers/${uid}`));
  if (existing.exists()) {
    await remove(ref(database, GECICI_INFLUENCER_PATH(uid)));
    return;
  }

  const p = pendingSnap.val();
  const now = new Date().toISOString();
  const influencerData: InfluencerData = {
    id: uid,
    email: (authEmail || p.email || '') as string,
    fullName: p.fullName,
    phone: typeof p.phone === 'string' ? p.phone : undefined,
    platforms: p.platforms ?? [],
    followerRange: p.followerRange,
    categories: p.categories ?? [],
    subCategories: p.subCategories,
    contentPricing: p.contentPricing,
    verificationPhotoURL: p.verificationPhotoURL,
    status: p.status ?? 'do\u011frulanmad\u0131',
    verificationRequestStatus: p.verificationRequestStatus ?? 'yok',
    verificationDocumentURL: p.verificationDocumentURL,
    userType: 'influencer',
    subscriptionType: p.subscriptionType ?? 'defaultUser',
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : now,
    updatedAt: now,
  };

  await set(ref(database, `influencers/${uid}`), stripUndefinedDeep(influencerData));
  await remove(ref(database, GECICI_INFLUENCER_PATH(uid)));
}

async function promotePendingRegistration(
  uid: string,
  authEmail: string | null
): Promise<void> {
  const bRef = ref(database, GECICI_MARKA_PATH(uid));
  const iRef = ref(database, GECICI_INFLUENCER_PATH(uid));
  const bSnap = await get(bRef);
  const iSnap = await get(iRef);
  if (bSnap.exists() && iSnap.exists()) {
    await remove(iRef);
  }
  const bAgain = await get(bRef);
  const iAgain = await get(iRef);
  if (bAgain.exists()) {
    await movePendingBrandToMain(uid, authEmail);
  } else if (iAgain.exists()) {
    await movePendingInfluencerToMain(uid, authEmail);
  }
}

async function fetchMainUserData(
  uid: string
): Promise<BrandData | InfluencerData | null> {
  const brandSnapshot = await get(ref(database, `brands/${uid}`));
  if (brandSnapshot.exists()) {
    return brandSnapshot.val() as BrandData;
  }
  const influencerSnapshot = await get(ref(database, `influencers/${uid}`));
  if (influencerSnapshot.exists()) {
    const influencerData = influencerSnapshot.val() as InfluencerData;
    if (!influencerData.subscriptionType) {
      influencerData.subscriptionType = 'defaultUser';
    }
    return influencerData;
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Kayıt sonrası / yeniden gönderim: SMTP ile 6 haneli kod (geçici cluster ile eşleşir) */
export async function sendRegistrationVerificationEmailAfterRegister(user: User): Promise<void> {
  const token = await user.getIdToken();
  const url = buildApiUrl('auth/register/send-verification-code');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Doğrulama e-postası gönderilemedi.');
  }
}

/** E-posta + 6 haneli kod ile doğrulama; başarılı olunca Firebase emailVerified + geçici → ana taşıma sunucuda */
export async function verifyRegistrationEmail(email: string, code: string): Promise<void> {
  const res = await fetch(buildApiUrl('auth/register/verify-email'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Doğrulama başarısız.');
  }
}

// Marka kaydÄ±
export async function registerBrand(
  email: string,
  password: string,
  brandData: Omit<BrandData, 'id' | 'email' | 'status' | 'userType' | 'createdAt' | 'updatedAt'> & {
    sorumlular: Record<string, BrandSorumlu>;
  }
): Promise<{ user: User; brandData: BrandData }> {
  try {
    // Firebase Authentication ile kullanÄ±cÄ± oluÅŸtur
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Realtime Database'e marka bilgilerini kaydet
    const now = new Date().toISOString();
    const newBrandData: BrandData = {
      id: user.uid,
      email: user.email!,
      brandName: brandData.brandName,
      industry: brandData.industry,
      categories: brandData.categories,
      subCategories: brandData.subCategories,
      industrySubCategories: brandData.industrySubCategories,
      budget: brandData.budget,
      website: brandData.website,
      sorumlular: brandData.sorumlular,
      walletBalance: 0,
      walletLoadedTotal: 0,
      walletSpentTotal: 0,
      status: 'do\u011frulanmad\u0131',
      verificationRequestStatus: 'yok',
      userType: 'brand',
      createdAt: now,
      updatedAt: now,
    };

    const pendingPayload = {
      ...newBrandData,
      emailVerificationSentAt: now,
    };

    await set(ref(database, GECICI_MARKA_PATH(user.uid)), stripUndefinedDeep(pendingPayload));
    try {
      await sendRegistrationVerificationEmailAfterRegister(user);
    } catch (e) {
      await signOut(auth);
      throw e;
    }
    await signOut(auth);

    return { user, brandData: newBrandData };
  } catch (error: unknown) {
    throw new Error(getFirebaseErrorMessage(error, 'Kayıt sırasında bir hata oluştu.'));
  }
}

// Influencer kaydÄ±
export async function registerInfluencer(
  email: string,
  password: string,
  influencerData: Omit<
    InfluencerData,
    'id' | 'email' | 'status' | 'userType' | 'createdAt' | 'updatedAt'
  >
): Promise<{ user: User; influencerData: InfluencerData }> {
  try {
    // Firebase Authentication ile kullanÄ±cÄ± oluÅŸtur
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Realtime Database'e influencer bilgilerini kaydet
    const now = new Date().toISOString();
    const newInfluencerData: InfluencerData = {
      id: user.uid,
      email: user.email!,
      ...influencerData,
      status: 'do\u011frulanmad\u0131',
      verificationRequestStatus: 'yok',
      userType: 'influencer',
      subscriptionType: 'defaultUser', // Yeni kayÄ±tlar defaultUser olarak baÅŸlar
      createdAt: now,
      updatedAt: now,
    };

    const pendingPayload = {
      ...newInfluencerData,
      emailVerificationSentAt: now,
    };

    await set(ref(database, GECICI_INFLUENCER_PATH(user.uid)), stripUndefinedDeep(pendingPayload));
    try {
      await sendRegistrationVerificationEmailAfterRegister(user);
    } catch (e) {
      await signOut(auth);
      throw e;
    }
    await signOut(auth);

    return { user, influencerData: newInfluencerData };
  } catch (error: unknown) {
    throw new Error(getFirebaseErrorMessage(error, 'Kayıt sırasında bir hata oluştu.'));
  }
}

// GiriÅŸ yap
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; userData: BrandData | InfluencerData }> {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    await user.reload();
    await user.getIdToken(true);

    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    await promotePendingRegistration(user.uid, user.email);

    let userData = await fetchMainUserData(user.uid);
    if (!userData) {
      await promotePendingRegistration(user.uid, user.email);
      userData = await fetchMainUserData(user.uid);
    }
    if (!userData) {
      await sleep(250);
      await promotePendingRegistration(user.uid, user.email);
      userData = await fetchMainUserData(user.uid);
    }

    if (userData) {
      return { user, userData };
    }

    throw new Error('Kullanıcı verisi bulunamadı.');
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'EMAIL_NOT_VERIFIED') {
      throw error;
    }
    throw new Error(getFirebaseErrorMessage(error, 'Giriş sırasında bir hata oluştu.'));
  }
}

// DoÄŸrulama kodunu tekrar gÃ¶nder (SMTP, geçici cluster)
export async function resendVerificationEmail(email: string, password: string): Promise<void> {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (user.emailVerified) {
      await signOut(auth);
      throw new Error('E-posta zaten doğrulanmış. Giriş yapabilirsiniz.');
    }
    await sendRegistrationVerificationEmailAfterRegister(user);
    await signOut(auth);
  } catch (error: unknown) {
    throw new Error(getFirebaseErrorMessage(error, 'Doğrulama e-postası gönderilemedi.'));
  }
}

// Ã‡Ä±kÄ±ÅŸ yap
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: unknown) {
    throw new Error(getFirebaseErrorMessage(error, 'Çıkış sırasında bir hata oluştu.'));
  }
}

// KullanÄ±cÄ± durumunu gÃ¼ncelle (Admin iÃ§in)
export async function updateUserStatus(
  userId: string,
  userType: 'brand' | 'influencer',
  status: 'do\u011frulanmad\u0131' | 'beklemede' | 'onayland\u0131' | 'reddedildi'
): Promise<void> {
  try {
    const path = userType === 'brand' ? `brands/${userId}` : `influencers/${userId}`;
    await update(ref(database, path), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    throw new Error(getFirebaseErrorMessage(error, 'Durum güncellenirken bir hata oluştu.'));
  }
}

// TÃ¼m markalarÄ± getir (Admin iÃ§in)
export async function getAllBrands(): Promise<BrandData[]> {
  try {
    const snapshot = await get(ref(database, 'brands'));
    if (snapshot.exists()) {
      const brandsObj = snapshot.val();
      return Object.values(brandsObj) as BrandData[];
    }
    return [];
  } catch (error: unknown) {
    throw new Error(getFirebaseErrorMessage(error, 'Markalar getirilirken bir hata oluştu.'));
  }
}

// TÃ¼m influencer'larÄ± getir (Admin iÃ§in)
export async function getAllInfluencers(): Promise<InfluencerData[]> {
  try {
    const snapshot = await get(ref(database, 'influencers'));
    if (snapshot.exists()) {
      const influencersObj = snapshot.val();
      const influencers = Object.values(influencersObj) as InfluencerData[];
      // Eski kayÄ±tlÄ± kullanÄ±cÄ±lar iÃ§in subscriptionType varsayÄ±lan deÄŸeri
      return influencers.map(inf => ({
        ...inf,
        subscriptionType: inf.subscriptionType || 'defaultUser',
      }));
    }
    return [];
  } catch (error: unknown) {
    throw new Error(getFirebaseErrorMessage(error, "Influencer'lar getirilirken bir hata oluştu."));
  }
}

// KullanÄ±cÄ± bilgilerini getir
export async function getUserData(
  userId: string,
  userType: 'brand' | 'influencer'
): Promise<BrandData | InfluencerData | null> {
  try {
    const path = userType === 'brand' ? `brands/${userId}` : `influencers/${userId}`;
    const snapshot = await get(ref(database, path));
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Influencer iÃ§in eski kayÄ±tlÄ± kullanÄ±cÄ±lar iÃ§in subscriptionType varsayÄ±lan deÄŸeri
      if (userType === 'influencer' && !data.subscriptionType) {
        data.subscriptionType = 'defaultUser';
      }
      return data;
    }
    return null;
  } catch (error: unknown) {
    throw new Error(getFirebaseErrorMessage(error, 'Kullanıcı verisi getirilirken bir hata oluştu.'));
  }
}



export function isUserVerified(status?: string): boolean {
  return isVerificationApproved(status);
}






