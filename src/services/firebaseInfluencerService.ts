import { ref, get, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { getFirebaseErrorMessage } from '@/lib/firebaseErrorMessages';
import type { InfluencerAudienceMatch } from '@/lib/influencerAudienceMatch';
import { normalizeInfluencerPlatformsToArray, type InfluencerPlatformEntry } from '@/lib/influencerPlatforms';
import { uploadFile, deleteFile } from '@/services/firebaseStorageService';

export interface InfluencerProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  profilePhotoURL?: string;
  bio?: string;
  portfolio?: Array<{
    url: string;
    type: 'image' | 'pdf';
    name: string;
    storagePath?: string; // Storage'dan silmek için
  }>;
  
  // Sosyal medya platformları - Firebase'de array veya object olabilir
  platforms: 
    | Array<{ id: string; username: string; followers?: number; followersUpdated?: boolean }>
      | {
        instagram?: {
          username: string;
          followers: number;
          followersUpdated?: boolean;
        };
        tiktok?: {
          username: string;
          followers: number;
          followersUpdated?: boolean;
        };
        youtube?: {
          username: string;
          followers: number;
          followersUpdated?: boolean;
        };
        twitter?: {
          username: string;
          followers: number;
          followersUpdated?: boolean;
        };
        pinterest?: {
          username: string;
          followers: number;
          followersUpdated?: boolean;
        };
        snapchat?: {
          username: string;
          followers: number;
          followersUpdated?: boolean;
        };
        twitch?: {
          username: string;
          followers: number;
          followersUpdated?: boolean;
        };
        kick?: {
          username: string;
          followers: number;
          followersUpdated?: boolean;
        };
        linkedin?: {
          username: string;
          followers: number;
          followersUpdated?: boolean;
        };
      };
  
  // İlgi alanları
  categories: string[];
  subCategories?: Record<string, string[]>;
  
  // Fiyatlandırma
  averageAdPrice?: number;
  contentPricing?: {
    post?: number;
    story?: number;
    reels?: number;
    video?: number;
  };
  
  // Kayıt bilgileri
  followerRange: string;
  verificationPhotoURL?: string;
  verificationDocumentURL?: string;
  status: 'doğrulanmadı' | 'beklemede' | 'onaylandı' | 'reddedildi';
  verificationRequestStatus?: 'yok' | 'beklemede' | 'onaylandı' | 'reddedildi';
  /** Ödeme / vergi istisna doğrulaması (para çekme). */
  payoutProfile?: {
    verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    taxDocumentURL?: string;
    iban?: string;
    /** Havale/EFT için banka hesabı adı (tam) */
    payoutAccountFullName?: string | null;
    submittedAt?: string;
    verifiedAt?: string;
    rejectionReason?: string;
  };
  userType: 'influencer';
  subscriptionType?: 'defaultUser' | 'premiumUser'; // Abonelik tipi
  /** Marka kampanya hedef kitlesi alanları ile uyumlu eşleşme anketi (kurulum) */
  audienceMatch?: InfluencerAudienceMatch | null;
  createdAt: string;
  updatedAt: string;
}

// Influencer profilini getir
export async function getInfluencerProfile(influencerId: string): Promise<InfluencerProfile | null> {
  try {
    const influencerRef = ref(database, `influencers/${influencerId}`);
    const snapshot = await get(influencerRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Eski kayıtlı kullanıcılar için subscriptionType varsayılan değeri
      if (!data.subscriptionType) {
        data.subscriptionType = 'defaultUser';
      }
      return data as InfluencerProfile;
    }

    return null;
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error, 'Profil getirilirken bir hata oluştu.'));
  }
}

// Influencer profilini güncelle
export async function updateInfluencerProfile(
  influencerId: string,
  updates: Partial<Omit<InfluencerProfile, 'id' | 'email' | 'userType' | 'createdAt'>>
): Promise<void> {
  try {
    const influencerRef = ref(database, `influencers/${influencerId}`);
    await update(influencerRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error, 'Profil güncellenirken bir hata oluştu.'));
  }
}

