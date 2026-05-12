/** Marka kampanya hedefi — form ve kayıt değerleri */
export const CAMPAIGN_GOAL_OPTIONS = [
  'Satış Artırma',
  'Takipçi Artırma',
  'Marka Bilinirliği',
  'Uygulama İndirme',
  'Etkileşim Artırma',
  'Web Sitesi Trafik Artırma',
] as const;

export type CampaignGoalOption = (typeof CAMPAIGN_GOAL_OPTIONS)[number];

/** RTDB’de eski (ASCII) kayıtlı değerler → güncel etiket */
const LEGACY_CAMPAIGN_GOALS: Record<string, string> = {
  'Satis Artirma': 'Satış Artırma',
  'Takipci Artirma': 'Takipçi Artırma',
  'Marka Bilinirligi': 'Marka Bilinirliği',
  'Uygulama Indirme': 'Uygulama İndirme',
  'Etkilesim Artirma': 'Etkileşim Artırma',
  'Web Site Trafik Artirma': 'Web Sitesi Trafik Artırma',
};

export function formatCampaignGoalLabel(stored: string | undefined | null): string {
  if (stored == null || stored === '') return '';
  return LEGACY_CAMPAIGN_GOALS[stored] ?? stored;
}
