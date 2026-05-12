import { BRAND_SECTOR_DEFINITIONS } from "@/constants/brandSectorDefinitions";

/** Marka kayıt ve profil düzenleme — `brandSectorDefinitions` ile tek kaynak */
export const BRAND_INDUSTRY_OPTIONS: readonly string[] = BRAND_SECTOR_DEFINITIONS.map((d) => d.label);

export const BRAND_UNVAN_OPTIONS = [
  "Pazarlama Müdürü",
  "Marka Müdürü",
  "Genel Müdür",
  "CEO / Kurucu",
  "Sosyal Medya Yöneticisi",
  "Dijital Pazarlama Uzmanı",
  "İletişim Sorumlusu",
  "Satış Müdürü",
  "Operasyon Sorumlusu",
  "Hukuk / Uyum Temsilcisi",
  "Diğer",
] as const;
