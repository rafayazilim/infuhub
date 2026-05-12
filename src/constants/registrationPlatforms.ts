/** Influencer kayıt ve kampanya platform seçimi — tek kaynak (RTDB’de etiket string olarak saklanır) */
export const REGISTRATION_PLATFORM_DEFS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'snapchat', label: 'Snapchat' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'kick', label: 'Kick' },
  { id: 'linkedin', label: 'LinkedIn' },
] as const;

export type RegistrationPlatformId = (typeof REGISTRATION_PLATFORM_DEFS)[number]['id'];

/** Kart / ikon eşlemesi için saklanan dizeyi (etiket veya id) iç id’ye çevirir */
export function resolveRegistrationPlatformId(stored: string): string {
  const trimmed = stored.trim();
  const byLabel = REGISTRATION_PLATFORM_DEFS.find((p) => p.label === trimmed);
  if (byLabel) return byLabel.id;
  const lower = trimmed.toLowerCase();
  const byId = REGISTRATION_PLATFORM_DEFS.find((p) => p.id === lower);
  if (byId) return byId.id;
  if (lower === 'x' || lower === 'twitter/x') return 'twitter';
  return lower.replace(/[^a-z0-9]/g, '') || 'unknown';
}
