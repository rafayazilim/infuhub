import type { InfluencerData } from '@/services/firebaseAuthService';
import type { FirebaseCampaign } from '@/services/firebaseCampaignService';
import { normalizeInfluencerPlatformsToArray } from '@/lib/influencerPlatforms';
import { formatCampaignGoalLabel } from '@/constants/campaignGoals';

export interface CampaignInfluencerMatch {
  influencerId: string;
  score: number;
  confidence: 'yüksek' | 'orta' | 'düşük';
  metrics: {
    interestMatch: number;
    budgetFit: number;
    platformFit: number;
    profileQuality: number;
    audienceAlignment: number;
    influencerAverageOffer: number;
    campaignTargetOffer: number;
  };
}

const followerRangeMidpoint: Record<string, number> = {
  '1K - 10K': 5500,
  '10K - 50K': 30000,
  '50K - 100K': 75000,
  '100K - 500K': 300000,
  '500K+': 700000,
};

const followerRangeOfferBaseline: Record<string, number> = {
  '1K - 10K': 1500,
  '10K - 50K': 3500,
  '50K - 100K': 6500,
  '100K - 500K': 12000,
  '500K+': 22000,
};

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const parseInterests = (raw?: string): string[] => {
  if (!raw) return [];
  return raw
    .split(/[;,/|]/g)
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const normalizePlatforms = (platforms: InfluencerData['platforms']): string[] =>
  normalizeInfluencerPlatformsToArray(platforms as unknown)
    .map((p) => normalizeText(p.id || ''))
    .filter(Boolean);

const estimateInfluencerAverageOffer = (influencer: InfluencerData): number => {
  const pricing = influencer.contentPricing;
  const pricingValues = [pricing?.post, pricing?.story, pricing?.reels, pricing?.video].filter(
    (v): v is number => typeof v === 'number' && v > 0
  );

  if (pricingValues.length > 0) {
    return Math.round(pricingValues.reduce((sum, value) => sum + value, 0) / pricingValues.length);
  }

  if (typeof (influencer as any).averageAdPrice === 'number' && (influencer as any).averageAdPrice > 0) {
    return Number((influencer as any).averageAdPrice);
  }

  return followerRangeOfferBaseline[influencer.followerRange] || 3000;
};

const computeInterestMatch = (campaign: FirebaseCampaign, influencer: InfluencerData): number => {
  const campaignInterests = parseInterests(campaign.targetAudience?.interests);
  const audienceSubs = (influencer as any).audienceMatch?.productSubcategories;
  const audienceSubsNorm = Array.isArray(audienceSubs)
    ? audienceSubs.map((c: string) => normalizeText(c))
    : [];
  const influencerCategories = (influencer.categories || []).map((c) => normalizeText(c));
  const influencerSubCategories = Object.values(influencer.subCategories || {})
    .flat()
    .map((c) => normalizeText(c));
  const influencerTags = new Set([...influencerCategories, ...influencerSubCategories, ...audienceSubsNorm]);

  if (campaignInterests.length === 0) return 0.55;
  const matched = campaignInterests.filter((interest) => {
    if (influencerTags.has(interest)) return true;
    for (const tag of influencerTags) {
      if (tag.includes(interest) || interest.includes(tag)) return true;
    }
    return false;
  }).length;

  return Math.min(1, matched / campaignInterests.length);
};

const computePlatformFit = (campaign: FirebaseCampaign, influencer: InfluencerData): number => {
  const campaignPlatforms = (campaign.platforms || []).map((p) => normalizeText(p));
  if (campaignPlatforms.length === 0) return 0.5;

  const influencerPlatforms = normalizePlatforms(influencer.platforms);
  if (influencerPlatforms.length === 0) return 0;

  const overlap = campaignPlatforms.filter((cp) =>
    influencerPlatforms.some((ip) => ip.includes(cp) || cp.includes(ip))
  ).length;

  return Math.min(1, overlap / campaignPlatforms.length);
};

const computeBudgetFit = (campaignTargetOffer: number, influencerAverageOffer: number): number => {
  if (campaignTargetOffer <= 0 || influencerAverageOffer <= 0) return 0.5;
  const diffRatio = Math.abs(influencerAverageOffer - campaignTargetOffer) / campaignTargetOffer;
  return Math.max(0, 1 - Math.min(diffRatio, 1.4));
};

const computeProfileQuality = (influencer: InfluencerData): number => {
  const categoriesWeight = influencer.categories?.length ? 0.25 : 0;
  const platformsWeight = Array.isArray(influencer.platforms) && influencer.platforms.length > 0 ? 0.25 : 0;
  const pricingWeight =
    influencer.contentPricing &&
    [influencer.contentPricing.post, influencer.contentPricing.story, influencer.contentPricing.reels, influencer.contentPricing.video].some(
      (v) => typeof v === 'number' && v > 0
    )
      ? 0.25
      : 0;
  const followerWeight = followerRangeMidpoint[influencer.followerRange] ? 0.25 : 0.1;
  return Math.min(1, categoriesWeight + platformsWeight + pricingWeight + followerWeight);
};

const parseCampaignLocationList = (c: FirebaseCampaign): string[] => {
  const loc = c.targetAudience?.location;
  if (!loc) return [];
  if (Array.isArray(loc)) return (loc as string[]).map((s) => String(s).trim()).filter(Boolean);
  return String(loc)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const campaignAgeRange = (c: FirebaseCampaign): { min: number; max: number } | null => {
  const ar = c.targetAudience?.ageRange;
  if (ar == null || ar === '') return null;
  const parts = String(ar).split('-').map((x) => parseInt(x.trim(), 10));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return { min: parts[0], max: parts[1] };
};

const computeAudienceAlignment = (campaign: FirebaseCampaign, influencer: InfluencerData): number => {
  const a = (influencer as any).audienceMatch;
  if (!a?.completedAt) return 0.45;

  const cGender = campaign.targetAudience?.gender;
  const iGender = a.gender as 'female' | 'male' | 'all' | undefined;
  let genderS = 0.55;
  if (iGender) {
    if (cGender === 'all' || cGender == null) genderS = 0.95;
    else if (iGender === 'all') genderS = 0.9;
    else genderS = cGender === iGender ? 1 : 0.22;
  }

  const cAge = campaignAgeRange(campaign);
  const imin = Number(a.minAge);
  const imax = Number(a.maxAge);
  let ageS = 0.5;
  if (cAge && Number.isFinite(imin) && Number.isFinite(imax) && imin <= imax) {
    const lo = Math.max(cAge.min, imin);
    const hi = Math.min(cAge.max, imax);
    if (hi < lo) ageS = 0.18;
    else {
      const span = Math.max(1, cAge.max - cAge.min);
      ageS = Math.min(1, (hi - lo) / span);
    }
  }

  const campLocs = parseCampaignLocationList(campaign);
  const infLocs: string[] = Array.isArray(a.location) ? a.location.map((s: string) => String(s).trim()) : [];
  let locS = 0.35;
  if (infLocs.length > 0 && campLocs.length > 0) {
    if (infLocs.includes('Türkiye Geneli') || campLocs.includes('Türkiye Geneli')) {
      locS = 1;
    } else {
      const setC = new Set(campLocs);
      const hit = infLocs.some((l) => setC.has(l));
      locS = hit ? 1 : 0.2;
    }
  } else {
    locS = 0.5;
  }

  const cGoal = formatCampaignGoalLabel(campaign.campaignGoal);
  const iGoal = formatCampaignGoalLabel(a.campaignHelpGoal);
  const goalS = cGoal && iGoal && cGoal === iGoal ? 1 : cGoal && iGoal ? 0.32 : 0.5;

  return (
    0.22 * genderS +
    0.28 * ageS +
    0.25 * locS +
    0.25 * goalS
  );
};

const campaignTargetOffer = (campaign: FirebaseCampaign): number => {
  if (typeof campaign.budget?.perInfluencer === 'number' && campaign.budget.perInfluencer > 0) {
    return campaign.budget.perInfluencer;
  }
  if (typeof campaign.budget?.total === 'number' && campaign.budget.total > 0) {
    return Math.round(campaign.budget.total / 5);
  }
  return 3000;
};

export function analyzeCampaignInfluencerMatches(
  campaign: FirebaseCampaign,
  influencers: InfluencerData[]
): CampaignInfluencerMatch[] {
  const targetOffer = campaignTargetOffer(campaign);

  return influencers.map((influencer) => {
    const influencerOffer = estimateInfluencerAverageOffer(influencer);
    const rawInterest = computeInterestMatch(campaign, influencer);
    const audienceAlignment = computeAudienceAlignment(campaign, influencer);
    const hasAudience = Boolean((influencer as any).audienceMatch?.completedAt);
    const interestMatch = hasAudience ? 0.42 * rawInterest + 0.58 * audienceAlignment : rawInterest;
    const budgetFit = computeBudgetFit(targetOffer, influencerOffer);
    const platformFit = computePlatformFit(campaign, influencer);
    const profileQuality = computeProfileQuality(influencer);

    // 2 katmanli, egitimsiz fakat agirlikli "neural-style" skorlayici
    const h1 = sigmoid(2.4 * interestMatch + 1.9 * budgetFit + 0.8 * platformFit - 1.7);
    const h2 = sigmoid(1.5 * interestMatch + 0.9 * budgetFit + 1.8 * profileQuality - 1.4);
    const output = sigmoid(1.7 * h1 + 1.4 * h2 + 0.9 * platformFit - 1.5);
    const score = Math.max(1, Math.min(99, Math.round(output * 100)));

    const confidence: CampaignInfluencerMatch['confidence'] =
      score >= 75 ? 'yüksek' : score >= 50 ? 'orta' : 'düşük';

    return {
      influencerId: influencer.id,
      score,
      confidence,
      metrics: {
        interestMatch,
        budgetFit,
        platformFit,
        profileQuality,
        audienceAlignment: hasAudience ? audienceAlignment : 0,
        influencerAverageOffer: influencerOffer,
        campaignTargetOffer: targetOffer,
      },
    };
  });
}
