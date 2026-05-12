import { getAuthHeaders } from '@/services/authToken';
import { buildApiUrl } from '@/lib/apiConfig';

export interface Campaign {
  id?: string;
  brandId: string;
  title?: string;
  productInfo: string;
  duration: string;
  targetAudience: string;
  budget: number;
  platforms: string[];
  contentFormats: string[];
  description?: string;
  status?: 'aktif' | 'tamamlandı' | 'iptal' | 'taslak';
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface CampaignStats {
  totalOffers: number;
  acceptedOffers: number;
  pendingOffers: number;
  spentBudget: number;
}

// Create campaign
export async function createCampaign(campaign: Campaign): Promise<Campaign> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl('/campaigns/create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(campaign),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Kampanya oluşturulamadı');
  }

  return data.data;
}

// Get campaigns by brand
export async function getCampaignsByBrand(brandId: string): Promise<Campaign[]> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/campaigns/brand/${brandId}`), {
    headers: {
      ...authHeaders,
    },
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Kampanyalar getirilemedi');
  }

  return data.data.filter((c: Campaign) => !c.deletedAt);
}

// Get campaign by ID
export async function getCampaignById(campaignId: string): Promise<Campaign> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/campaigns/${campaignId}`), {
    headers: {
      ...authHeaders,
    },
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Kampanya bulunamadı');
  }

  return data.data;
}

// Update campaign
export async function updateCampaign(
  campaignId: string,
  updates: Partial<Campaign>
): Promise<Campaign> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/campaigns/${campaignId}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Kampanya güncellenemedi');
  }

  return data.data;
}

// Delete campaign (soft delete)
export async function deleteCampaign(campaignId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/campaigns/${campaignId}`), {
    method: 'DELETE',
    headers: {
      ...authHeaders,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Kampanya silinemedi');
  }
}

// Update campaign status
export async function updateCampaignStatus(
  campaignId: string,
  status: 'aktif' | 'tamamlandı' | 'iptal' | 'taslak'
): Promise<Campaign> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/campaigns/${campaignId}/status`), {
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

// Get matched influencers for campaign
export async function getMatchedInfluencers(campaignId: string): Promise<any[]> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/campaigns/${campaignId}/matched-influencers`), {
    headers: {
      ...authHeaders,
    },
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Influencer\'lar getirilemedi');
  }

  return data.data;
}

// Get campaign stats
export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(buildApiUrl(`/campaigns/${campaignId}/stats`), {
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


