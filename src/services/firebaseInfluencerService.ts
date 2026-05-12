import { ref, get, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { uploadFile, deleteFile } from '@/services/firebaseStorageService';

export interface InfluencerProfile {
  id: string;
  fullName: string;
  email: string;
  profilePhotoURL?: string;
  bio?: string;
  
  // Sosyal medya platformları - Firebase'de array veya object olabilir
  platforms: 
    | Array<{ id: string; username: string; followers?: number }>
    | {
        instagram?: {
          username: string;
          followers: number;
        };
        tiktok?: {
          username: string;
          followers: number;
        };
        youtube?: {
          username: string;
          followers: number;
        };
        twitter?: {
          username: string;
          followers: number;
        };
      };
  
  // İlgi alanları
  categories: string[];
  
  // Fiyatlandırma
  averageAdPrice?: number;
  
  // Kayıt bilgileri
  followerRange: string;
  verificationPhotoURL?: string;
  status: 'beklemede' | 'onaylandı' | 'reddedildi';
  userType: 'influencer';
  createdAt: string;
  updatedAt: string;
}

// Influencer profilini getir
export async function getInfluencerProfile(influencerId: string): Promise<InfluencerProfile | null> {
  try {
    console.log('🔥 Firebase: Getting profile for:', influencerId);
    const influencerRef = ref(database, `influencers/${influencerId}`);
    const snapshot = await get(influencerRef);

    console.log('🔥 Firebase: Snapshot exists?', snapshot.exists());
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('🔥 Firebase: Profile data:', data);
      return data as InfluencerProfile;
    }

    console.log('🔥 Firebase: No profile found');
    return null;
  } catch (error: any) {
    console.error('🔥 Firebase ERROR:', error);
    throw new Error(error.message || 'Profil getirilirken bir hata oluştu');
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
    console.error('Profil güncelleme hatası:', error);
    throw new Error(error.message || 'Profil güncellenirken bir hata oluştu');
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
    console.error('Profil fotoğrafı yükleme hatası:', error);
    throw new Error(error.message || 'Profil fotoğrafı yüklenirken bir hata oluştu');
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
    console.error('Profil fotoğrafı silme hatası:', error);
    throw new Error(error.message || 'Profil fotoğrafı silinirken bir hata oluştu');
  }
}

// Platform bilgilerini güncelle
export async function updatePlatformInfo(
  influencerId: string,
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter',
  username: string,
  followers: number
): Promise<void> {
  try {
    const profile = await getInfluencerProfile(influencerId);
    
    if (!profile) {
      throw new Error('Profil bulunamadı');
    }
    
    const updatedPlatforms = {
      ...profile.platforms,
      [platform]: {
        username,
        followers,
      },
    };
    
    await updateInfluencerProfile(influencerId, {
      platforms: updatedPlatforms,
    });
  } catch (error: any) {
    console.error('Platform bilgisi güncelleme hatası:', error);
    throw new Error(error.message || 'Platform bilgisi güncellenirken bir hata oluştu');
  }
}

// Platform bilgisini sil
export async function removePlatform(
  influencerId: string,
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter'
): Promise<void> {
  try {
    const profile = await getInfluencerProfile(influencerId);
    
    if (!profile) {
      throw new Error('Profil bulunamadı');
    }
    
    const updatedPlatforms = { ...profile.platforms };
    delete updatedPlatforms[platform];
    
    await updateInfluencerProfile(influencerId, {
      platforms: updatedPlatforms,
    });
  } catch (error: any) {
    console.error('Platform silme hatası:', error);
    throw new Error(error.message || 'Platform silinirken bir hata oluştu');
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
    throw new Error(error.message || 'İlgi alanları güncellenirken bir hata oluştu');
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
    console.error('Fiyat güncelleme hatası:', error);
    throw new Error(error.message || 'Fiyat güncellenirken bir hata oluştu');
  }
}
