import { ref, set, get, update, push, query, orderByChild, equalTo, remove } from 'firebase/database';
import { auth, database } from '@/config/firebase';
import { getFirebaseErrorMessage } from '@/lib/firebaseErrorMessages';
import { isVerificationApproved } from '@/lib/verificationStatus';
import { campaignHasAnyAcceptedOffer, getOffersByCampaign } from '@/services/firebaseOfferService';

export interface FirebaseCampaign {
  id: string;
  brandId: string;
  campaignModel?: 'social_post' | 'shared_link' | 'ugc_video' | 'collaboration';
  title: string;
  campaignName?: string;
  campaignGoal?: string;
  productInfo: string;
  productDescription?: string;
  campaignDescription?: string;
  campaignImageURL?: string;
  visibility?: 'public' | 'invite_only';
  isFixedOffer?: boolean;
  contentDetails?: string;
  applicationDeadline?: string;
  publishWindow?: {
    start?: string;
    end?: string;
  };
  contentFormatQuantities?: Record<string, number>;
  /** Yeni sepet: UGC = oran + süre; İşbirliği = platform + format (influencer başına 1 satır) */
  contentLines?: Array<
    | { id: string; kind: 'ugc'; aspectRatio: string; durationSec: number }
    | { id: string; kind: 'collab'; platform: string; contentFormat: string }
  >;
  targetAudience: {
    ageRange?: string;
    interests?: string;
    /** Kayıt alt kategorilerinden seçilen ürün / niş (çoklu) */
    productSubcategories?: string[];
    location?: string;
    gender?: 'female' | 'male' | 'all';
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
  savedInfluencers?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveCampaign extends FirebaseCampaign {
  brandName?: string;
  brandLogoURL?: string;
}

function endOfLocalDay(dateStr: string): Date | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfLocalDay(dateStr: string): Date | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Paylaşım penceresine göre yaşam döngüsü: başlangıç günü öncesi taslak, bitiş gününün sonundan sonra tamamlandı.
 * Erken manuel tamamlama (DB'de tamamlandı, tarihler henüz açık) korunur.
 * Paylaşım tarihi yoksa kayıtlı status kullanılır.
 */
export function getEffectiveCampaignStatus(c: FirebaseCampaign): FirebaseCampaign['status'] {
  if (c.status === 'iptal') return 'iptal';

  const start = c.publishWindow?.start || c.duration?.start;
  const end = c.publishWindow?.end || c.duration?.end;
  const now = Date.now();

  if (end) {
    const endEod = endOfLocalDay(end);
    if (endEod && now > endEod.getTime()) return 'tamamlandı';
  }

  if (c.status === 'tamamlandı') return 'tamamlandı';

  if (start) {
    const startSod = startOfLocalDay(start);
    if (startSod && now < startSod.getTime()) return 'taslak';
    return 'aktif';
  }

  return c.status;
}

const isCampaignLive = (campaign: FirebaseCampaign): boolean => {
  return getEffectiveCampaignStatus(campaign) === 'aktif';
};

/**
 * Influencer keşfet listesi: etkin status aktif veya taslak olan herkese açık kampanyalar.
 */
function isPublicActiveCampaignForInfluencer(c: FirebaseCampaign): boolean {
  const status = getEffectiveCampaignStatus(c);
  if (status !== 'aktif' && status !== 'taslak') return false;
  if (c.visibility === 'invite_only') return false;
  return true;
}

/** Son başvuru günü (dahil) hâlâ açık mı; tarih yoksa açık kabul. */
export function isCampaignApplicationDeadlineOpen(
  c: Pick<FirebaseCampaign, 'applicationDeadline'>
): boolean {
  if (!c.applicationDeadline?.trim()) return true;
  const eod = endOfLocalDay(c.applicationDeadline);
  if (!eod) return true;
  return Date.now() <= eod.getTime();
}

/**
 * Influencer bu kampanyaya yeni teklif gönderebilir mi (UI + servis eşiği).
 */
export function canInfluencerSubmitOfferOnCampaign(c: FirebaseCampaign): boolean {
  const status = getEffectiveCampaignStatus(c);
  if (status !== 'aktif' && status !== 'taslak') return false;
  if (c.visibility === 'invite_only') return false;
  return isCampaignApplicationDeadlineOpen(c);
}

// Kampanya oluştur
export async function createCampaign(
  brandId: string,
  campaignData: Omit<FirebaseCampaign, 'id' | 'brandId' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<FirebaseCampaign> {
  try {
    const brandStatusSnapshot = await get(ref(database, `brands/${brandId}/status`));
    if (!isVerificationApproved(brandStatusSnapshot.val())) {
      throw new Error('Kampanya oluşturmak için marka profilinizin admin tarafından onaylanması gerekir.');
    }

    // Yeni kampanya ID'si oluştur
    const campaignsRef = ref(database, `brands/${brandId}/campaigns`);
    const newCampaignRef = push(campaignsRef);
    const campaignId = newCampaignRef.key!;

    const newCampaign: FirebaseCampaign = {
      id: campaignId,
      brandId,
      ...campaignData,
      status: 'taslak',
      savedInfluencers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(newCampaignRef, newCampaign);

    return newCampaign;
  } catch (error: any) {
    console.error('Kampanya oluşturma hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Kampanya oluşturulurken bir hata oluştu.'));
  }
}

/**
 * Marka kampanyaları yüklenirken: paylaşım takvimine göre taslak / aktif / tamamlandı senkronize edilir.
 */
async function applyCampaignStatusTransitions(
  brandId: string,
  list: FirebaseCampaign[]
): Promise<FirebaseCampaign[]> {
  const updates: Promise<void>[] = [];
  const next = list.map((campaign) => {
    if (campaign.status === 'iptal') return campaign;
    const target = getEffectiveCampaignStatus(campaign);
    if (target !== campaign.status) {
      updates.push(updateCampaignStatus(brandId, campaign.id, target));
      return { ...campaign, status: target };
    }
    return campaign;
  });
  if (updates.length > 0) {
    await Promise.all(updates);
  }
  return next;
}

// Marka kampanyalarını getir (durum geçişleri veritabanına yazılır)
export async function getBrandCampaigns(brandId: string): Promise<FirebaseCampaign[]> {
  try {
    const campaignsRef = ref(database, `brands/${brandId}/campaigns`);
    const snapshot = await get(campaignsRef);

    if (snapshot.exists()) {
      const campaignsObj = snapshot.val();
      const list = Object.values(campaignsObj) as FirebaseCampaign[];
      return applyCampaignStatusTransitions(brandId, list);
    }

    return [];
  } catch (error: any) {
    console.error('Kampanyalar getirme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Kampanyalar getirilirken bir hata oluştu.'));
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
  } catch (error: unknown) {
    console.error('Kampanya getirme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Kampanya getirilirken bir hata oluştu.'));
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
    throw new Error(getFirebaseErrorMessage(error, 'Kampanya güncellenirken bir hata oluştu.'));
  }
}

// Kampanya durumunu güncelle
export async function updateCampaignStatus(
  brandId: string,
  campaignId: string,
  status: 'aktif' | 'taslak' | 'tamamlandı' | 'iptal'
): Promise<void> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || currentUserId !== brandId) {
      return;
    }
    const campaignRef = ref(database, `brands/${brandId}/campaigns/${campaignId}`);
    await update(campaignRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Kampanya durum güncelleme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Kampanya durumu güncellenirken bir hata oluştu.'));
  }
}

