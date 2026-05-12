import { database } from '@/config/firebase';
import { get, onValue, push, ref, set, update, type Unsubscribe } from 'firebase/database';

export type NotificationUserType = 'brand' | 'influencer';

export type AppNotificationType =
  | 'offer'
  | 'counter_offer'
  | 'content'
  | 'revision'
  | 'approval'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  userType: NotificationUserType;
  type: AppNotificationType;
  title: string;
  message: string;
  actionTab?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
  metadata?: {
    eventType?: string;
    brandId?: string;
    influencerId?: string;
    campaignId?: string;
    offerId?: string;
    rootOfferId?: string;
    price?: number;
  };
}

const getNotificationRef = (userType: NotificationUserType, userId: string) =>
  ref(database, `notifications/${userType}/${userId}`);

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      if (val !== undefined) out[key] = stripUndefined(val);
    });
    return out as T;
  }
  return value;
}

export async function createAppNotification(
  input: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & {
    id?: string;
    read?: boolean;
    createdAt?: string;
  }
): Promise<AppNotification> {
  const rowRef = input.id
    ? ref(database, `notifications/${input.userType}/${input.userId}/${input.id}`)
    : push(getNotificationRef(input.userType, input.userId));
  const now = input.createdAt || new Date().toISOString();
  const payload: AppNotification = {
    id: rowRef.key!,
    userId: input.userId,
    userType: input.userType,
    type: input.type,
    title: input.title,
    message: input.message,
    actionTab: input.actionTab,
    actionUrl: input.actionUrl,
    read: input.read ?? false,
    createdAt: now,
    metadata: input.metadata,
  };
  await set(rowRef, stripUndefined(payload));
  return payload;
}

export function subscribeAppNotifications(
  userType: NotificationUserType,
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void
): Unsubscribe {
  return onValue(getNotificationRef(userType, userId), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate([]);
      return;
    }
    const rows = Object.values(snapshot.val() || {}) as AppNotification[];
    rows.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(rows);
  });
}

export async function markAppNotificationRead(
  userType: NotificationUserType,
  userId: string,
  notificationId: string
): Promise<void> {
  await update(ref(database, `notifications/${userType}/${userId}/${notificationId}`), {
    read: true,
    readAt: new Date().toISOString(),
  });
}

export async function markAllAppNotificationsRead(
  userType: NotificationUserType,
  userId: string
): Promise<void> {
  const snapshot = await get(getNotificationRef(userType, userId));
  if (!snapshot.exists()) return;
  const rows = snapshot.val() as Record<string, AppNotification>;
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {};
  Object.entries(rows).forEach(([id, row]) => {
    if (!row?.read) {
      updates[`${id}/read`] = true;
      updates[`${id}/readAt`] = now;
    }
  });
  if (Object.keys(updates).length > 0) {
    await update(getNotificationRef(userType, userId), updates);
  }
}
