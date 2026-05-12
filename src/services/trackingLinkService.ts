const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
const TRACKING_BASE_URL = import.meta.env.VITE_TRACKING_BASE_URL || 'http://localhost:3002';

export interface TrackingLink {
  shortCode: string;
  offerId: string;
  campaignId: string;
  brandId: string;
  influencerId: string;
  platform: string;
  targetUrl: string;
  createdAt: string;
  isActive: boolean;
  clickCount?: number;
  trackingUrl?: string;
}

export interface CreateTrackingLinkData {
  offerId: string;
  targetUrl: string;
  platform?: string;
}

/**
 * Tracking link oluştur
 */
export async function createTrackingLink(
  data: CreateTrackingLinkData
): Promise<{ shortCode: string; trackingUrl: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tracking-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Tracking link oluşturulurken bir hata oluştu');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Tracking link oluşturma hatası:', error);
    throw new Error(error.message || 'Tracking link oluşturulurken bir hata oluştu');
  }
}

/**
 * Offer'a ait tracking link'i getir
 */
export async function getTrackingLinkByOfferId(offerId: string): Promise<TrackingLink | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tracking-links/offer/${offerId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      throw new Error(error.message || 'Tracking link getirilirken bir hata oluştu');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Tracking link getirme hatası:', error);
    return null;
  }
}
