import type { BrandSorumlu } from "@/services/firebaseAuthService";

export interface BrandOptimizationMetric {
  name: string;
  maxPoints: number;
  points: number;
  completed: boolean;
  description: string;
  status: string;
}

export interface BrandOptimizationHandbookItem {
  title: string;
  description: string;
  done: boolean;
}

export interface BrandOptimizationResult {
  score: number;
  message: string;
  suggestions: string[];
  metrics: BrandOptimizationMetric[];
  handbook: BrandOptimizationHandbookItem[];
}

function pickPrimarySorumlu(sorumlular: unknown): BrandSorumlu | null {
  if (!sorumlular || typeof sorumlular !== "object") return null;
  const o = sorumlular as Record<string, BrandSorumlu>;
  if (o.birincil && typeof o.birincil === "object") return o.birincil;
  const vals = Object.values(o).filter((v) => v && typeof v === "object" && "firstName" in v);
  return (vals[0] as BrandSorumlu) || null;
}

export interface ComputeBrandOptimizationParams {
  brandProfile: Record<string, unknown> | null;
  isVerified: boolean;
  activeCampaigns: number;
  draftCampaigns: number;
  offerTotal: number;
  offerAccepted: number;
  walletLoadedTotal: number;
  totalClicks: number;
  emailVerified: boolean;
}

