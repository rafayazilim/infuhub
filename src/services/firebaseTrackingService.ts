import { ref, get } from 'firebase/database';
import { database } from '@/config/firebase';

export interface TrackingClick {
  clickedAt?: string;
  ipHash?: string;
  userAgent?: string;
  referrer?: string;
  source?: string;
}

export interface TrackingLink {
  shortCode: string;
  offerId: string;
  campaignId: string;
  brandId: string;
  influencerId: string;
  platform?: string;
  targetUrl?: string;
  createdAt?: string;
  isActive?: boolean;
  clickCount?: number;
  clicks?: Record<string, TrackingClick>;
}

export interface DailyClickPoint {
  date: string;
  engagement: number;
}

function normalizeTrackingLinks(snapshotValue: any): TrackingLink[] {
  if (!snapshotValue) return [];
  return Object.entries(snapshotValue).map(([shortCode, value]) => ({
    shortCode,
    ...(value as Omit<TrackingLink, 'shortCode'>),
  }));
}

function getClickCount(link: TrackingLink): number {
  if (typeof link.clickCount === 'number') {
    return link.clickCount;
  }
  if (typeof link.clickCount === 'string') {
    const parsed = Number(link.clickCount);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (link.clicks) {
    return Object.keys(link.clicks).length;
  }
  return 0;
}

export function sumClicks(links: TrackingLink[]): number {
  return links.reduce((total, link) => total + getClickCount(link), 0);
}

export async function getAllTrackingLinks(): Promise<TrackingLink[]> {
  const snapshot = await get(ref(database, 'tracking_links'));
  if (!snapshot.exists()) return [];
  return normalizeTrackingLinks(snapshot.val());
}

export async function getTrackingLinksByBrand(brandId: string): Promise<TrackingLink[]> {
  const links = await getAllTrackingLinks();
  return links.filter((link) => link.brandId === brandId);
}

export async function getTrackingLinksByCampaign(campaignId: string): Promise<TrackingLink[]> {
  const links = await getAllTrackingLinks();
  return links.filter((link) => link.campaignId === campaignId);
}


function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildSyntheticDistribution(total: number, days: number, seed: number): number[] {
  if (total <= 0 || days <= 0) return Array.from({ length: days }, () => 0);
  const weights: number[] = [];
  let state = seed || 1;
  for (let i = 0; i < days; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    weights.push((state % 100) + 1);
  }

  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const distribution = weights.map((w) => Math.floor((w / weightSum) * total));
  let assigned = distribution.reduce((sum, v) => sum + v, 0);

  let idx = 0;
  while (assigned < total) {
    distribution[idx % days] += 1;
    assigned += 1;
    idx += 1;
  }

  return distribution;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getLabel(date: Date, mode: 'weekday' | 'dayMonth'): string {
  if (mode === 'weekday') {
    return date.toLocaleDateString('tr-TR', { weekday: 'short' });
  }
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function buildDailyClicksSeries(
  links: TrackingLink[],
  days: number,
  labelMode: 'weekday' | 'dayMonth' = 'weekday'
): DailyClickPoint[] {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const buckets = new Map<string, { label: string; count: number }>();
  for (let i = 0; i < days; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = dateKey(current);
    buckets.set(key, { label: getLabel(current, labelMode), count: 0 });
  }

  links.forEach((link) => {
    if (!link.clicks) {
      const count = getClickCount(link);
      if (count <= 0) return;
      const distribution = buildSyntheticDistribution(
        count,
        days,
        hashSeed(link.shortCode || link.campaignId || 'seed')
      );
      const keys = Array.from(buckets.keys());
      distribution.forEach((value, index) => {
        if (value <= 0) return;
        const bucket = buckets.get(keys[index]);
        if (!bucket) return;
        bucket.count += value;
      });
      return;
    }
    Object.values(link.clicks).forEach((click) => {
      if (!click?.clickedAt) return;
      const clickDate = new Date(click.clickedAt);
      if (Number.isNaN(clickDate.getTime())) return;
      const key = dateKey(clickDate);
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.count += 1;
    });
  });

  return Array.from(buckets.values()).map((bucket) => ({
    date: bucket.label,
    engagement: bucket.count,
  }));
}