// Kampanya kaydedilen influencer listesi guncelle
export async function updateCampaignSavedInfluencers(
  brandId: string,
  campaignId: string,
  savedInfluencers: string[]
): Promise<void> {
  try {
    const campaignRef = ref(database, `brands/${brandId}/campaigns/${campaignId}`);
    await update(campaignRef, {
      savedInfluencers,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Kaydedilen influencer guncelleme hatasi:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Kaydedilen influencerlar güncellenirken bir hata oluştu.'));
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
  } catch (error: unknown) {
    console.error('Kampanya silme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Kampanya silinirken bir hata oluştu.'));
  }
}

/**
 * Kabul edilmiş teklif yoksa kampanyayı ve ilişkili global teklif kayıtlarını kalıcı siler.
 */
export async function deleteBrandCampaignPermanentlyIfAllowed(
  brandId: string,
  campaignId: string
): Promise<void> {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId || currentUserId !== brandId) {
    throw new Error('Bu işlem için yetkiniz yok.');
  }
  const hasAccepted = await campaignHasAnyAcceptedOffer(brandId, campaignId);
  if (hasAccepted) {
    throw new Error(
      'Bu kampanyada kabul edilmiş bir influencer anlaşması var. Kampanya silinemez.'
    );
  }
  try {
    const offers = await getOffersByCampaign(campaignId);
    await Promise.all(offers.map((o) => remove(ref(database, `offers/${o.id}`))));
    await remove(ref(database, `brands/${brandId}/campaigns/${campaignId}`));
  } catch (error: unknown) {
    console.error('Kampanya kalıcı silme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Kampanya silinirken bir hata oluştu.'));
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
    throw new Error(getFirebaseErrorMessage(error, 'İstatistikler getirilirken bir hata oluştu.'));
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
      activeCampaigns: campaigns.filter((c) => isCampaignLive(c)).length,
      completedCampaigns: campaigns.filter((c) => c.status === 'tamamlandı').length,
      draftCampaigns: campaigns.filter((c) => c.status === 'taslak').length,
    };
  } catch (error: any) {
    console.error('Kampanya özeti getirme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Kampanya özeti getirilirken bir hata oluştu.'));
  }
}

// Tüm markalardaki herkese açık aktif + taslak kampanyaları getir (influencer paneli keşif)
export async function getAllActiveCampaigns(): Promise<ActiveCampaign[]> {
  try {
    const brandsSnapshot = await get(ref(database, 'brands'));
    if (!brandsSnapshot.exists()) return [];

    const brandsObj = brandsSnapshot.val() as Record<string, any>;
    const activeCampaigns: ActiveCampaign[] = [];

    Object.entries(brandsObj).forEach(([brandId, brandValue]) => {
      const campaignsObj = brandValue?.campaigns as Record<string, FirebaseCampaign> | undefined;
      if (!campaignsObj) return;

      Object.entries(campaignsObj).forEach(([campaignId, campaignValue]) => {
        if (!campaignValue) return;
        if (!isPublicActiveCampaignForInfluencer(campaignValue)) return;

        activeCampaigns.push({
          ...campaignValue,
          id: campaignValue.id || campaignId,
          brandId: campaignValue.brandId || brandId,
          brandName: brandValue?.brandName || 'Bilinmeyen Marka',
          brandLogoURL: brandValue?.profilePhotoURL || '',
          status: getEffectiveCampaignStatus(campaignValue),
        });
      });
    });

    return activeCampaigns.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  } catch (error: any) {
    console.error('Aktif kampanyalar getirme hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Aktif kampanyalar getirilirken bir hata oluştu.'));
  }
}


