import { CAMPAIGN_GOAL_OPTIONS, type CampaignGoalOption } from '@/constants/campaignGoals';
import { CATEGORY_TREE, TOP_CATEGORY_KEYS } from '@/constants/sectorCategoryTree';

/** Marka kampanya hedef kitle alanları ile bire bir uyum (firebase `audienceMatch`) */
export const AUDIENCE_MATCH_MAX_PRODUCT_SUBS = 3;
export const AUDIENCE_MATCH_MAX_LOCATIONS = 3;

export type AudienceMatchGender = 'female' | 'male' | 'all';

export interface InfluencerAudienceMatch {
  /** Anket tamamlandı — ISO 8601 */
  completedAt: string;
  gender: AudienceMatchGender;
  minAge: string;
  maxAge: string;
  productSubcategories: string[];
  location: string[];
  /** `CAMPAIGN_GOAL_OPTIONS` değerlerinden biri (kampanyadaki "kampanya hedefi" ile aynı sözlük) */
  campaignHelpGoal: CampaignGoalOption;
}

export function isCampaignGoalValue(s: string): s is CampaignGoalOption {
  return (CAMPAIGN_GOAL_OPTIONS as readonly string[]).includes(s);
}

/**
 * Eşleşme + panel işlemleri için: zorunlu alanlar dolu ve submitted.
 */
export function isAudienceMatchComplete(
  profile: { audienceMatch?: Partial<InfluencerAudienceMatch> | null } | null | undefined
): boolean {
  if (!profile?.audienceMatch?.completedAt) return false;
  const a = profile.audienceMatch;
  if (!a.gender) return false;
  const minA = String(a.minAge ?? '').trim();
  const maxA = String(a.maxAge ?? '').trim();
  if (!minA || !maxA) return false;
  const nMin = Number(minA);
  const nMax = Number(maxA);
  if (!Number.isFinite(nMin) || !Number.isFinite(nMax) || nMin < 13 || nMax > 100 || nMin > nMax) {
    return false;
  }
  const subs = a.productSubcategories;
  if (!Array.isArray(subs) || subs.length < 1 || subs.length > AUDIENCE_MATCH_MAX_PRODUCT_SUBS) {
    return false;
  }
  const locs = a.location;
  if (!Array.isArray(locs) || locs.length < 1 || locs.length > AUDIENCE_MATCH_MAX_LOCATIONS) {
    return false;
  }
  if (!a.campaignHelpGoal || !isCampaignGoalValue(String(a.campaignHelpGoal))) return false;
  return true;
}

type ProfileCategoriesLike = {
  categories?: string[] | null;
  subCategories?: Record<string, string[]> | null;
} | null;

/**
 * Kayıt sırasında seçilen üst/alt kategorilerden, anket "ürün alt kategorisi" alanına (en fazla 3) öneri listesi.
 * Alt kategori yoksa (eski/eksik veri) ilk üst kategorideki ağaçtan örnekler doldurulur.
 */
export function getRegistrationProductSubcategoriesForSurvey(
  profile: ProfileCategoriesLike | undefined
): { subs: string[]; suggestedTopCategory: string } {
  if (!profile) return { subs: [], suggestedTopCategory: '' };

  const rawSubs = Object.values(profile.subCategories || {})
    .flat()
    .map((s) => String(s).trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  const isValidSub = (s: string) =>
    TOP_CATEGORY_KEYS.some((top) => (CATEGORY_TREE[top] || []).includes(s));

  for (const s of rawSubs) {
    if (seen.has(s) || !isValidSub(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= AUDIENCE_MATCH_MAX_PRODUCT_SUBS) break;
  }

  if (out.length === 0 && profile.categories && profile.categories.length > 0) {
    for (const top of profile.categories) {
      const all = CATEGORY_TREE[top];
      if (!all?.length) continue;
      for (const s of all) {
        if (out.length >= AUDIENCE_MATCH_MAX_PRODUCT_SUBS) break;
        if (!out.includes(s)) out.push(s);
      }
      if (out.length > 0) break;
    }
  }

  let suggestedTop = '';
  for (const top of TOP_CATEGORY_KEYS) {
    const list = CATEGORY_TREE[top] || [];
    if (out.some((s) => list.includes(s))) {
      suggestedTop = top;
      break;
    }
  }
  if (!suggestedTop && profile.categories?.[0] && TOP_CATEGORY_KEYS.includes(profile.categories[0])) {
    suggestedTop = profile.categories[0];
  }

  return { subs: out, suggestedTopCategory: suggestedTop };
}