// Profil fotoğrafı yükle
export async function uploadProfilePhoto(
  influencerId: string,
  file: File
): Promise<string> {
  try {
    const photoURL = await uploadFile(file, `profile-photos/${influencerId}`);
    
    // Profilde güncelle
    await updateInfluencerProfile(influencerId, {
      profilePhotoURL: photoURL,
    });
    
    return photoURL;
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error, 'Profil fotoğrafı yüklenirken bir hata oluştu.'));
  }
}

// Profil fotoğrafını sil
export async function deleteProfilePhoto(influencerId: string): Promise<void> {
  try {
    // Mevcut fotoğrafı al
    const profile = await getInfluencerProfile(influencerId);
    
    if (profile?.profilePhotoURL) {
      // Storage'dan sil
      await deleteFile(profile.profilePhotoURL);
      
      // Profilde güncelle
      await updateInfluencerProfile(influencerId, {
        profilePhotoURL: undefined,
      });
    }
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error, 'Profil fotoğrafı silinirken bir hata oluştu.'));
  }
}

// Platform bilgilerini güncelle (RTDB'de `platforms` dizi formatında tutulur)
export async function updatePlatformInfo(
  influencerId: string,
  platform: string,
  username: string,
  followers: number
): Promise<void> {
  try {
    const profile = await getInfluencerProfile(influencerId);

    if (!profile) {
      throw new Error('Profil bulunamadı');
    }

    const list = normalizeInfluencerPlatformsToArray(profile.platforms as unknown);
    const idx = list.findIndex((p) => p.id === platform);
    const next: InfluencerPlatformEntry =
      idx >= 0
        ? { ...list[idx], username, followers }
        : { id: platform, username, followers };
    const updatedPlatforms: InfluencerPlatformEntry[] =
      idx >= 0 ? list.map((p, i) => (i === idx ? next : p)) : [...list, next];

    await updateInfluencerProfile(influencerId, {
      platforms: updatedPlatforms as InfluencerProfile['platforms'],
    });
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error, 'Platform bilgisi güncellenirken bir hata oluştu.'));
  }
}

// Abonelik tipini güncelle
export async function updateSubscriptionType(
  influencerId: string,
  subscriptionType: 'defaultUser' | 'premiumUser'
): Promise<void> {
  try {
    await updateInfluencerProfile(influencerId, {
      subscriptionType,
    });
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error, 'Abonelik tipi güncellenirken bir hata oluştu.'));
  }
}

// Platform bilgisini sil
export async function removePlatform(influencerId: string, platform: string): Promise<void> {
  try {
    const profile = await getInfluencerProfile(influencerId);

    if (!profile) {
      throw new Error('Profil bulunamadı');
    }

    const list = normalizeInfluencerPlatformsToArray(profile.platforms as unknown).filter(
      (p) => p.id !== platform
    );

    await updateInfluencerProfile(influencerId, {
      platforms: list as InfluencerProfile['platforms'],
    });
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error, 'Platform silinirken bir hata oluştu.'));
  }
}

// İlgi alanlarını güncelle
export async function updateCategories(
  influencerId: string,
  categories: string[]
): Promise<void> {
  try {
    await updateInfluencerProfile(influencerId, {
      categories,
    });
  } catch (error: any) {
    console.error('İlgi alanları güncelleme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'İlgi alanları güncellenirken bir hata oluştu.'));
  }
}

// Ortalama reklam fiyatını güncelle
export async function updateAverageAdPrice(
  influencerId: string,
  price: number
): Promise<void> {
  try {
    await updateInfluencerProfile(influencerId, {
      averageAdPrice: price,
    });
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error, 'Fiyat güncellenirken bir hata oluştu.'));
  }
}


