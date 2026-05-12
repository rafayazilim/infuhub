const API_BASE_URL = 'http://localhost:3002/api';

export interface SocialPlatform {
  id: 'instagram' | 'tiktok' | 'youtube' | 'twitter';
  username: string;
  followers?: number;
}

export interface Influencer {
  id: string;
  fullName: string;
  email: string;
  platforms: SocialPlatform[];
  followerRange: string;
  categories: string[];
  verificationPhoto: string;
  status: 'onaylandı' | 'beklemede' | 'reddedildi';
  createdAt: string;
  updatedAt?: string;
}

export interface InfluencerFilters {
  platforms?: string[];
  followerRange?: string[];
  categories?: string[];
  searchQuery?: string;
}

// Get all influencers
export async function getAllInfluencers(): Promise<Influencer[]> {
  const response = await fetch(`${API_BASE_URL}/influencers`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Influencer\'lar getirilemedi');
  }

  return data.data;
}

// Get approved influencers only
export async function getApprovedInfluencers(): Promise<Influencer[]> {
  const influencers = await getAllInfluencers();
  return influencers.filter(inf => inf.status === 'onaylandı');
}

// Filter influencers
export function filterInfluencers(
  influencers: Influencer[],
  filters: InfluencerFilters
): Influencer[] {
  let filtered = [...influencers];

  // Filter by platforms
  if (filters.platforms && filters.platforms.length > 0) {
    filtered = filtered.filter(inf =>
      inf.platforms.some(p => filters.platforms!.includes(p.id))
    );
  }

  // Filter by follower range
  if (filters.followerRange && filters.followerRange.length > 0) {
    filtered = filtered.filter(inf =>
      filters.followerRange!.includes(inf.followerRange)
    );
  }

  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(inf =>
      inf.categories.some(cat => filters.categories!.includes(cat))
    );
  }

  // Filter by search query
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(inf =>
      inf.fullName.toLowerCase().includes(query) ||
      inf.email.toLowerCase().includes(query) ||
      inf.categories.some(cat => cat.toLowerCase().includes(query))
    );
  }

  return filtered;
}
