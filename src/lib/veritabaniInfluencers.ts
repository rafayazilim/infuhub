import { normalizeInfluencerPlatformsToArray } from "@/lib/influencerPlatforms";
import { isVerificationApproved } from "@/lib/verificationStatus";

/** Marka keşif ekranı kart satırı (Firebase `influencers/{uid}` ile uyumlu) */
export interface DiscoverInfluencer {
  id: string;
  name: string;
  handle: string;
  photoUrl: string;
  email?: string;
  countryLabel: string;
  categories: string[];
  followersTotal: number;
  reachLabel: string;
  engagementPct: number;
  tag: string;
  platformKey: string;
  platforms: Array<{ id: string; username?: string; followers?: number }>;
  accountStatus?: string;
  verificationRequestStatus?: string;
  bio?: string;
}

interface RawPlatformLite {
  id?: string;
  username?: string;
  followers?: number;
}

function segmentToNumber(seg: string): number {
  let s = seg.trim().replace(/\s/g, "").replace(",", ".");
  let mult = 1;
  const low = s.toLowerCase();
  if (low.endsWith("m")) {
    mult = 1_000_000;
    s = s.slice(0, -1);
  } else if (low.endsWith("k")) {
    mult = 1_000;
    s = s.slice(0, -1);
  }
  const n = parseFloat(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n * mult : 0;
}

/** `followerRange` veya platform takipçi sayılarından tek sayı (sıralama / filtre). */
export function resolveFollowersTotal(
  range: string | undefined,
  platforms: RawPlatformLite[] | undefined
): number {
  const fromPlat = platforms?.reduce((m, p) => {
    const f = typeof p.followers === "number" ? p.followers : 0;
    return Math.max(m, f);
  }, 0);
  if (fromPlat && fromPlat > 0) return fromPlat;
  if (!range?.trim()) return 0;
  const cleaned = range.replace(/\+/g, "").trim();
  const parts = cleaned.split(/-|–|—/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const a = segmentToNumber(parts[0]);
    const b = segmentToNumber(parts[1]);
    if (a > 0 && b > 0) return Math.round((a + b) / 2);
  }
  if (parts.length === 1) {
    const v = segmentToNumber(parts[0]);
    if (v > 0) return Math.round(v);
  }
  return 0;
}

function formatCompactTr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 100_000 === 0 ? 0 : 1)} Mn`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} B`;
  return `${Math.round(n)}`;
}

function stableEngagementPct(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const x = (h >>> 0) % 1000;
  return Math.round((20 + (x % 50)) / 10) / 10;
}

function primaryPlatform(platforms: RawPlatformLite[] | undefined): { key: string; handle: string } {
  const order = ["instagram", "youtube", "tiktok"];
  const list = platforms ?? [];
  for (const key of order) {
    const f = list.find((p) => (p.id || "").toLowerCase() === key);
    if (f) {
      return { key, handle: f.username ? `@${f.username}` : `@${key}` };
    }
  }
  const first = list[0];
  if (first) {
    const id = (first.id || "instagram").toLowerCase();
    return { key: id, handle: first.username ? `@${first.username}` : "@kullanici" };
  }
  return { key: "instagram", handle: "@—" };
}

/** RTDB düğüm anahtarı + ham kayıt → keşif satırı. */
function mapFirebaseChildToDiscover(firebaseUidKey: string, rawVal: unknown): DiscoverInfluencer | null {
  if (!rawVal || typeof rawVal !== "object") return null;
  const raw = rawVal as {
    id?: string;
    fullName?: string;
    email?: string;
    categories?: string[];
    followerRange?: string;
    platforms?: unknown;
    profilePhotoURL?: string;
    status?: string;
    bio?: string;
    verificationRequestStatus?: string;
  };

  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : firebaseUidKey.trim() || "";
  if (!id) return null;
  if (!isVerificationApproved(raw.status)) return null;

  const platArray = normalizeInfluencerPlatformsToArray(raw.platforms).map((p) => ({
    id: p.id,
    username: p.username,
    followers: p.followers,
  }));

  const plat = primaryPlatform(platArray);
  const followersTotal = resolveFollowersTotal(raw.followerRange, platArray);
  const reachRough =
    followersTotal > 0 ? Math.max(Math.round(followersTotal * 2.4), Math.round(followersTotal)) : 0;
  const categories = Array.isArray(raw.categories)
    ? raw.categories.filter((c) => typeof c === "string" && c.trim())
    : [];
  const tag = categories[0] || "İçerik üreticisi";
  const name = (raw.fullName || raw.email || id).trim() || id;

  return {
    id,
    name,
    handle: plat.handle,
    email: typeof raw.email === "string" ? raw.email : undefined,
    photoUrl:
      typeof raw.profilePhotoURL === "string" && raw.profilePhotoURL.startsWith("http")
        ? raw.profilePhotoURL
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name.slice(0, 24))}&background=e5e7eb&color=374151`,
    countryLabel: "Türkiye",
    categories,
    followersTotal,
    reachLabel: reachRough > 0 ? formatCompactTr(reachRough) : "—",
    engagementPct: stableEngagementPct(id),
    tag,
    platformKey: plat.key,
    platforms: platArray,
    accountStatus: raw.status,
    verificationRequestStatus: raw.verificationRequestStatus as string | undefined,
    bio: typeof raw.bio === "string" ? raw.bio : undefined,
  };
}

/** `influencers` kök snapshot değeri (RTDB nesnesi) → sıralı dizi */
export function firebaseInfluencersRootToDiscoverList(root: unknown): DiscoverInfluencer[] {
  if (!root || typeof root !== "object") return [];
  const out: DiscoverInfluencer[] = [];
  for (const [uid, rawVal] of Object.entries(root as Record<string, unknown>)) {
    const row = mapFirebaseChildToDiscover(uid, rawVal);
    if (row) out.push(row);
  }
  return out;
}

export function collectCategoriesForFilter(rows: DiscoverInfluencer[]): string[] {
  const s = new Set<string>();
  for (const r of rows) {
    for (const c of r.categories) {
      if (c.trim()) s.add(c.trim());
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, "tr"));
}
