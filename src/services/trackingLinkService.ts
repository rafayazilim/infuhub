import { ref, get } from 'firebase/database';
import { database } from '@/config/firebase';
import { getFirebaseErrorMessage } from '@/lib/firebaseErrorMessages';
import { getAuthHeaders } from '@/services/authToken';
import { buildApiUrl, getTrackingPublicBaseUrl } from '@/lib/apiConfig';

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

export async function createTrackingLink(
  data: CreateTrackingLinkData
): Promise<{ shortCode: string; trackingUrl: string }> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(buildApiUrl('/tracking-links'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(
        getFirebaseErrorMessage(errBody, 'Tracking link oluşturulurken bir hata oluştu.')
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error: unknown) {
    console.error('Tracking link oluşturma hatası:', error);
    throw new Error(getFirebaseErrorMessage(error, 'Tracking link oluşturulurken bir hata oluştu.'));
  }
}

export async function getTrackingLinkByOfferId(offerId: string): Promise<TrackingLink | null> {
  try {
    const snapshot = await get(ref(database, 'tracking_links'));
    if (snapshot.exists()) {
      const links = snapshot.val() as Record<string, TrackingLink>;
      const matched = Object.values(links).filter((link) => link.offerId === offerId);

      if (matched.length > 0) {
        const active = matched.find((link) => link.isActive === true) || matched[0];
        return {
          ...active,
          clickCount: active.clickCount || 0,
          trackingUrl: active.trackingUrl || `${getTrackingPublicBaseUrl()}/c/${active.shortCode}`,
        };
      }
    }

    const authHeaders = await getAuthHeaders();
    const response = await fetch(buildApiUrl(`/tracking-links/offer/${offerId}`), {
      headers: {
        ...authHeaders,
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errBody = await response.json().catch(() => ({}));
      throw new Error(
        getFirebaseErrorMessage(errBody, 'Tracking link getirilirken bir hata oluştu.')
      );
    }

    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Tracking link getirme hatası:', error);
    return null;
  }
}
