import { auth, database } from '@/config/firebase';
import {
  ref,
  get,
  set,
  update,
  push,
  onValue,
  Unsubscribe,
} from 'firebase/database';
import { createAppNotification, type AppNotificationType, type NotificationUserType } from '@/services/firebaseNotificationService';
import { sendTransactionalEventEmail, type TransactionalEventType } from '@/services/transactionalEventMailService';

export type ConversationUserType = 'brand' | 'influencer';
export type ChatMessageType = 'system' | 'user';

export interface Conversation {
  id: string;
  brandId: string;
  influencerId: string;
  campaignId: string;
  campaignTitle?: string;
  brandName?: string;
  brandPhotoURL?: string;
  influencerName?: string;
  influencerPhotoURL?: string;
  rootOfferId?: string;
  lastMessage?: string;
  lastMessageType?: ChatMessageType;
  lastMessageAt?: string;
  mergedInto?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: ConversationUserType | 'system';
  type: ChatMessageType;
  text: string;
  createdAt: string;
  metadata?: {
    offerId?: string;
    campaignId?: string;
    rootOfferId?: string;
    eventType?: string;
    price?: number;
  };
}

interface EnsureConversationInput {
  brandId: string;
  influencerId: string;
  campaignId: string;
  rootOfferId?: string;
}

interface SendOfferSystemMessageInput extends EnsureConversationInput {
  offerId: string;
  price?: number;
  eventType:
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
}

const formatTry = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
      }).format(value)
    : 'teklif';

const buildConversationId = (brandId: string, influencerId: string) =>
  `${brandId}_${influencerId}`;

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      if (val !== undefined) {
        clean[key] = stripUndefined(val);
      }
    });
    return clean as T;
  }
  return value;
}

const brandRecipientEvents = new Set<TransactionalEventType>([
  'incoming_offer_created',
  'influencer_counter_created',
  'content_uploaded',
  'content_share_link_set',
]);

const influencerRecipientEvents = new Set<TransactionalEventType>([
  'brand_offer_created',
  'brand_counter_sent',
  'content_media_approved',
  'content_revision_requested',
  'content_approved',
  'content_rejected',
]);

function resolveEventRecipient(input: SendOfferSystemMessageInput): {
  userType: NotificationUserType;
  userId: string;
} | null {
  if (input.eventType === 'offer_accepted' || input.eventType === 'offer_rejected') {
    const actorId = auth.currentUser?.uid;
    if (actorId === input.brandId) return { userType: 'influencer', userId: input.influencerId };
    if (actorId === input.influencerId) return { userType: 'brand', userId: input.brandId };
  }
  if (brandRecipientEvents.has(input.eventType)) {
    return { userType: 'brand', userId: input.brandId };
  }
  if (influencerRecipientEvents.has(input.eventType)) {
    return { userType: 'influencer', userId: input.influencerId };
  }
  return null;
}

function getNotificationType(eventType: TransactionalEventType): AppNotificationType {
  if (eventType.includes('content')) return eventType.includes('revision') ? 'revision' : 'content';
  if (eventType.includes('counter')) return 'counter_offer';
  if (eventType.includes('accepted') || eventType.includes('approved')) return 'approval';
  if (eventType.includes('offer')) return 'offer';
  return 'system';
}

function getNotificationTitle(eventType: TransactionalEventType): string {
  const titles: Record<TransactionalEventType, string> = {
    brand_offer_created: 'Yeni marka teklifi',
    incoming_offer_created: 'Yeni influencer teklifi',
    influencer_counter_created: 'Yeni karşı teklif',
    brand_counter_sent: 'Karşı teklif gönderildi',
    offer_accepted: 'Teklif kabul edildi',
    offer_rejected: 'Teklif reddedildi',
    content_uploaded: 'Yeni içerik yüklendi',
    content_share_link_set: 'Paylaşım linki eklendi',
    content_media_approved: 'Ham içerik onaylandı',
    content_revision_requested: 'Revizyon istendi',
    content_approved: 'İçerik onaylandı',
    content_rejected: 'İçerik reddedildi',
  };
  return titles[eventType] || 'Yeni bildirim';
}

const getConversationSortTime = (conversation: Conversation) =>
  new Date(
    conversation.lastMessageAt ||
      conversation.updatedAt ||
      conversation.createdAt ||
      0
  ).getTime();

