const API_BASE_URL = 'http://localhost:3002/api';

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
  const response = await fetch(`${API_BASE_URL}/offers/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetch(`${API_BASE_URL}/offers/brand/${brandId}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Teklifler getirilemedi');
  }

  return data.data;
}

// Get offer by ID
export async function getOfferById(offerId: string): Promise<Offer> {
  const response = await fetch(`${API_BASE_URL}/offers/${offerId}`);
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
  const response = await fetch(`${API_BASE_URL}/offers/${offerId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetch(`${API_BASE_URL}/offers/stats/${brandId}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'İstatistikler getirilemedi');
  }

  return data.data;
}
