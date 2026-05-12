/** Influencer `platforms` alanı RTDB'de dizi veya eski kayıtlarda nesne olabildiği için tek formatta normalize edilir. */

export type InfluencerPlatformEntry = {
  id: string;
  username: string;
  followers: number;
  followersUpdated?: boolean;
};

function parseFollowers(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = parseInt(value.replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? 0 : n;
  }
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

export function normalizeInfluencerPlatformsToArray(platforms: unknown): InfluencerPlatformEntry[] {
  if (!platforms) return [];

  if (Array.isArray(platforms)) {
    return platforms
      .map((p: any) => {
        const id = String(p?.id ?? '').trim();
        if (!id) return null;
        const username = typeof p.username === 'string' ? p.username : String(p?.username ?? '');
        const followers = parseFollowers(p?.followers);
        const entry: InfluencerPlatformEntry = { id, username, followers };
        if (p?.followersUpdated !== undefined) entry.followersUpdated = Boolean(p.followersUpdated);
        return entry;
      })
      .filter((p): p is InfluencerPlatformEntry => p !== null);
  }

  if (typeof platforms === 'object' && platforms !== null) {
    return Object.entries(platforms as Record<string, any>)
      .map(([id, info]) => {
        const trimmedId = id.trim();
        if (!trimmedId) return null;
        const username =
          typeof info?.username === 'string' ? info.username : String(info?.username ?? '');
        const followers = parseFollowers(info?.followers);
        const entry: InfluencerPlatformEntry = { id: trimmedId, username, followers };
        if (info?.followersUpdated !== undefined) entry.followersUpdated = Boolean(info.followersUpdated);
        return entry;
      })
      .filter((p): p is InfluencerPlatformEntry => p !== null);
  }

  return [];
}

export function sumPlatformFollowers(platforms: unknown): number {
  return normalizeInfluencerPlatformsToArray(platforms).reduce((s, p) => s + (Number(p.followers) || 0), 0);
}
