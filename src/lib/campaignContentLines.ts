import type { FirebaseCampaign } from '@/services/firebaseCampaignService';

/** Görüntü oranı (UGC) */
export const UGC_ASPECT_RATIOS = ['4:3', '16:9', '9:16', '1:1', '21:9', '2:1'] as const;

export type UgcAspectRatio = (typeof UGC_ASPECT_RATIOS)[number];

/** Hazır video süreleri (saniye) */
export const UGC_DURATION_PRESETS: { label: string; sec: number }[] = [
  { label: '10 sn', sec: 10 },
  { label: '15 sn', sec: 15 },
  { label: '20 sn', sec: 20 },
  { label: '30 sn', sec: 30 },
  { label: '45 sn', sec: 45 },
  { label: '1 dk', sec: 60 },
  { label: '1,5 dk', sec: 90 },
  { label: '2 dk', sec: 120 },
  { label: '3 dk', sec: 180 },
];

export type CampaignContentUgcLine = {
  id: string;
  kind: 'ugc';
  aspectRatio: string;
  durationSec: number;
};

export type CampaignContentCollabLine = {
  id: string;
  kind: 'collab';
  platform: string;
  contentFormat: string;
};

export type CampaignContentLine = CampaignContentUgcLine | CampaignContentCollabLine;

export function newContentLineId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatDurationShort(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  if (sec < 60) return `${Math.round(sec)} sn`;
  const m = sec / 60;
  if (m === Math.floor(m)) return `${m} dk`;
  return `${m.toFixed(1).replace('.', ',')} dk`;
}

/** İşbirliği sepetinden eski alanlara türetme (istatistik / filtre uyumu) */
export function buildLegacyFromCollabLines(lines: CampaignContentCollabLine[]): {
  platforms: string[];
  contentFormats: string[];
  contentFormatQuantities: Record<string, number>;
} {
  const q: Record<string, number> = {};
  const platforms = new Set<string>();
  for (const row of lines) {
    platforms.add(row.platform);
    q[row.contentFormat] = (q[row.contentFormat] ?? 0) + 1;
  }
  return {
    platforms: [...platforms],
    contentFormats: Object.keys(q).filter((k) => (q[k] ?? 0) > 0),
    contentFormatQuantities: q,
  };
}

export function getContentLines(
  c: Pick<FirebaseCampaign, 'contentLines' | 'campaignModel'>
): CampaignContentLine[] {
  const raw = c.contentLines as unknown;
  if (Array.isArray(raw) && raw.length > 0) return raw as CampaignContentLine[];
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const vals = Object.values(raw as Record<string, CampaignContentLine>).filter(
      (v) => v && typeof v === 'object' && 'kind' in v
    );
    return vals as CampaignContentLine[];
  }
  return [];
}

export function hasContentLines(
  c: Pick<FirebaseCampaign, 'contentLines' | 'campaignModel'>
): boolean {
  return getContentLines(c).length > 0;
}

/** Özet metin (modal / teklif / önizleme) */
export function formatContentLinesSummary(c: Pick<FirebaseCampaign, 'contentLines' | 'campaignModel'>): string {
  const lines = getContentLines(c);
  if (lines.length === 0) return '';
  const parts = lines.map((row) => {
    if (row.kind === 'ugc') {
      return `${row.aspectRatio} · ${formatDurationShort(row.durationSec)}`;
    }
    return `${row.platform} — ${row.contentFormat}`;
  });
  return parts.join(' · ');
}