const mergeLegacyConversations = async ({
  targetConversationId,
  brandId,
  influencerId,
}: {
  targetConversationId: string;
  brandId: string;
  influencerId: string;
}) => {
  try {
    const rowsSnap = await get(ref(database, 'conversations'));
    if (!rowsSnap.exists()) return;

    const allRows = Object.values(rowsSnap.val()) as Conversation[];
    const legacyRows = allRows.filter(
      (row) =>
        row.brandId === brandId &&
        row.influencerId === influencerId &&
        row.id !== targetConversationId &&
        !row.mergedInto
    );
    if (!legacyRows.length) return;

    const targetMessagesRef = ref(database, `conversations/${targetConversationId}/messages`);
    const targetMessagesSnap = await get(targetMessagesRef);
    const existingIds = new Set<string>();
    if (targetMessagesSnap.exists()) {
      const rows = Object.values(targetMessagesSnap.val()) as ChatMessage[];
      rows.forEach((row) => {
        if (row.id) existingIds.add(row.id);
      });
    }

    const latestLegacy = [...legacyRows].sort(
      (a, b) => getConversationSortTime(b) - getConversationSortTime(a)
    )[0];

    const copyTasks: Array<Promise<void>> = [];
    for (const legacy of legacyRows) {
      const legacyMessagesSnap = await get(ref(database, `conversations/${legacy.id}/messages`));
      if (!legacyMessagesSnap.exists()) {
        copyTasks.push(
          update(ref(database, `conversations/${legacy.id}`), {
            mergedInto: targetConversationId,
            archivedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
        continue;
      }

      const legacyMessages = Object.values(legacyMessagesSnap.val()) as ChatMessage[];
      for (const legacyMessage of legacyMessages) {
        const messageId = legacyMessage.id;
        if (!messageId || existingIds.has(messageId)) continue;
        existingIds.add(messageId);
        copyTasks.push(
          set(ref(database, `conversations/${targetConversationId}/messages/${messageId}`), {
            ...legacyMessage,
            conversationId: targetConversationId,
          })
        );
      }

      copyTasks.push(
        update(ref(database, `conversations/${legacy.id}`), {
          mergedInto: targetConversationId,
          archivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
    }

    if (latestLegacy) {
      copyTasks.push(
        update(ref(database, `conversations/${targetConversationId}`), {
          campaignId: latestLegacy.campaignId,
          campaignTitle: latestLegacy.campaignTitle || 'Kampanya',
          rootOfferId: latestLegacy.rootOfferId,
          lastMessage: latestLegacy.lastMessage,
          lastMessageType: latestLegacy.lastMessageType,
          lastMessageAt: latestLegacy.lastMessageAt,
          updatedAt: new Date().toISOString(),
        })
      );
    }

    if (copyTasks.length) {
      await Promise.all(copyTasks);
    }
  } catch (error) {
    console.warn('Legacy konuşma birleştirme atlandı:', error);
  }
};

const getCampaignTitle = async (brandId: string, campaignId: string) => {
  try {
    const campaignSnap = await get(ref(database, `brands/${brandId}/campaigns/${campaignId}`));
    if (!campaignSnap.exists()) return 'Kampanya';
    const value = campaignSnap.val();
    return value?.title || value?.productInfo || 'Kampanya';
  } catch {
    return 'Kampanya';
  }
};

const getBrandName = async (brandId: string) => {
  try {
    const snap = await get(ref(database, `brands/${brandId}`));
    if (!snap.exists()) return 'Marka';
    const value = snap.val();
    return value?.brandName || 'Marka';
  } catch {
    return 'Marka';
  }
};

const getBrandPhoto = async (brandId: string) => {
  try {
    const snap = await get(ref(database, `brands/${brandId}`));
    if (!snap.exists()) return '';
    const value = snap.val();
    return value?.profilePhotoURL || '';
  } catch {
    return '';
  }
};

const getInfluencerName = async (influencerId: string) => {
  try {
    const snap = await get(ref(database, `influencers/${influencerId}`));
    if (!snap.exists()) return 'Influencer';
    const value = snap.val();
    return value?.fullName || 'Influencer';
  } catch {
    return 'Influencer';
  }
};

const getInfluencerPhoto = async (influencerId: string) => {
  try {
    const snap = await get(ref(database, `influencers/${influencerId}`));
    if (!snap.exists()) return '';
    const value = snap.val();
    return value?.profilePhotoURL || '';
  } catch {
    return '';
  }
};

export async function ensureConversation(input: EnsureConversationInput): Promise<Conversation> {
  const { brandId, influencerId, campaignId, rootOfferId } = input;
  const id = buildConversationId(brandId, influencerId);
  const now = new Date().toISOString();
  const conversationRef = ref(database, `conversations/${id}`);
  const snapshot = await get(conversationRef);

  if (snapshot.exists()) {
    const existing = snapshot.val() as Conversation;
    const updates: Partial<Conversation> = { updatedAt: now };
    if (rootOfferId && !existing.rootOfferId) updates.rootOfferId = rootOfferId;
    if (campaignId) updates.campaignId = campaignId;
    if (existing.campaignId !== campaignId) {
      updates.campaignTitle = await getCampaignTitle(brandId, campaignId);
    }
    if (!existing.brandPhotoURL) updates.brandPhotoURL = await getBrandPhoto(brandId);
    if (!existing.influencerPhotoURL) updates.influencerPhotoURL = await getInfluencerPhoto(influencerId);
    if (Object.keys(updates).length > 0) {
      await update(conversationRef, updates);
    }
    await mergeLegacyConversations({
      targetConversationId: id,
      brandId,
      influencerId,
    });
    return { ...existing, ...updates } as Conversation;
  }

  const [campaignTitle, brandName, brandPhotoURL, influencerName, influencerPhotoURL] = await Promise.all([
    getCampaignTitle(brandId, campaignId),
    getBrandName(brandId),
    getBrandPhoto(brandId),
    getInfluencerName(influencerId),
    getInfluencerPhoto(influencerId),
  ]);

  const created: Conversation = {
    id,
    brandId,
    influencerId,
    campaignId,
    campaignTitle,
    brandName,
    brandPhotoURL,
    influencerName,
    influencerPhotoURL,
    rootOfferId,
    createdAt: now,
    updatedAt: now,
  };
  await set(conversationRef, created);
  await mergeLegacyConversations({
    targetConversationId: id,
    brandId,
    influencerId,
  });
  return created;
}

export async function sendConversationMessage(input: {
  conversationId: string;
  senderId: string;
  senderType: ConversationUserType;
  text: string;
}): Promise<void> {
  const message = input.text.trim();
  if (!message) return;

  const now = new Date().toISOString();
  const messagesRef = ref(database, `conversations/${input.conversationId}/messages`);
  const newMsgRef = push(messagesRef);
  const payload: ChatMessage = {
    id: newMsgRef.key!,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderType: input.senderType,
    type: 'user',
    text: message,
    createdAt: now,
  };

  await Promise.all([
    set(newMsgRef, payload),
    update(ref(database, `conversations/${input.conversationId}`), {
      lastMessage: message,
      lastMessageType: 'user',
      lastMessageAt: now,
      updatedAt: now,
    }),
  ]);
}

export async function sendOfferSystemMessage(input: SendOfferSystemMessageInput): Promise<void> {
  try {
    const conversation = await ensureConversation({
      brandId: input.brandId,
      influencerId: input.influencerId,
      campaignId: input.campaignId,
      rootOfferId: input.rootOfferId,
    });

    const priceLabel = formatTry(input.price);
    const campaignTitle = conversation.campaignTitle || 'Kampanya';
    const brandName = conversation.brandName || 'Marka';
    const influencerName = conversation.influencerName || 'Influencer';

    let text = '';
    if (input.eventType === 'brand_offer_created') {
      text = `${brandName}, ${campaignTitle} kampanyası için ${priceLabel} değerinde teklifte bulundu. Tıklayarak teklife gidebilirsiniz.`;
    } else if (input.eventType === 'incoming_offer_created') {
      text = `${influencerName}, ${campaignTitle} kampanyasına ${priceLabel} değerinde katılım teklifi gönderdi. Tıklayarak teklife gidebilirsiniz.`;
    } else if (input.eventType === 'influencer_counter_created') {
      text = `${influencerName}, ${campaignTitle} kampanyasındaki teklif için ${priceLabel} karşı teklif verdi. Tıklayarak teklife gidebilirsiniz.`;
    } else if (input.eventType === 'brand_counter_sent') {
      text = `${brandName}, ${campaignTitle} kampanyasındaki pazarlık için ${priceLabel} güncel teklif gönderdi. Tıklayarak teklife gidebilirsiniz.`;
    } else if (input.eventType === 'offer_accepted') {
      text = `${campaignTitle} kampanyasındaki teklif kabul edildi. Detayı görmek için teklife gidin.`;
    } else if (input.eventType === 'offer_rejected') {
      text = `${campaignTitle} kampanyasındaki teklif reddedildi. Detayı görmek için teklife gidin.`;
    } else if (input.eventType === 'content_uploaded') {
      text = `${influencerName}, ${campaignTitle} kampanyası için yeni ham içerik yükledi. İncelemek için içerik teslimine gidin.`;
    } else if (input.eventType === 'content_share_link_set') {
      text = `${influencerName}, ${campaignTitle} kampanyası için paylaşım linklerini ekledi. Final kontrol için içerik teslimine gidin.`;
    } else if (input.eventType === 'content_media_approved') {
      text = `${brandName}, ${campaignTitle} kampanyası için ham içeriğinizi onayladı. Paylaşım linki aşamasına geçebilirsiniz.`;
    } else if (input.eventType === 'content_revision_requested') {
      text = `${brandName}, ${campaignTitle} kampanyası için revizyon istedi. Detayları görüntüleyip yeni içerik yükleyin.`;
    } else if (input.eventType === 'content_approved') {
      text = `${brandName}, ${campaignTitle} kampanyası için gönderdiğiniz içeriği onayladı. ${priceLabel} tutarı çekim için kullanılabilir kazanç özetinize yansıdı.`;
    } else if (input.eventType === 'content_rejected') {
      text = `${brandName}, ${campaignTitle} kampanyası için gönderdiğiniz içeriği reddetti. Lütfen revizyon yapın.`;
    } else {
      text = `${campaignTitle} kampanyasındaki teklif reddedildi. Detayı görmek için teklife gidin.`;
    }

    const now = new Date().toISOString();
    const messagesRef = ref(database, `conversations/${conversation.id}/messages`);
    const msgRef = push(messagesRef);
    const payload: ChatMessage = stripUndefined({
      id: msgRef.key!,
      conversationId: conversation.id,
      senderId: 'system',
      senderType: 'system',
      type: 'system',
      text,
      createdAt: now,
      metadata: {
        offerId: input.offerId,
        campaignId: input.campaignId,
        rootOfferId: input.rootOfferId,
        eventType: input.eventType,
        price: input.price,
      },
    });

    await Promise.all([
      set(msgRef, payload),
      update(ref(database, `conversations/${conversation.id}`), {
        lastMessage: text,
        lastMessageType: 'system',
        lastMessageAt: now,
        updatedAt: now,
      }),
    ]);

    const recipient = resolveEventRecipient(input);
    if (recipient) {
      try {
        const isBrandContentDelivery =
          input.eventType === 'content_uploaded' || input.eventType === 'content_share_link_set';
        await createAppNotification({
          userId: recipient.userId,
          userType: recipient.userType,
          type: getNotificationType(input.eventType),
          title: getNotificationTitle(input.eventType),
          message: text,
          actionTab: isBrandContentDelivery ? 'campaigns' : 'offers',
          actionUrl:
            recipient.userType === 'brand'
              ? `/brand/dashboard?tab=${isBrandContentDelivery ? 'campaigns' : 'offers'}&offerId=${encodeURIComponent(input.offerId)}&campaignId=${encodeURIComponent(input.campaignId)}`
              : `/influencer/dashboard?offerId=${encodeURIComponent(input.offerId)}&campaignId=${encodeURIComponent(input.campaignId)}`,
          metadata: {
            offerId: input.offerId,
            campaignId: input.campaignId,
            rootOfferId: input.rootOfferId,
            eventType: input.eventType,
            price: input.price,
            brandId: input.brandId,
            influencerId: input.influencerId,
          },
        });
      } catch (notificationError) {
        console.warn('Uygulama bildirimi yazılamadı:', notificationError);
      }
    }

    void sendTransactionalEventEmail({
      eventType: input.eventType,
      brandId: input.brandId,
      influencerId: input.influencerId,
      campaignId: input.campaignId,
      offerId: input.offerId,
      rootOfferId: input.rootOfferId,
      price: input.price,
    });
  } catch (error) {
    console.error('Sistem mesajı gönderilemedi:', error);
  }
}

export function subscribeConversationsByUser(
  userId: string,
  userType: ConversationUserType,
  onUpdate: (conversations: Conversation[]) => void
): Unsubscribe {
  const key = userType === 'brand' ? 'brandId' : 'influencerId';

  return onValue(ref(database, 'conversations'), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate([]);
      return;
    }
    const rows = (Object.values(snapshot.val()) as Conversation[]).filter((row) => {
      return row[key] === userId && !row.mergedInto;
    });
    rows.sort((a, b) => {
      const at = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime();
      const bt = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime();
      return bt - at;
    });
    onUpdate(rows);
  });
}

export function subscribeConversationMessages(
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void
): Unsubscribe {
  return onValue(ref(database, `conversations/${conversationId}/messages`), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate([]);
      return;
    }
    const rows = Object.values(snapshot.val()) as ChatMessage[];
    rows.sort((a, b) => {
      const at = new Date(a.createdAt || 0).getTime();
      const bt = new Date(b.createdAt || 0).getTime();
      return at - bt;
    });
    onUpdate(rows);
  });
}
