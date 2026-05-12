import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
} from 'firebase/auth';
import { ref, set, get, update } from 'firebase/database';
import { auth, database } from '@/config/firebase';

export interface BrandData {
  id: string;
  brandName: string;
  email: string;
  industry: string;
  budget: number;
  website?: string;
  status: 'beklemede' | 'onaylandı' | 'reddedildi';
  userType: 'brand';
  createdAt: string;
  updatedAt: string;
}

export interface InfluencerData {
  id: string;
  fullName: string;
  email: string;
  platforms: Array<{ id: string; username: string }>;
  followerRange: string;
  categories: string[];
  verificationPhotoURL?: string;
  status: 'beklemede' | 'onaylandı' | 'reddedildi';
  userType: 'influencer';
  createdAt: string;
  updatedAt: string;
}

// Marka kaydı
export async function registerBrand(
  email: string,
  password: string,
  brandData: Omit<BrandData, 'id' | 'email' | 'status' | 'userType' | 'createdAt' | 'updatedAt'>
): Promise<{ user: User; brandData: BrandData }> {
  try {
    // Firebase Authentication ile kullanıcı oluştur
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Realtime Database'e marka bilgilerini kaydet
    const newBrandData: BrandData = {
      id: user.uid,
      email: user.email!,
      ...brandData,
      status: 'beklemede',
      userType: 'brand',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(ref(database, `brands/${user.uid}`), newBrandData);

    return { user, brandData: newBrandData };
  } catch (error: any) {
    console.error('Marka kaydı hatası:', error);
    throw new Error(error.message || 'Kayıt sırasında bir hata oluştu');
  }
}

// Influencer kaydı
export async function registerInfluencer(
  email: string,
  password: string,
  influencerData: Omit<
    InfluencerData,
    'id' | 'email' | 'status' | 'userType' | 'createdAt' | 'updatedAt'
  >
): Promise<{ user: User; influencerData: InfluencerData }> {
  try {
    // Firebase Authentication ile kullanıcı oluştur
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Realtime Database'e influencer bilgilerini kaydet
    const newInfluencerData: InfluencerData = {
      id: user.uid,
      email: user.email!,
      ...influencerData,
      status: 'beklemede',
      userType: 'influencer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(ref(database, `influencers/${user.uid}`), newInfluencerData);

    return { user, influencerData: newInfluencerData };
  } catch (error: any) {
    console.error('Influencer kaydı hatası:', error);
    throw new Error(error.message || 'Kayıt sırasında bir hata oluştu');
  }
}

// Giriş yap
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

    // Önce marka olarak kontrol et
    const brandSnapshot = await get(ref(database, `brands/${user.uid}`));
    if (brandSnapshot.exists()) {
      return { user, userData: brandSnapshot.val() as BrandData };
    }

    // Sonra influencer olarak kontrol et
    const influencerSnapshot = await get(ref(database, `influencers/${user.uid}`));
    if (influencerSnapshot.exists()) {
      return { user, userData: influencerSnapshot.val() as InfluencerData };
    }

    throw new Error('Kullanıcı verisi bulunamadı');
  } catch (error: any) {
    console.error('Giriş hatası:', error);
    throw new Error(error.message || 'Giriş sırasında bir hata oluştu');
  }
}

// Çıkış yap
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Çıkış hatası:', error);
    throw new Error(error.message || 'Çıkış sırasında bir hata oluştu');
  }
}

// Kullanıcı durumunu güncelle (Admin için)
export async function updateUserStatus(
  userId: string,
  userType: 'brand' | 'influencer',
  status: 'beklemede' | 'onaylandı' | 'reddedildi'
): Promise<void> {
  try {
    const path = userType === 'brand' ? `brands/${userId}` : `influencers/${userId}`;
    await update(ref(database, path), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Durum güncelleme hatası:', error);
    throw new Error(error.message || 'Durum güncellenirken bir hata oluştu');
  }
}

// Tüm markaları getir (Admin için)
export async function getAllBrands(): Promise<BrandData[]> {
  try {
    const snapshot = await get(ref(database, 'brands'));
    if (snapshot.exists()) {
      const brandsObj = snapshot.val();
      return Object.values(brandsObj) as BrandData[];
    }
    return [];
  } catch (error: any) {
    console.error('Markalar getirme hatası:', error);
    throw new Error(error.message || 'Markalar getirilirken bir hata oluştu');
  }
}

// Tüm influencer'ları getir (Admin için)
export async function getAllInfluencers(): Promise<InfluencerData[]> {
  try {
    const snapshot = await get(ref(database, 'influencers'));
    if (snapshot.exists()) {
      const influencersObj = snapshot.val();
      return Object.values(influencersObj) as InfluencerData[];
    }
    return [];
  } catch (error: any) {
    console.error('Influencer\'lar getirme hatası:', error);
    throw new Error(error.message || 'Influencer\'lar getirilirken bir hata oluştu');
  }
}

// Kullanıcı bilgilerini getir
export async function getUserData(
  userId: string,
  userType: 'brand' | 'influencer'
): Promise<BrandData | InfluencerData | null> {
  try {
    const path = userType === 'brand' ? `brands/${userId}` : `influencers/${userId}`;
    const snapshot = await get(ref(database, path));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error: any) {
    console.error('Kullanıcı verisi getirme hatası:', error);
    throw new Error(error.message || 'Kullanıcı verisi getirilirken bir hata oluştu');
  }
}