export function computeBrandOptimizationScore(p: ComputeBrandOptimizationParams): BrandOptimizationResult {
  const maxScore = 100;
  let score = 0;
  const suggestions: string[] = [];
  const metrics: BrandOptimizationMetric[] = [];
  const handbook: BrandOptimizationHandbookItem[] = [];

  const sorumlu = pickPrimarySorumlu(p.brandProfile?.sorumlular);
  const brandName = String(p.brandProfile?.brandName || "").trim();
  const industry = String(
    p.brandProfile?.industry ||
      (Array.isArray(p.brandProfile?.categories) && p.brandProfile.categories[0]) ||
      ""
  ).trim();
  const website = String(p.brandProfile?.website || "").trim();
  const hasLogo = !!p.brandProfile?.profilePhotoURL;
  const profileBasicsDone =
    !!brandName &&
    !!industry &&
    !!website &&
    !!sorumlu?.firstName?.trim() &&
    !!sorumlu?.lastName?.trim() &&
    !!sorumlu?.title?.trim() &&
    (sorumlu.phone?.replace(/\D/g, "").length ?? 0) >= 10;

  // 1. Profil onayı (20)
  const verifyPoints = p.isVerified ? 20 : 0;
  score += verifyPoints;
  metrics.push({
    name: "Profil onayı",
    maxPoints: 20,
    points: verifyPoints,
    completed: p.isVerified,
    description: p.isVerified ? "Onaylı hesap: +20" : "Vergi levhası ile doğrulama: +0",
    status: p.isVerified ? "Tamamlandı" : "Tamamlanmadı",
  });
  if (!p.isVerified) suggestions.push("Vergi levhası ile profil doğrulaması yapın");
  handbook.push({
    title: "Hesabınızı doğrulayın",
    description:
      "Hesap menüsünden vergi levhası yükleyerek profil onayı alın; teklif ve ödeme süreçleri için gereklidir.",
    done: p.isVerified,
  });

  // 2. Marka logosu (10)
  const logoPoints = hasLogo ? 10 : 0;
  score += logoPoints;
  metrics.push({
    name: "Marka logosu",
    maxPoints: 10,
    points: logoPoints,
    completed: hasLogo,
    description: hasLogo ? "Logo yüklü: +10" : "Logo yok: +0",
    status: hasLogo ? "Tamamlandı" : "Tamamlanmadı",
  });
  if (!hasLogo) suggestions.push("Marka logosunu hesap menüsünden yükleyin");
  handbook.push({
    title: "Marka logonuzu ekleyin",
    description: "Tanınabilirlik için hesap menüsünden logo yükleyin; tekliflerde ve raporlarda görünür.",
    done: hasLogo,
  });

  // 3. Şirket & yetkili bilgileri (15)
  const profilePoints = profileBasicsDone ? 15 : 0;
  score += profilePoints;
  metrics.push({
    name: "Şirket & yetkili",
    maxPoints: 15,
    points: profilePoints,
    completed: profileBasicsDone,
    description: profileBasicsDone ? "Bilgiler tam: +15" : "Eksik alan var: +0",
    status: profileBasicsDone ? "Tamamlandı" : "Tamamlanmadı",
  });
  if (!profileBasicsDone) suggestions.push("Genel profilden şirket adı, sektör, web ve yetkili bilgilerini tamamlayın");
  handbook.push({
    title: "Şirket ve yetkili bilgilerini tamamlayın",
    description:
      "Genel profili düzenle üzerinden marka adı, sektör, web sitesi ve yetkili kişi (ünvan, telefon) bilgilerini güncel tutun.",
    done: profileBasicsDone,
  });

  // 4. Kampanya (15)
  const hasCampaign = p.activeCampaigns + p.draftCampaigns > 0;
  const campPoints = hasCampaign ? 15 : 0;
  score += campPoints;
  metrics.push({
    name: "Kampanya",
    maxPoints: 15,
    points: campPoints,
    completed: hasCampaign,
    description: hasCampaign ? "En az bir kampanya: +15" : "Kampanya yok: +0",
    status: hasCampaign ? "Tamamlandı" : "Tamamlanmadı",
  });
  if (!hasCampaign) suggestions.push("Hızlı erişimden veya Kampanyalar sekmesinden ilk kampanyanızı oluşturun");
  handbook.push({
    title: "Kampanya oluşturun",
    description:
      "Influencer’lara ulaşmak için aktif veya taslak en az bir kampanya tanımlayın; teklifler bu kampanyalara bağlanır.",
    done: hasCampaign,
  });

  // 5. Bütçe (15)
  const hasBudget = p.walletLoadedTotal > 0;
  const budgetPoints = hasBudget ? 15 : 0;
  score += budgetPoints;
  metrics.push({
    name: "Bütçe yükleme",
    maxPoints: 15,
    points: budgetPoints,
    completed: hasBudget,
    description: hasBudget ? "Cüzdana yükleme yapıldı: +15" : "Henüz yükleme yok: +0",
    status: hasBudget ? "Tamamlandı" : "Tamamlanmadı",
  });
  if (!hasBudget) suggestions.push("Bütçe sekmesinden kampanya harcamaları için cüzdanınıza bakiye yükleyin");
  handbook.push({
    title: "Cüzdanınıza bakiye yükleyin",
    description: "Bütçe ve harcamalar alanından bakiye tanımlayın; kabul edilen tekliflerde ödeme akışı için gereklidir.",
    done: hasBudget,
  });

  // 6. Teklif süreci (10)
  const hasOffers = p.offerTotal > 0 || p.offerAccepted > 0;
  const offerPoints = hasOffers ? 10 : 0;
  score += offerPoints;
  metrics.push({
    name: "Teklif & iş birliği",
    maxPoints: 10,
    points: offerPoints,
    completed: hasOffers,
    description: hasOffers ? "Teklif süreci başladı: +10" : "Henüz teklif yok: +0",
    status: hasOffers ? "Tamamlandı" : "Tamamlanmadı",
  });
  if (!hasOffers) suggestions.push("Kampanyanıza gelen teklifleri inceleyin veya influencer’lara teklif gönderin");
  handbook.push({
    title: "Influencer tekliflerini yönetin",
    description:
      "Influencer teklifleri sekmesinde bekleyen teklifleri değerlendirin, kabul veya red ile süreci ilerletin.",
    done: hasOffers,
  });

  // 7. Ölçüm (10)
  const hasClicks = p.totalClicks > 0;
  const clickPoints = hasClicks ? 10 : 0;
  score += clickPoints;
  metrics.push({
    name: "Tıklama ölçümü",
    maxPoints: 10,
    points: clickPoints,
    completed: hasClicks,
    description: hasClicks ? "Takip linkinden tıklama: +10" : "Henüz tıklama yok: +0",
    status: hasClicks ? "Tamamlandı" : "Tamamlanmadı",
  });
  if (!hasClicks) suggestions.push("Takip linkleri oluşturup kampanyalarda kullanarak performansı ölçün");
  handbook.push({
    title: "Takip linkleriyle performansı ölçün",
    description:
      "Takip linkleri bölümünden kampanyaya özel linkler oluşturun ve içeriklerde paylaştırın; tıklamalar burada toplanır.",
    done: hasClicks,
  });

  // 8. E-posta doğrulama (5)
  const mailPoints = p.emailVerified ? 5 : 0;
  score += mailPoints;
  metrics.push({
    name: "E-posta doğrulama",
    maxPoints: 5,
    points: mailPoints,
    completed: p.emailVerified,
    description: p.emailVerified ? "E-posta doğrulandı: +5" : "Doğrulanmadı: +0",
    status: p.emailVerified ? "Tamamlandı" : "Tamamlanmadı",
  });
  if (!p.emailVerified) suggestions.push("Kayıt e-postanıza gelen 6 haneli kodu girerek e-postanızı doğrulayın");
  handbook.push({
    title: "E-postanızı doğrulayın",
    description: "Kayıtta veya /email-dogrula sayfasında gelen 6 haneli kodu girin.",
    done: p.emailVerified,
  });

  let message = "";
  if (score >= 90) {
    message = "Harika! Marka hesabınız güçlü; akışı canlı tutmaya devam edin.";
  } else if (score >= 75) {
    message = "İyi durumdasınız; birkaç adımla skoru yükseltebilirsiniz.";
  } else if (score >= 60) {
    message = "Temel adımlar atıldı; el kitapçığındaki eksikleri tamamlayın.";
  } else if (score >= 40) {
    message = "Hesap kurulumu devam ediyor; önerilen sırayı takip edin.";
  } else {
    message = "Başlangıç aşamasındasınız; aşağıdaki rehberi adım adım tamamlayın.";
  }

  return {
    score: Math.min(score, maxScore),
    message,
    suggestions: suggestions.slice(0, 4),
    metrics,
    handbook,
  };
}
