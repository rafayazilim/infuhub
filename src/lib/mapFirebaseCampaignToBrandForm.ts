import type { FirebaseCampaign } from '@/services/firebaseCampaignService';
import {
  getContentLines,
  newContentLineId,
  type CampaignContentCollabLine,
  type CampaignContentUgcLine,
} from '@/lib/campaignContentLines';

/** date input için YYYY-MM-DD */
export function campaignDateToInputValue(dateStr?: string): string {
  if (!dateStr?.trim()) return '';
  const t = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type BrandCampaignModalFormData = {
  campaignModel: 'ugc_video' | 'collaboration';
  campaignName: string;
  campaignDescription: string;
  campaignGoal: string;
  visibilityOpen: boolean;
  fixedOffer: boolean;
  gender: 'female' | 'male' | 'all';
  minAge: string;
  maxAge: string;
  productSubcategories: string[];
  location: string[];
  contentDetails: string;
  influencerBudget: string;
  applicationDeadline: string;
  publishStartDate: string;
  publishEndDate: string;
  platforms: string[];
  contentFormatCounts: Record<string, number>;
};

export function mapFirebaseCampaignToBrandForm(c: FirebaseCampaign): {
  campaignData: BrandCampaignModalFormData;
  ugcLineBasket: CampaignContentUgcLine[];
  collabLineBasket: CampaignContentCollabLine[];
} {
  const rawModel = c.campaignModel;
  const campaignModel: 'ugc_video' | 'collaboration' =
    rawModel === 'ugc_video' ? 'ugc_video' : 'collaboration';

  const ageRange = c.targetAudience?.ageRange?.trim() || '';
  let minAge = '';
  let maxAge = '';
  const ageParts = ageRange.split('-').map((s) => s.trim());
  if (ageParts.length >= 2) {
    minAge = ageParts[0];
    maxAge = ageParts[1];
  }

  const subs = c.targetAudience?.productSubcategories;
  const productSubcategories = Array.isArray(subs)
    ? [...subs]
    : (c.targetAudience?.interests || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  const locRaw = c.targetAudience?.location?.trim() || '';
  const location = locRaw
    ? locRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const publishStart =
    c.publishWindow?.start || c.duration?.start || '';
  const publishEnd = c.publishWindow?.end || c.duration?.end || '';

  const counts = c.contentFormatQuantities || {};
  const contentFormatCounts: Record<string, number> = {
    Story: Number(counts.Story) || 0,
    Reels: Number(counts.Reels) || 0,
    Post: Number(counts.Post) || 0,
    Video: Number(counts.Video) || 0,
  };

  let lines = getContentLines(c);
  if (lines.length === 0 && campaignModel === 'collaboration' && (c.platforms?.length ?? 0) > 0) {
    const fmt = c.contentFormats?.[0] || 'Reels';
    lines = (c.platforms || []).map((platform) => ({
      id: newContentLineId(),
      kind: 'collab' as const,
      platform,
      contentFormat: fmt,
    }));
  }

  const ugcLineBasket: CampaignContentUgcLine[] = [];
  const collabLineBasket: CampaignContentCollabLine[] = [];
  for (const row of lines) {
    if (row.kind === 'ugc') {
      ugcLineBasket.push({
        id: row.id || newContentLineId(),
        kind: 'ugc',
        aspectRatio: row.aspectRatio,
        durationSec: row.durationSec,
      });
    } else {
      collabLineBasket.push({
        id: row.id || newContentLineId(),
        kind: 'collab',
        platform: row.platform,
        contentFormat: row.contentFormat,
      });
    }
  }

  const budgetNum = c.budget?.total ?? c.budget?.perInfluencer;

  const campaignData: BrandCampaignModalFormData = {
    campaignModel,
    campaignName: c.campaignName || c.title || '',
    campaignDescription:
      c.campaignDescription || c.productDescription || c.productInfo || '',
    campaignGoal: c.campaignGoal || '',
    visibilityOpen: c.visibility !== 'invite_only',
    fixedOffer: Boolean(c.isFixedOffer),
    gender: c.targetAudience?.gender === 'female' || c.targetAudience?.gender === 'male' ? c.targetAudience.gender : 'all',
    minAge,
    maxAge,
    productSubcategories,
    location,
    contentDetails: c.contentDetails || '',
    influencerBudget:
      budgetNum !== undefined && budgetNum !== null ? String(budgetNum) : '',
    applicationDeadline: campaignDateToInputValue(c.applicationDeadline),
    publishStartDate: campaignDateToInputValue(publishStart),
    publishEndDate: campaignDateToInputValue(publishEnd),
    platforms: [...(c.platforms || [])],
    contentFormatCounts,
  };

  return { campaignData, ugcLineBasket, collabLineBasket };
}
