import { CATEGORY_TREE } from "@/constants/sectorCategoryTree";

export type BrandSectorDef = {
  id: string;
  /** Kayıt / profilde gösterilen etiket (BRAND_INDUSTRY_OPTIONS ile uyumlu) */
  label: string;
  /** CATEGORY_TREE anahtarları — alt sektörler birleştirilir */
  treeKeys: string[];
};

/** Marka kayıt ekranındaki 10 üst sektör → influencer ağacı ile aynı alt kategori havuzu */
export const BRAND_SECTOR_DEFINITIONS: BrandSectorDef[] = [
  { id: "teknoloji", label: "Teknoloji", treeKeys: ["Teknoloji"] },
  { id: "moda-guzellik", label: "Moda & Güzellik", treeKeys: ["Moda & Giyim", "Güzellik & Kozmetik"] },
  { id: "yiyecek", label: "Yiyecek & İçecek", treeKeys: ["Yemek & İçecek"] },
  { id: "saglik-fitness", label: "Sağlık & Fitness", treeKeys: ["Sağlık & Wellness", "Spor & Fitness"] },
  { id: "seyahat", label: "Seyahat", treeKeys: ["Seyahat & Turizm"] },
  { id: "egitim", label: "Eğitim", treeKeys: ["Eğitim"] },
  { id: "finans", label: "Finans", treeKeys: ["Finans & Fintech"] },
  { id: "otomotiv", label: "Otomotiv", treeKeys: ["Otomotiv"] },
  { id: "eglence", label: "Eğlence", treeKeys: ["Eğlence & Medya"] },
  {
    id: "diger",
    label: "Diğer",
    treeKeys: [
      "Gaming",
      "E-ticaret & Perakende",
      "Ev & Yaşam",
      "Anne & Bebek",
      "Evcil Hayvanlar",
      "Kurumsal & B2B",
      "Gayrimenkul",
      "Lüks & Premium",
      "Sosyal Sorumluluk",
    ],
  },
];

export function getMergedSubcategoriesForBrandSector(def: BrandSectorDef): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of def.treeKeys) {
    for (const sub of CATEGORY_TREE[key] || []) {
      if (!seen.has(sub)) {
        seen.add(sub);
        out.push(sub);
      }
    }
  }
  return out;
}

export function findBrandSectorDefByLabel(label: string): BrandSectorDef | undefined {
  const t = label.trim();
  return BRAND_SECTOR_DEFINITIONS.find((d) => d.label === t);
}
