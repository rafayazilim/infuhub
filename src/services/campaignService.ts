const API_BASE_URL = 'http://localhost:3002/api';

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
  const response = await fetch(`${API_BASE_URL}/campaigns/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetch(`${API_BASE_URL}/campaigns/brand/${brandId}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Kampanyalar getirilemedi');
  }

  return data.data.filter((c: Campaign) => !c.deletedAt);
}

// Get campaign by ID
export async function getCampaignById(campaignId: string): Promise<Campaign> {
  const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`);
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
  const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
    method: 'DELETE',
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
  const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/status`, {
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

// Get matched influencers for campaign
export async function getMatchedInfluencers(campaignId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/matched-influencers`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Influencer\'lar getirilemedi');
  }

  return data.data;
}

// Get campaign stats
export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/stats`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'İstatistikler getirilemedi');
  }

  return data.data;
}
