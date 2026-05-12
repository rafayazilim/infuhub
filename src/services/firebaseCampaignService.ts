import { ref, set, get, update, push, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '@/config/firebase';

export interface FirebaseCampaign {
  id: string;
  brandId: string;
  title: string;
  productInfo: string;
  productDescription?: string;
  targetAudience: {
    ageRange?: string;
    interests?: string;
    location?: string;
  };
  budget: {
    total: number;
    perInfluencer?: number;
  };
  duration: {
    start?: string;
    end?: string;
    period?: string;
  };
  platforms: string[];
  contentFormats: string[];
  status: 'aktif' | 'taslak' | 'tamamlandı' | 'iptal';
  createdAt: string;
  updatedAt: string;
}

// Kampanya oluştur
export async function createCampaign(
  brandId: string,
  campaignData: Omit<FirebaseCampaign, 'id' | 'brandId' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<FirebaseCampaign> {
  try {
    // Yeni kampanya ID'si oluştur
    const campaignsRef = ref(database, `brands/${brandId}/campaigns`);
    const newCampaignRef = push(campaignsRef);
    const campaignId = newCampaignRef.key!;

    const newCampaign: FirebaseCampaign = {
      id: campaignId,
      brandId,
      ...campaignData,
      status: 'aktif',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(newCampaignRef, newCampaign);

    return newCampaign;
  } catch (error: any) {
    console.error('Kampanya oluşturma hatası:', error);
    throw new Error(error.message || 'Kampanya oluşturulurken bir hata oluştu');
  }
}

// Marka kampanyalarını getir
export async function getBrandCampaigns(brandId: string): Promise<FirebaseCampaign[]> {
  try {
    const campaignsRef = ref(database, `brands/${brandId}/campaigns`);
    const snapshot = await get(campaignsRef);

    if (snapshot.exists()) {
      const campaignsObj = snapshot.val();
      return Object.values(campaignsObj) as FirebaseCampaign[];
    }

    return [];
  } catch (error: any) {
    console.error('Kampanyalar getirme hatası:', error);
    throw new Error(error.message || 'Kampanyalar getirilirken bir hata oluştu');
  }
}

// Tek kampanya getir
export async function getCampaignById(
  brandId: string,
  campaignId: string
): Promise<FirebaseCampaign | null> {
  try {
    const campaignRef = ref(database, `brands/${brandId}/campaigns/${campaignId}`);
    const snapshot = await get(campaignRef);

    if (snapshot.exists()) {
      return snapshot.val() as FirebaseCampaign;
    }

    return null;
  } catch (error: any) {
    console.error('Kampanya getirme hatası:', error);
    throw new Error(error.message || 'Kampanya getirilirken bir hata oluştu');
  }
}

// Kampanya güncelle
export async function updateCampaign(
  brandId: string,
  campaignId: string,
  updates: Partial<Omit<FirebaseCampaign, 'id' | 'brandId' | 'createdAt'>>
): Promise<void> {
  try {
    const campaignRef = ref(database, `brands/${brandId}/campaigns/${campaignId}`);
    await update(campaignRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Kampanya güncelleme hatası:', error);
    throw new Error(error.message || 'Kampanya güncellenirken bir hata oluştu');
  }
}

// Kampanya durumunu güncelle
export async function updateCampaignStatus(
  brandId: string,
  campaignId: string,
  status: 'aktif' | 'taslak' | 'tamamlandı' | 'iptal'
): Promise<void> {
  try {
    const campaignRef = ref(database, `brands/${brandId}/campaigns/${campaignId}`);
    await update(campaignRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Kampanya durum güncelleme hatası:', error);
    throw new Error(error.message || 'Kampanya durumu güncellenirken bir hata oluştu');
  }
}

// Kampanya sil (soft delete)
export async function deleteCampaign(brandId: string, campaignId: string): Promise<void> {
  try {
    const campaignRef = ref(database, `brands/${brandId}/campaigns/${campaignId}`);
    await update(campaignRef, {
      status: 'iptal',
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Kampanya silme hatası:', error);
    throw new Error(error.message || 'Kampanya silinirken bir hata oluştu');
  }
}

// Kampanya istatistikleri getir
export async function getCampaignStats(
  brandId: string,
  campaignId: string
): Promise<{
  totalOffers: number;
  acceptedOffers: number;
  pendingOffers: number;
  spentBudget: number;
}> {
  try {
    // TODO: Teklifler sistemi eklendiğinde bu fonksiyon güncellenecek
    return {
      totalOffers: 0,
      acceptedOffers: 0,
      pendingOffers: 0,
      spentBudget: 0,
    };
  } catch (error: any) {
    console.error('Kampanya istatistikleri getirme hatası:', error);
    throw new Error(error.message || 'İstatistikler getirilirken bir hata oluştu');
  }
}

// Dashboard için kampanya özetleri
export async function getCampaignSummary(brandId: string): Promise<{
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  draftCampaigns: number;
}> {
  try {
    const campaigns = await getBrandCampaigns(brandId);

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === 'aktif').length,
      completedCampaigns: campaigns.filter((c) => c.status === 'tamamlandı').length,
      draftCampaigns: campaigns.filter((c) => c.status === 'taslak').length,
    };
  } catch (error: any) {
    console.error('Kampanya özeti getirme hatası:', error);
    throw new Error(error.message || 'Kampanya özeti getirilirken bir hata oluştu');
  }
}
