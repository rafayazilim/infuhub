import { getAuthHeaders } from '@/services/authToken';
import { serverApiUrl } from '@/lib/serverApiUrl';

export type TransactionalEventType =
  | 'brand_offer_created'
  | 'incoming_offer_created'
  | 'influencer_counter_created'
  | 'brand_counter_sent'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'content_uploaded'
  | 'content_share_link_set'
  | 'content_media_approved'
  | 'content_revision_requested'
  | 'content_approved'
  | 'content_rejected';

export async function sendTransactionalEventEmail(input: {
  eventType: TransactionalEventType;
  brandId: string;
  influencerId: string;
  campaignId: string;
  offerId: string;
  rootOfferId?: string;
  price?: number;
}): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.Authorization) return;

    const response = await fetch(serverApiUrl('/api/transactional-events/email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.warn('Transactional event mail gönderilemedi:', payload?.message || response.statusText);
    }
  } catch (error) {
    console.warn('Transactional event mail atlandı:', error);
  }
}
