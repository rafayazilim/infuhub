import { onValue, ref } from "firebase/database";
import { database } from "@/config/firebase";
import type { DiscoverInfluencer } from "@/lib/veritabaniInfluencers";
import { firebaseInfluencersRootToDiscoverList } from "@/lib/veritabaniInfluencers";

const INFLUENCERS_ROOT = "influencers";

/**
 * RTDB `influencers/` düğümüne abone olur; her güncellemede keşif listesi yenilenir (marka paneli güncel kalsın diye gerçek zamanlı).
 *
 * Güvenlik: Realtime Database kurallarında marka oturumu için `influencers` okuma izni gerekebilir.
 *
 * @returns Aboneliği kapatır.
 */
export function subscribeDiscoverInfluencerCatalog(
  onData: (rows: DiscoverInfluencer[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const r = ref(database, INFLUENCERS_ROOT);
  return onValue(
    r,
    (snapshot) => {
      const val = snapshot.exists() ? snapshot.val() : null;
      onData(firebaseInfluencersRootToDiscoverList(val));
    },
    (error) => {
      onError?.(error);
    }
  );
}
