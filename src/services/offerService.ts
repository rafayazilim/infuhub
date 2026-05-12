import { getAuthHeaders } from '@/services/authToken';
import { buildApiUrl } from '@/lib/apiConfig';

export interface Offer {
  id?: string;
  campaignId: string;
  brandId: string;
  influencerId: string;
  price: number;
  contentFormat: string;
  deliveryDate: string;
  campaignLink?: string;
  notes?: string;
  status?: 'beklemede' | 'kabul' | 'red';
  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string;
  campaign?: {
    id: string;
    title: string;
  };
  influencer?: {
    id: string;
    fullName: string;
  };
}

export interface OfferFilters {
  status?: string[];
  campaignId?: string;
  dateRange?: { start: string; end: string };
}

// Send offer to influencer
export async function sendOffer(offer: Offer): Promise<Offer> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl('/offers/send'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(offer),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Teklif gönderilemedi');
  }

  return data.data;
}

// Get offers by brand
export async function getOffersByBrand(brandId: string): Promise<Offer[]> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/offers/brand/${brandId}`), {
    headers: {
      ...authHeaders,
    },
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Teklifler getirilemedi');
  }

  return data.data;
}

// Get offer by ID
export async function getOfferById(offerId: string): Promise<Offer> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/offers/${offerId}`), {
    headers: {
      ...authHeaders,
    },
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Teklif bulunamadı');
  }

  return data.data;
}

// Update offer status
export async function updateOfferStatus(
  offerId: string,
  status: 'beklemede' | 'kabul' | 'red'
): Promise<Offer> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/offers/${offerId}/status`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Durum güncellenemedi');
  }

  return data.data;
}

// Get offer stats for brand
export async function getOfferStats(brandId: string): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/offers/stats/${brandId}`), {
    headers: {
      ...authHeaders,
    },
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'İstatistikler getirilemedi');
  }

  return data.data;
}


