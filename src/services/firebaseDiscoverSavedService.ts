import { get, ref, remove, set, onValue, type Unsubscribe } from 'firebase/database';
import { database } from '@/config/firebase';

const LEGACY_LOCAL_KEY_PREFIX = 'infuhub_brand_discover_saved_';

function discoverSavedRootRef(brandId: string) {
  return ref(database, `brands/${brandId}/discoverSavedInfluencers`);
}

/**
 * Influencer Keşfet “Kaydedilenler” — marka düzeyinde influencer id’leri (değer `true`).
 */
export function subscribeDiscoverSavedInfluencers(
  brandId: string,
  onData: (ids: Set<string>) => void,
  onError?: (e: unknown) => void
): () => void {
  const r = discoverSavedRootRef(brandId);

  const unsub: Unsubscribe = onValue(
    r,
    (snap) => {
      const v = snap.val() as Record<string, unknown> | null;
      if (!v || typeof v !== 'object') {
        onData(new Set());
        return;
      }
      const ids = Object.keys(v).filter((k) => v[k] === true || v[k]);
      onData(new Set(ids));
    },
    (err) => {
      if (onError) onError(err);
      else console.error('[discoverSaved]', err);
    }
  );

  return () => unsub();
}

export async function setDiscoverSavedInfluencer(
  brandId: string,
  influencerId: string,
  saved: boolean
): Promise<void> {
  const node = ref(database, `brands/${brandId}/discoverSavedInfluencers/${influencerId}`);
  if (saved) {
    await set(node, true);
  } else {
    await remove(node);
  }
}

/**
 * Eski localStorage listesini bir kez RTDB ile birleştirip anahtarı siler.
 */
export async function migrateDiscoverSavedFromLegacyLocalStorage(brandId: string): Promise<void> {
  let raw: string | null = null;
  try {
    raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(`${LEGACY_LOCAL_KEY_PREFIX}${brandId}`)
      : null;
  } catch {
    return;
  }
  if (!raw) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      localStorage.removeItem(`${LEGACY_LOCAL_KEY_PREFIX}${brandId}`);
    } catch {
      /* ignore */
    }
    return;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    try {
      localStorage.removeItem(`${LEGACY_LOCAL_KEY_PREFIX}${brandId}`);
    } catch {
      /* ignore */
    }
    return;
  }

  const snap = await get(discoverSavedRootRef(brandId));
  const merged: Record<string, boolean> =
    snap.exists() && typeof snap.val() === 'object'
      ? { ...(snap.val() as Record<string, boolean>) }
      : {};
  for (const id of parsed) {
    if (typeof id === 'string' && id.trim()) merged[id.trim()] = true;
  }

  await set(discoverSavedRootRef(brandId), merged);

  try {
    localStorage.removeItem(`${LEGACY_LOCAL_KEY_PREFIX}${brandId}`);
  } catch {
    /* ignore */
  }
}
