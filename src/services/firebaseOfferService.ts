import { ref, set, get, update, push, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '@/config/firebase';

export interface FirebaseOffer {
  id: string;
  campaignId: string;
  brandId: string;
  influencerId: string;
  price: number;
  message?: string;
  contentLink?: string;
  revisions?: Record<string, { note: string; createdAt: string }>;
  status: 'beklemede' | 'kabul' | 'red';
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

export interface CreateOfferData {
  campaignId: string;
  brandId: string;
  influencerId: string;
  price: number;
  message?: string;
}

// Teklif oluştur
export async function createOffer(offerData: CreateOfferData): Promise<FirebaseOffer> {
  try {
    const offersRef = ref(database, 'offers');
    const newOfferRef = push(offersRef);
    
    const newOffer: FirebaseOffer = {
      id: newOfferRef.key!,
      ...offerData,
      status: 'beklemede',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(newOfferRef, newOffer);
    return newOffer;
  } catch (error: any) {
    console.error('Teklif oluşturma hatası:', error);
    throw new Error(error.message || 'Teklif oluşturulurken bir hata oluştu');
  }
}

// Kampanyaya ait teklifleri getir
export async function getOffersByCampaign(campaignId: string): Promise<FirebaseOffer[]> {
  try {
    const offersRef = ref(database, 'offers');
    const snapshot = await get(offersRef);
    
    if (snapshot.exists()) {
      const offersObj = snapshot.val();
      const offers = Object.values(offersObj) as FirebaseOffer[];
      return offers.filter(offer => offer.campaignId === campaignId);
    }
    return [];
  } catch (error: any) {
    console.error('Teklifler getirme hatası:', error);
    throw new Error(error.message || 'Teklifler getirilirken bir hata oluştu');
  }
}

// Markaya ait tüm teklifleri getir
export async function getOffersByBrand(brandId: string): Promise<FirebaseOffer[]> {
  try {
    const offersRef = ref(database, 'offers');
    const snapshot = await get(offersRef);
    
    if (snapshot.exists()) {
      const offersObj = snapshot.val();
      const offers = Object.values(offersObj) as FirebaseOffer[];
      return offers.filter(offer => offer.brandId === brandId);
    }
    return [];
  } catch (error: any) {
    console.error('Teklifler getirme hatası:', error);
    throw new Error(error.message || 'Teklifler getirilirken bir hata oluştu');
  }
}

// Influencer'a ait teklifleri getir
export async function getOffersByInfluencer(influencerId: string): Promise<FirebaseOffer[]> {
  try {
    const offersRef = ref(database, 'offers');
    const snapshot = await get(offersRef);
    
    if (snapshot.exists()) {
      const offersObj = snapshot.val();
      const offers = Object.values(offersObj) as FirebaseOffer[];
      return offers.filter(offer => offer.influencerId === influencerId);
    }
    return [];
  } catch (error: any) {
    console.error('Teklifler getirme hatası:', error);
    throw new Error(error.message || 'Teklifler getirilirken bir hata oluştu');
  }
}

// Teklif durumunu güncelle
export async function updateOfferStatus(
  offerId: string,
  status: 'beklemede' | 'kabul' | 'red'
): Promise<void> {
  try {
    const offerRef = ref(database, `offers/${offerId}`);
    await update(offerRef, {
      status,
      updatedAt: new Date().toISOString(),
      respondedAt: status !== 'beklemede' ? new Date().toISOString() : undefined,
    });
  } catch (error: any) {
    console.error('Teklif durumu güncelleme hatası:', error);
    throw new Error(error.message || 'Teklif durumu güncellenirken bir hata oluştu');
  }
}

// Offer icin icerik linki guncelle
export async function updateOfferContentLink(
  offerId: string,
  contentLink: string
): Promise<void> {
  try {
    const offerRef = ref(database, `offers/${offerId}`);
    await update(offerRef, {
      contentLink,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Icerik linki guncelleme hatasi:', error);
    throw new Error(error.message || 'Icerik linki guncellenirken bir hata olustu');
  }
}

// Offer icin revizyon notu ekle
export async function addOfferRevision(
  offerId: string,
  note: string
): Promise<void> {
  try {
    const revisionsRef = ref(database, `offers/${offerId}/revisions`);
    const newRevisionRef = push(revisionsRef);
    await set(newRevisionRef, {
      note,
      createdAt: new Date().toISOString(),
    });
    await update(ref(database, `offers/${offerId}`), {
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Revizyon ekleme hatasi:', error);
    throw new Error(error.message || 'Revizyon eklenirken bir hata olustu');
  }
}

// Belirli bir influencer'a bu kampanya için teklif gönderilmiş mi kontrol et
export async function checkOfferExists(campaignId: string, influencerId: string): Promise<boolean> {
  try {
    const offers = await getOffersByCampaign(campaignId);
    return offers.some(offer => offer.influencerId === influencerId);
  } catch (error) {
    return false;
  }
}

// Teklif istatistiklerini getir
export async function getOfferStats(brandId: string): Promise<{
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}> {
  try {
    const offers = await getOffersByBrand(brandId);
    return {
      total: offers.length,
      pending: offers.filter(o => o.status === 'beklemede').length,
      accepted: offers.filter(o => o.status === 'kabul').length,
      rejected: offers.filter(o => o.status === 'red').length,
    };
  } catch (error) {
    return { total: 0, pending: 0, accepted: 0, rejected: 0 };
  }
}
