import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import "@/styles/landing-site.css";
import FeaturesCarousel from "./FeaturesCarousel";
import HowItWorks from "./HowItWorks";
import UgcVideoSection from "./UgcVideoSection";
import FaqSection from "./FaqSection";
import InfluencersPage from "./InfluencersPage";
import BrandsPage from "./BrandsPage";
import AboutPage from "./AboutPage";
import ContactPage from "./ContactPage";
import PricingPage from "./PricingPage";
import MarketingHeroSection from "@/components/landing/MarketingHeroSection";
import trustLogoMeta from "@/data/trustLogoMeta.json";
import { publicAsset } from "@/lib/publicAsset";
import {
  footerLegalBodies,
  footerLegalTitles,
} from "@/constants/footerLegalContent";

const MARKETING_BG_VIDEO_SRC = "/pics/videos/herovideo1.mp4";

/** Varsayılan logo sayısı (pics/NEW/*.webp); .env içinde VITE_TRUST_LOGO_COUNT ile sınırlanır; manifest.json varsa sıra/liste güncellenir. */
function defaultTrustLogoCount() {
  const n = Number(import.meta.env.VITE_TRUST_LOGO_COUNT);
  const cap = trustLogoMeta.logos.length;
  if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), cap);
  return cap;
}

const trustLogoMetaByFile = Object.fromEntries(trustLogoMeta.logos.map((l) => [l.file, l]));

function trustLogoItemsFromFilenames(names) {
  return names.map((name) => {
    const meta = trustLogoMetaByFile[name];
    return {
      src: publicAsset(`pics/NEW/${name}`),
      width: meta?.width ?? 462,
      height: meta?.height ?? 260,
    };
  });
}

function defaultTrustLogoItems(count) {
  const n = Math.max(1, Math.min(count, trustLogoMeta.logos.length));
  const files = trustLogoMeta.logos.slice(0, n).map((l) => l.file);
  return trustLogoItemsFromFilenames(files);
}

const translations = {
  tr: {
    menu: [
      { id: "solutions", label: "Çözümler" },
      { id: "influencers", label: "Influencer'lar için" },
      { id: "brands", label: "Markalar" },
      { id: "pricing", label: "Fiyatlandırma" },
      { id: "contact", label: "İletişim" },
    ],
    navMega: {
      solutions: [
        {
          to: "/#hero-ozellikler",
          title: "Özellikler",
          description: "Keşif, kampanya ve analitik özellik özetleri; interaktif hero alanı.",
          icon: "layers",
        },
        {
          to: "/#infuhub-hakkinda",
          title: "INFUHUB hakkında",
          description: "Platform tanımı, yapay zekâ ile keşif ve arama deneyimi.",
          icon: "info",
        },
        {
          to: "/#referanslar",
          title: "Referanslar",
          description: "İş ortakları ve marka logoları.",
          icon: "trust",
        },
        {
          to: "/#nasil-calisir",
          title: "Nasıl çalışır",
          description: "Kayıttan eşleşmeye ve kampanya akışına kadar adımlar.",
          icon: "flow",
        },
        {
          to: "/#ugc-videolar",
          title: "UGC videolar",
          description: "Brief’ten teslimata otantik içerik ve onay süreci.",
          icon: "video",
        },
        {
          to: "/#sss",
          title: "SSS",
          description: "Sık sorulan sorular ve yanıtlar.",
          icon: "faq",
        },
      ],
      influencers: [
        {
          to: "/influencerlar#infl-hero",
          title: "Tanıtım",
          description: "Tanıtım alanı, kayıt ve öne çıkan çağrılar.",
          icon: "rocket",
        },
        {
          to: "/influencerlar#infl-benefits",
          title: "Avantajlar",
          description: "İçerik üreticileri için faydalar ve güven unsurları.",
          icon: "spark",
        },
        {
          to: "/influencerlar#infl-billing",
          title: "Ödeme & faturalama",
          description: "Yükleme, fatura ve ödeme takibi.",
          icon: "wallet",
        },
        {
          to: "/influencerlar#nasil-calisir",
          title: "Nasıl çalışır",
          description: "Kayıttan panele kadar uçtan uca akış.",
          icon: "flow",
        },
        {
          to: "/influencerlar#sss",
          title: "SSS",
          description: "Influencer sayfasına özel sık sorulan sorular.",
          icon: "faq",
        },
      ],
      brands: [
        {
          to: "/markalar-icin#brand-hero",
          title: "Marka çözümleri",
          description: "Doğru influencer’ı bulma ve kampanya özeti.",
          icon: "target",
        },
        {
          to: "/markalar-icin#brand-value",
          title: "Değer önerisi",
          description: "Ölçülebilir ve ölçeklenebilir iş birlikleri.",
          icon: "chart",
        },
        {
          to: "/markalar-icin#brand-features",
          title: "Platform özellikleri",
          description: "Keşiften raporlamaya tüm yetenekler.",
          icon: "layers",
        },
        {
          to: "/markalar-icin#brand-ai",
          title: "AI eşleşme",
          description: "Niş, kitle ve içerik tarzına göre öneriler.",
          icon: "cpu",
        },
        {
          to: "/markalar-icin#brand-campaign",
          title: "Kampanya & teklif",
          description: "Durum hatları ve anlaşma yönetimi.",
          icon: "campaign",
        },
        {
          to: "/markalar-icin#nasil-calisir",
          title: "Nasıl çalışır",
          description: "Marka tarafında süreç adımları.",
          icon: "flow",
        },
      ],
      contact: [
        {
          to: "/iletisim#iletisim-hero",
          title: "İletişim",
          description: "Demo, satış ve iş birliği talepleri.",
          icon: "mail",
        },
        {
          to: "/iletisim#iletisim-form",
          title: "Bilgilerimiz",
          description: "E-posta, adres ve çalışma saatleri.",
          icon: "map-pin",
        },
        {
          to: "/iletisim#iletisim-form",
          title: "Mesaj gönderin",
          description: "Formu doldurun; ekibimiz size dönsün.",
          icon: "form",
        },
        {
          to: "/kayit-sec",
          title: "Kayıt ol",
          description: "Marka veya influencer hesabı oluşturun.",
          icon: "user-plus",
        },
      ],
    },
    actions: {
      login: "Giriş",
      getStarted: "Başla",
      heroCta: "Hemen Başla",
      toggleMenu: "Menüyü aç/kapat",
      lang: "EN",
    },
    hero: {
      toggleBrand: "Markayım",
      toggleCreator: "Influencerım",
      default: {
        title: "MARKALAR VE INFLUENCER'LARIN BULUŞMA NOKTASI",
        description:
          "Doğru ortaklıklar markalara ölçülebilir değer, içerik üreticilerine düzenli gelir ve görünürlük sağlar. INFUHUB bu etkiyi görünür kılar.",
        primaryCta: "Hemen Başla",
        primaryTo: "/kayit-sec",
        panelAriaLabel: "Ana tanıtım",
      },
      brand: {
        titlePrefix: "Satışlarını ",
        titleBrand: "INFUHUB",
        titleSuffix: " ile Artır",
        description:
          "Doğru influencer’ları bul, kampanyalarını yönet ve performansını net şekilde ölç. INFUHUB ile influencer marketing süreçlerini tahmine değil veriye dayalı yönet.",
        primaryCta: "Influencer Bul",
        primaryTo: "/kayit/marka",
      },
      creator: {
        titleLine1: "MARKALARLA EŞLEŞ,",
        titleLine2: "GELİRİNİ ARTTIR",
        description:
          "Senin için doğru markalarla eşleş, teklifleri yönet ve tüm iş birliklerini tek panelden kontrol et. INFUHUB ile içerik üretimini kazanca dönüştür.",
        primaryCta: "İş Birliği Bul",
        primaryTo: "/kayit/influencer",
      },
      visualAltBrand: "Marka paneli ve analitik",
      visualAltCreator: "İçerik üreticisi paneli ve iş birlikleri",
    },
    trustLogoAlt: "İş ortağı logosu",
    solutionPartners: {
      title: "Çözüm ortaklarımız",
      ariaLabel: "Çözüm ortağı marka logoları",
      logoAlts: ["ikas", "Ticimax", "Meta", "Google Partner", "TikTok"],
    },
    feature: {
      whatIsTitleBefore: "",
      whatIsTitleAfter: "nedir?",
      whatIsBody:
        "INFUHUB; marka ve ajansların influencer pazarlamasını uçtan uca yönetmesini sağlayan yapay zekâ destekli bir platformdur. Niş, kitle, içerik tarzı ve kampanya hedeflerine göre eşleşme yapar; doğru üreticileri bulmanızı, brief’ten teslimata kadar süreçleri tek akışta yürütmenizi ve etkileşim ile dönüşüm metriklerini tek panelde takip etmenizi kolaylaştırır. Böylece tahmine dayalı kararlar yerine veriye dayalı, ölçülebilir ve ölçeklenebilir iş birlikleri kurabilirsiniz.",
      discoverTitle: "Yapay zekâ destekli influencer keşfi",
      discoverLead:
        "INFUHUB’un kendi eşleştirme algoritması; markanızın hedef kitlesi, kampanya hedefleri ve içerik beklentilerini analiz ederek size en uygun influencer’ları bulur ve önceliklendirir. Böylece markanızla en iyi uyumu yakalayacak iş birliklerini veriye dayalı biçimde hızlıca keşfedersiniz.",
      discoverBody:
        "Niş, kitle, lokasyon ve içerik stiline göre hızlı filtreleme yapın. Markanıza en uygun üreticileri kısa listelere alın ve kampanya kararlarını net metriklerle verin.",
      aiLabel: "Yapay zekâ ile keşfet",
      aiPlaceholder: "En uygun influencer’lar kimler?",
      aiButton: "Yapay zekâ ile bul",
      loadingTitle: "Profiller taranıyor…",
      loadingHint: "Niş ve hedef kitleye göre eşleşme yapılıyor.",
      resultsTitle: "Önerilen influencer’lar",
      resultsBack: "Tekrar ara",
      profileButton: "Profili incele",
      offerButton: "Teklif ver",
      profileModalTitle: "Profili incele",
      profileModalBody:
        "Tam profili, metrik geçmişini ve iletişim seçeneklerini görmek için INFUHUB hesabı oluşturun veya giriş yapın.",
      profileModalCta: "Kayıt ol",
      offerModalTitle: "Teklif gönder",
      offerModalBody:
        "Bu içerik üreticisine teklif iletmek ve kampanya akışını yönetmek için marka hesabıyla kayıt olun veya giriş yapın.",
      offerModalCta: "Teklif tamamla",
      modalCloseAria: "Kapat",
      metrics: { score: "Eşleşme", engagement: "Etkileşim", reach: "Erişim" },
      influencers: [
        { name: "Burak K.", handle: "@burakcreates", score: "96", engagement: "6.8%", reach: "1.2M" },
        { name: "Zeynep Y.", handle: "@zeynepyonair", score: "93", engagement: "5.9%", reach: "940K" },
        { name: "Selin A.", handle: "@selinflows", score: "91", engagement: "7.2%", reach: "780K" },
        { name: "Defne T.", handle: "@defnetrends", score: "89", engagement: "5.4%", reach: "1.5M" },
      ],
    },
    howItWorks: {
      title: "Nasıl Çalışır?",
      subtitle: "Üç adımda uçtan uca influencer süreci",
      bookPrev: "Önceki",
      bookNext: "Sonraki",
      bookStepWord: "Adım",
      bookDotsGroupAria: "Adım seçimi",
      registrationMini: {
        title: "Kayıt türü seçin",
        subtitle: "Hesabınızı nasıl oluşturmak istediğinizi seçin.",
        brandLabel: "Marka",
        influencerLabel: "Influencer",
        brandCta: "Marka kaydı",
        influencerCta: "Influencer kaydı",
        ariaLabel: "Kayıt türü seçimi sayfasına git",
      },
      aiVisual: {
        brandTag: "Marka",
        influencerTag: "Influencer",
        brandName: "Lumin",
        brandNiche: "Beauty",
        influencerHandle: "@zeynepyonair",
        influencerNiche: "Lifestyle",
        scoreLabel: "eşleşme",
      },
      steps: [
        {
          id: "signup",
          icon: "signup",
          title: "Kayıt ol",
          body: "Dakikalar içinde marka veya influencer hesabını oluştur; profilini, hedef kitleni ve iletişim tercihlerini tamamlayarak keşif ve eşleşmeye hazır ol.",
        },
        {
          id: "ai",
          icon: "ai",
          title: "AI ile eşleş",
          body: "Yapay zekâ nişini, içerik tarzını ve kampanya hedeflerini analiz ederek en uygun iş birliklerini skorlar; adayları tek tıkla kısa listene alırsın.",
        },
        {
          id: "manage",
          icon: "manage",
          title: "Yönet ve kazan",
          body: "Kampanyaları tek panelden yürüt; brief’ten onaya, teslimattan rapora kadar akışı takip et ve kazancını ölçekle.",
        },
      ],
    },
    ugcVideos: {
      eyebrow: "Otantik içerik, tek platformda",
      title: "UGC videolar",
      paragraphs: [
        "INFUHUB’da markalar kampanya brief’ini paylaşır; influencer’lar markanın tonuna uygun, özgün UGC (kullanıcı üretimi içerik) videoları üretir.",
        "Teslimler, revizyonlar ve onaylar aynı panelde toplanır—sosyal kanallarda doğal duran, güven veren video içeriklere hızlıca geçin.",
      ],
      badges: ["Brief & teslim", "Onay akışı", "Marka uyumu"],
      videoAria: "Örnek UGC video içeriği",
    },
    faqTitle: "Sık sorulan sorular",
    faq: [
      {
        q: "INFUHUB nedir?",
        a: "INFUHUB, doğru içerik üreticilerini bulmanıza, kampanyaları yönetmenize ve yatırımın geri dönüşünü ölçmenize yardımcı olan yapay zekâ destekli bir platformdur.",
      },
      {
        q: "INFUHUB'un geleneksel ajanslardan farkı nedir?",
        a: "INFUHUB bir aracı ajans değil, yapay zekâ destekli bir pazar yeri altyapısıdır. Markalarla influencer'ları manuel süreçler yerine veriye dayalı, otomatize bir sistemle buluşturur. Reklamın sadece \"yapılıp yapılmadığını\" değil, işletmeye ne kadar \"para kazandırdığını\" uçtan uca ölçer.",
      },
      {
        q: "Teknik entegrasyon süreçleri nasıldır?",
        a: "Platform, işletmelere iki ana entegrasyon kapısı sunar:\n\n• REST API: Web sitenizdeki verileri JSON formatında INFUHUB'a çekmenizi sağlar.\n• Mobil SDK: Uygulama içi hareketleri ve dönüşümleri takip etmek için kullanılır.\n\nSistem mikroservis mimarisiyle kurulduğu için yüksek trafikli kampanya dönemlerinde çökme yaşanmadan ölçeklenebilir.",
      },
      {
        q: "Ürün gönderimi ve sorumluluk kimde?",
        a: "Tanıtım için gönderilen fiziksel ürünler, kargoya verildiği andan itibaren 30 gün içinde influencer'a ulaşmalıdır. Eğer ürün kargoda zarar görürse veya yanlış adrese giderse sorumluluk marka/satıcı üzerindedir. Ancak influencer ürünü teslim aldıktan sonra ona zarar verirse, iade sürecinde bu zarar influencer'dan tahsil edilebilir.",
      },
      {
        q: "Dijital/yazılımsal ürünlerin teslimi nasıl olur?",
        a: "Sanal bir ürün (yazılım, abonelik vb.) satılıyorsa, teslimat fiziksel kargo ile değil; kullanıcının e-posta adresine gönderilen bir link veya INFUHUB paneli altındaki üyelik aktivasyonu ile gerçekleşir. Bu işlem gerçekleştikten sonra \"ürün teslim edildi\" sayılır.",
      },
      {
        q: "Cayma hakkının istisnaları nelerdir?",
        a: "Aşağıdaki durumlarda 14 günlük yasal iade süreci işlemez:\n\n• Özel hizmet: Influencer'ın marka için çektiği video/fotoğraf içeriği üretilmeye başlandığı an.\n• Dijital içerik: Kopyalanabilir yazılımlar, oyun kodları veya online eğitimler.\n• Hijyen: Ambalajı açılmış kozmetik veya tekstil ürünleri.",
      },
      {
        q: "18 yaş sınırı ve yetki",
        a: "18 yaşından küçükler platform üzerinden alışveriş yapamaz ve influencer olarak gelir elde edemezler. Sisteme girilen hatalı yaş bilgilerinden kaynaklanan sorumluluk kullanıcıya aittir.",
      },
      {
        q: "Sözleşmeyi nasıl iptal ederim?",
        a: "İstediğiniz zaman, sistemde kayıtlı e-postanız üzerinden 7 gün önceden haber vererek ayrılabilirsiniz. Ancak devam eden bir kampanyanız varsa, o işi tamamlamadan veya karşılıklı fesih sağlamadan ayrılmanız durumunda markanın uğradığı zarardan sorumlu tutulabilirsiniz.",
      },
      {
        q: "Yasal merci neresidir?",
        a: "Tüm ticari ve hukuki anlaşmazlıklarda Gaziantep Mahkemeleri ve İcra Daireleri münhasıran yetkilidir.",
      },
    ],
    finalCta: {
      title: "yeni nesil influencer marketing platformu",
      description: "şimdi ücretsiz dene",
      primaryBtn: "hemen başla",
      secondaryBtn: "iletişime geç",
      secondaryTo: "/iletisim",
    },
    footer: {
      about: "Influencer pazarlamasını tek merkezden yönetin.",
      cols: [
        {
          title: "INFUHUB",
          links: [
            { label: "Nasıl Çalışır", to: "/#nasil-calisir" },
            { label: "Sıkça Sorulan Sorular (SSS)", to: "/#sss" },
            { label: "Platform Özellikleri", to: "/#platform-ozellikleri" },
            { label: "Güvenlik & Veri Politikası", legal: "privacy" },
            { label: "KVKK Aydınlatma Metni", legal: "kvkk" },
            { label: "Mesafeli Satış Sözleşmesi", legal: "distanceSales" },
            { label: "API & Entegrasyonlar", to: "/iletisim" },
            { label: "Kullanım Şartları", legal: "terms" },
          ],
        },
        {
          title: "ÇÖZÜMLER",
          links: [
            { label: "UGC Videolar", to: "/#ugc-videolar" },
            { label: "Influencerlar İçin", to: "/influencerlar" },
            { label: "Markalar İçin", to: "/markalar-icin" },
            { label: "Ajanslar İçin", to: "/iletisim" },
            { label: "Kampanya Yönetimi", to: "/markalar-icin" },
          ],
        },
        {
          title: "EĞİTİM",
          links: [
            { label: "Blog", comingSoon: true },
            { label: "Rehberler (Guides)", comingSoon: true },
            { label: "Influencer Marketing 101", comingSoon: true },
            { label: "Webinarlar / Eğitimler", comingSoon: true },
          ],
        },
        {
          title: "FİYATLANDIRMA",
          links: [
            { label: "Paketler", to: "/fiyatlandirma" },
            { label: "İletişim", to: "/iletisim" },
          ],
        },
        {
          title: "HAKKIMIZDA",
          links: [
            { label: "Şirket Hakkında", to: "/hakkimizda#sirket-hakkinda" },
            { label: "Vizyon & Misyon", to: "/hakkimizda#vizyon-misyon" },
            { label: "Partnerler", to: "/hakkimizda#partnerler" },
          ],
        },
      ],
      copy: "© 2026 INFUHUB. Tüm hakları saklıdır.",
      email: "hi@infuhub.ai",
      location: "Gaziantep, Türkiye",
      comingSoonLabel: "(yakında)",
      registerLabel: "Kayıt ol",
      loginLabel: "Giriş yap",
      paymentLogosAria: "Ödeme ortakları: Mastercard, Visa",
    },
    featuresCarousel: {
      title: "Tüm süreci tek platformda yönet",
      subtitle: "Keşiften raporlamaya güçlü özellikler, tek akışta.",
      dotsAria: "Özellik kartları",
      cards: [
        {
          id: "ai",
          icon: "ai",
          title: "AI eşleştirme motoru",
          body: "Yapay zekâ ile markalar ve influencer’lar arasında en doğru eşleşmeleri oluşturur.",
        },
        {
          id: "discovery",
          icon: "discovery",
          title: "Influencer keşfi",
          body: "Binlerce influencer arasından filtreleyerek en uygun profilleri keşfedin.",
        },
        {
          id: "campaign",
          icon: "campaign",
          title: "Kampanya yönetimi",
          body: "Tüm iş birliklerini tek panel üzerinden kolayca yönetin.",
        },
        {
          id: "analytics",
          icon: "analytics",
          title: "Analitik ve raporlama",
          body: "Kampanya performansını detaylı verilerle analiz edin.",
        },
        {
          id: "payment",
          icon: "payment",
          title: "Ödeme ve sözleşme",
          body: "Ödeme ve sözleşme süreçlerini güvenle tek yerden yönetin.",
        },
      ],
    },
    brandsPage: {
      hero: {
        title: "INFUHUB ile doğru influencer'ı bul",
        titleHighlight: "doğru influencer'ı bul",
        description: "Markana en uygun içerik üreticilerini otomatik önerir, kitlene en etkili şekilde ulaşmanı sağlar.",
        primaryBtn: "Hemen Başla",
        secondaryBtn: "Demo Gör",
        demo: {
          startBtn: "Analizi Başlat",
          scoreLabel: "Eşleşme",
          cards: [
            { name: "Zeynep Y.", score: 92, meta: "Güzellik · Yaşam tarzı", initials: "ZY", handle: "@zeynepy" },
            { name: "Burak K.", score: 88, meta: "Teknoloji · Review", initials: "BK", handle: "@burakk" },
            { name: "Elif S.", score: 85, meta: "Moda · Lifestyle", initials: "ES", handle: "@elifstyle" },
            { name: "Mert A.", score: 79, meta: "Fitness · Sağlık", initials: "MA", handle: "@mertfit" },
          ],
        },
      },
      value: {
        title: "Tüm Kontrol Tek Panelde",
        subtitle: "INFUHUB ile influencer kampanyalarını ve sosyal medya verilerini tek bir yerden yönet.",
        panel: {
          chromeTitle: "INFUHUB — Marka",
          navHints: {
            overview: "Tüm metrikler tek bakışta",
            campaigns: "Kampanyalarını ve durumlarını yönet",
            match: "AI önerileri ve eşleşme skorları",
            analytics: "Tıklama, dönüşüm ve ROI",
            settings: "Marka profili ve bütçe",
          },
          mock: {
            greeting: "Hoş geldin",
            brandName: "Lumin",
            brandInitial: "L",
            searchPlaceholder: "Kampanya veya influencer ara…",
            notificationCount: "3",
            kpis: [
              { label: "Kampanyalar", value: "12", hint: "3 aktif" },
              { label: "Tıklama", value: "128K", hint: "7 gün" },
              { label: "Etkileşim", value: "6.8%", hint: "Ort." },
              { label: "ROI", value: "4.2x", hint: "30 gün" },
            ],
            chartTitle: "Performans özeti",
            chartHint: "Son 7 gün",
            activityTitle: "Son etkinlikler",
            activities: [
              { text: "Yeni teklif: Yaz koleksiyonu", time: "2 sa" },
              { text: "AI 3 öneri sıraladı", time: "1 sa" },
              { text: "Rapor hazır: Retargeting", time: "5 gün" },
            ],
            tableTitle: "Aktif kampanyalar",
            tableCols: ["Kampanya", "Durum", "ROI"],
            rows: [
              { campaign: "Ürün lansmanı", status: "Aktif", statusKey: "active", roi: "3.8x" },
              { campaign: "Influencer turu", status: "Bekleyen", statusKey: "pending", roi: "—" },
              { campaign: "Yaz koleksiyonu", status: "Aktif", statusKey: "active", roi: "4.1x" },
            ],
          },
          sidebar: [
            { id: "overview", label: "Özet" },
            { id: "campaigns", label: "Kampanyalar" },
            { id: "match", label: "Eşleşmeler" },
            { id: "analytics", label: "Analitik" },
            { id: "settings", label: "Marka" },
          ],
        },
      },
      features: {
        title: "Güçlü özellikler",
        subtitle: "Markan için tasarlanmış kapsamlı araç seti.",
        items: [
          { title: "YZ ile influencer eşleştirme", body: "Yapay sinir ağı modelimiz, markan için en uygun influencer'ları otomatik olarak önerir." },
          { title: "Kampanya yönetimi", body: "Kampanyalarını oluştur, yönet ve performansını tek panelden takip et." },
          { title: "Teklif ve öneri", body: "Influencer'lara teklif gönder, gelen teklifleri değerlendir ve süreçleri kolayca yönet." },
          { title: "Etkileşim takibi", body: "Etkileşim oranlarını ve kullanıcı davranışlarını anlık olarak analiz et." },
          { title: "Akıllı analitik", body: "Detaylı paneller ile kampanya performansını net şekilde gör." },
          { title: "Yeniden hedefleme ve büyüme", body: "İlgilenen kullanıcıları yeniden hedefleyerek dönüşümünü artır." },
        ],
      },
      aiMatch: {
        title: "Markan için en doğru eşleşmeleri yapay zeka bulur",
        description: "Eşleşme skoru, kitle örtüşmesi ve kategori uyumu ile en verimli iş birliklerini öner.",
        tags: ["Eşleşme skoru", "Kitle örtüşmesi", "Kategori uyumu", "Kampanya uyumu"],
        overlapLabel: "Kitle örtüşmesi",
        categoryLabel: "Kategori",
        cards: [
          { influencer: "Burak K.", score: "92", overlap: "78%", category: "Güzellik", label: "Eşleşme skoru" },
          { influencer: "Zeynep Y.", score: "88", overlap: "65%", category: "Teknoloji", label: "Eşleşme skoru" },
          { influencer: "Selin A.", score: "86", overlap: "71%", category: "Yaşam tarzı", label: "Eşleşme skoru" },
        ],
      },
      campaign: {
        title: "Tekliften yayına tüm süreç tek yerde",
        description: "Teklif gönderme, onay süreçleri ve iş akışını tek panelden yönet.",
        statuses: [
          { label: "Bekleyen", count: "3", status: "pending" },
          { label: "Aktif", count: "5", status: "active" },
          { label: "Tamamlanan", count: "12", status: "completed" },
        ],
        offerExpandHint: "Kampanya detayını göster veya gizle",
        offers: [
          {
            name: "Yaz koleksiyonu",
            status: "Aktif",
            statusKey: "active",
            detailRows: [
              { label: "Bütçe", value: "₺240.000" },
              { label: "Tahmini erişim", value: "1,2M" },
              { label: "Influencer", value: "8 içerik üreticisi" },
              { label: "Dönem", value: "12 Haz – 30 Ağu" },
              { label: "Öne çıkan", value: "Reels + Hikâye paketi" },
            ],
          },
          {
            name: "Teknoloji incelemesi",
            status: "Bekleyen",
            statusKey: "pending",
            detailRows: [
              { label: "Bütçe", value: "₺95.000" },
              { label: "Hedef kitle", value: "Teknoloji · 25–44" },
              { label: "Influencer", value: "3 aday bekliyor" },
              { label: "Son tarih", value: "Önümüzdeki 14 gün" },
              { label: "Durum", value: "Teklif değerlendirmesi" },
            ],
          },
          {
            name: "Lansman kampanyası",
            status: "Tamamlandı",
            statusKey: "completed",
            detailRows: [
              { label: "Toplam erişim", value: "890K" },
              { label: "Etkileşim oranı", value: "%7,1" },
              { label: "ROI", value: "3,8x" },
              { label: "Tamamlanma", value: "18 Mar 2026" },
              { label: "Özet", value: "Lansman hedefleri tutturuldu" },
            ],
          },
          {
            name: "Tatil özel kampanyası",
            status: "Aktif",
            statusKey: "active",
            detailRows: [
              { label: "Bütçe", value: "₺180.000" },
              { label: "Tahmini erişim", value: "950K" },
              { label: "Influencer", value: "5 aktif" },
              { label: "Dönem", value: "1 Ara – 15 Oca" },
              { label: "Öne çıkan", value: "Kupon + canlı yayın" },
            ],
          },
        ],
      },
      howItWorks: {
        title: "Nasıl çalışır?",
        subtitle: "3 adımda influencer marketing sürecini başlat.",
        registrationMini: {
          title: "Kayıt türü seçin",
          subtitle: "Hesabınızı nasıl oluşturmak istediğinizi seçin.",
          brandLabel: "Marka",
          influencerLabel: "Influencer",
          brandCta: "Marka kaydı",
          influencerCta: "Influencer kaydı",
          ariaLabel: "Kayıt türü seçimi sayfasına git",
        },
        aiVisual: {
          brandTag: "Marka",
          influencerTag: "Influencer",
          brandName: "Lumin",
          brandNiche: "Beauty",
          influencerHandle: "@zeynepyonair",
          influencerNiche: "Lifestyle",
          scoreLabel: "eşleşme",
        },
        steps: [
          {
            id: "profile",
            icon: "signup",
            title: "Marka profilini oluştur",
            body: "Hedef kitleni, sektörünü, tonunu ve kampanya hedeflerini tanımla; doğru eşleşmeler için profilin tek kaynak olsun.",
          },
          {
            id: "ai",
            icon: "ai",
            title: "AI önerilerini al",
            body: "Yapay zeka markana uygun influencer adaylarını skorlar ve sıralar; kısa listeni dakikalar içinde oluşturup teklif sürecine geç.",
          },
          {
            id: "launch",
            icon: "dashboard",
            title: "Kampanya başlat",
            body: "Kampanyayı yayınla, teslim ve onay adımlarını takip et; tıklama, etkileşim ve dönüşüm verileriyle performansı tek ekranda analiz et.",
          },
        ],
      },
      faqTitle: "Sık sorulan sorular",
      faq: [
        { q: "AI nasıl eşleşme yapıyor?", a: "Yapay zeka, markanızın hedef kitlesi, sektörü ve içerik tercihleri ile influencer'ların profil verilerini karşılaştırarak en yüksek uyum puanını hesaplar." },
        { q: "Kampanya nasıl başlatılır?", a: "Marka profilinizi oluşturduktan sonra, AI önerilerinden influencer seçip tek tıkla kampanya oluşturabilirsiniz." },
        {
          q: "Kampanya kurgusu ve hedefleme nasıl yapılır?",
          a: "Marka, panel üzerinden kampanya oluştururken \"Satış Esaslı\", \"Tıklama Esaslı\" veya \"Görüntülenme Esaslı\" modellerden birini seçer. Her kampanya için bir brief tanımlanır. Bu brief; kullanılacak etiketleri, videonun süresini ve influencer'ın uyması gereken etik kuralları içerir.",
        },
        {
          q: "Aynı anda birden fazla kampanya yönetebilir miyim?",
          a: "Evet. Tek panel üzerinden birden fazla kampanya ve ekip sürecini eş zamanlı yönetebilirsiniz.",
        },
        { q: "Veriler nereden geliyor?", a: "Sosyal medya platformlarının API'leri ve kendi veri analiz motorumuz aracılığıyla gerçek zamanlı veriler toplanır." },
      ],
      finalCta: {
        title: "Markanı büyütmeye hazır mısın?",
        description: "Doğru influencer ile doğru kitleye ulaş.",
        primaryBtn: "Hemen Başla",
        secondaryBtn: "Demo Gör",
        trust: "Ücretsiz başla • Kredi kartı gerektirmez",
      },
    },
    influencersPage: {
      hero: {
        eyebrow: "Influencer'lar için",
        title: "Markalarla eşleş, kampanyalara katıl, kazancını büyüt",
        titleHighlight: "kazancını büyüt",
        description:
          "İstisna belgeni yükle, uygun kampanyaları keşfet, markalarla eşleş ve tüm süreci tek panelden yönet.",
        primaryBtn: "Hemen Başvur",
        secondaryBtn: "Nasıl çalıştığını gör",
        chips: ["Faturalandırma desteği", "AI destekli eşleşme", "Tek panel yönetimi"],
        panel: {
          title: "AI Match",
          badge: "+12%",
          cards: [
            { title: "Match score", value: "92", meta: "Beauty · Lifestyle" },
            { title: "Gelir özeti", value: "₺18.400", meta: "Son 30 gün" },
            { title: "Onay bekleyen", value: "4 kampanya", meta: "2 yeni teklif" },
            { title: "Belge durumu", value: "Doğrulandı", meta: "Faturalandırma aktif" },
          ],
        },
        demo: {
          nnLabel: "Yapay zeka analizi",
          offerBtn: "Teklif ver",
        },
      },
      trust: {
        title: "Güven ve kolaylık",
        subtitle: "Operasyon yükünü azaltan net ve profesyonel bir deneyim.",
        items: [
          { icon: "invoice", title: "Faturayı sistem yönetsin", body: "Operasyon yükünü platforma bırak, üretime odaklan." },
          { icon: "ai", title: "Doğru kampanyalar", body: "AI destekli filtreleme ile en uygun iş birliklerini gör." },
          { icon: "panel", title: "Tek panel yönetimi", body: "Başvuru, onay ve ödeme süreçlerini tek yerden takip et." },
        ],
      },
      benefits: {
        title: "Influencer avantajları",
        subtitle: "Profesyonel, güvenli ve kazancı artıran bir iş akışı.",
        items: [
          { icon: "aiMatch", title: "AI destekli marka eşleşmesi", body: "Profiline uygun markaları otomatik önerir." },
          { icon: "discovery", title: "Kampanya keşfi", body: "Uygun kampanyaları tek ekrandan gör ve başvur." },
          { icon: "invoice", title: "Faturalandırma kolaylığı", body: "İstisna belgenle süreçler platform tarafından yürütülür." },
          { icon: "earnings", title: "Gelir takibi", body: "Ödemeleri ve kazançlarını düzenli olarak izle." },
          { icon: "panel", title: "Tek panel yönetimi", body: "Başvuru, teslim ve ödeme adımlarını kontrol et." },
          { icon: "workflow", title: "Profesyonel iş akışı", body: "Markalarla güvenli ve düzenli çalış." },
        ],
      },
      billing: {
        title: "Faturalandırma süreciyle uğraşmadan işlerine odaklan",
        description:
          "İstisna belgeni sisteme yükle, gerekli süreçleri platform senin adına düzenli şekilde yönetsin. Böylece sen operasyon değil üretim ve iş birliklerine odaklan.",
        steps: ["Belge yükleme", "Doğrulama", "Otomatik faturalandırma", "Ödeme takibi"],
        badge: "Belge doğrulandı",
        labels: {
          uploadTitle: "İstisna belgesi.pdf",
          uploadStatus: "Belge doğrulandı",
          billingLabel: "Faturalandırma",
          billingStatus: "Aktif",
          payoutLabel: "Ödeme durumu",
          payoutStatus: "Bekliyor",
          progressLabel: "Süreç %72 tamamlandı",
        },
      },
      howItWorks: {
        title: "Nasıl çalışır?",
        subtitle: "3 adımda influencer sürecini başlat.",
        registrationMini: {
          title: "Kayıt türü seçin",
          subtitle: "Hesabınızı nasıl oluşturmak istediğinizi seçin.",
          brandLabel: "Marka",
          influencerLabel: "Influencer",
          brandCta: "Marka kaydı",
          influencerCta: "Influencer kaydı",
          ariaLabel: "Kayıt türü seçimi sayfasına git",
        },
        aiVisual: {
          brandTag: "Marka",
          influencerTag: "Influencer",
          brandName: "Lumin",
          brandNiche: "Beauty",
          influencerHandle: "@zeynepyonair",
          influencerNiche: "Lifestyle",
          scoreLabel: "eşleşme",
        },
        steps: [
          {
            id: "profile",
            icon: "signup",
            title: "Profilini oluştur",
            body: "Nişini, içerik tarzını ve istatistiklerini ekle; markaların seni doğru kampanyalarla bulması için profilini güçlendir.",
          },
          {
            id: "doc",
            icon: "ai",
            title: "İstisna belgeni yükle",
            body: "Belgeni güvenle yükle; doğrulama ve faturalandırma adımlarını platform senin adına düzenli şekilde yürütsün.",
          },
          {
            id: "earn",
            icon: "dashboard",
            title: "Kampanyalara katıl",
            body: "Sana uygun kampanyaları gör, başvur ve onay süreçlerini takip et; teslim ve ödemeleri tek panelden yöneterek gelirini büyüt.",
          },
        ],
      },
      dashboard: {
        title: "Tüm süreci tek panelden takip et",
        description: "Başvurularından ödemelerine kadar tüm iş akışını tek ekranda görüntüle.",
        stats: [
          { label: "Aktif kampanya", value: "6" },
          { label: "Bekleyen ödeme", value: "₺42.500" },
          { label: "Toplam kazanç", value: "₺128.400" },
        ],
        mock: {
          greeting: "Günaydın",
          userName: "Zeynep",
          userHandle: "@zeynepyonair · İçerik üreticisi",
          avatarInitials: "ZY",
          searchPlaceholder: "Kampanya veya marka ara…",
          notificationCount: "3",
          chartLabel: "Haftalık kazanç",
          chartHint: "Son 7 gün",
          activityTitle: "Son hareketler",
          activities: [
            { text: "Maven kampanya teklifi onaylandı", time: "2 saat önce" },
            { text: "Lumin brief güncellendi", time: "Dün" },
            { text: "Ödeme talimatı oluşturuldu", time: "2 gün önce" },
          ],
          tableTitle: "Aktif işler",
          tableCols: ["Kampanya", "Marka", "Durum", "Teslim"],
          sidebar: [
            { id: "home", label: "Özet", active: true },
            { id: "campaigns", label: "Kampanyalar" },
            { id: "payments", label: "Ödemeler" },
            { id: "profile", label: "Profil" },
          ],
          rows: [
            { campaign: "Yaz koleksiyonu · UGC", brand: "Lumin", status: "Üretimde", statusVariant: "info", due: "18 Nis" },
            { campaign: "UGC seti (3/5)", brand: "Maven", status: "İncelemede", statusVariant: "warning", due: "22 Nis" },
            { campaign: "Ürün lansmanı", brand: "Crescent", status: "Ödeme bekliyor", statusVariant: "success", due: "—" },
          ],
        },
      },
      faqTitle: "Sık sorulan sorular",
      faq: [
        { q: "İstisna belgesi nedir ve nasıl yüklenir?", a: "Panelden belge yükleme alanını kullanarak hızlıca ekleyebilirsin." },
        {
          q: "\"Muafiyet belgesi\" ve ödeme alma süreci nedir?",
          a: "Gelir İdaresi Başkanlığı'ndan alınan \"Sosyal İçerik Üreticiliği İstisna Belgesi\"nin sisteme yüklenmesi zorunludur. Ödemeler, INFUHUB tarafından %10 hizmet bedeli kesildikten sonra, doğrudan bankadaki istisna hesabınıza yatırılır. Bu sayede vergi kesintileri banka tarafından otomatik yapılır, sizin ek bir beyanname vermenize (belli limitlere kadar) gerek kalmaz.",
        },
        { q: "Faturalandırma süreci nasıl işliyor?", a: "Belge doğrulandıktan sonra süreçler platform tarafından otomatik yönetilir." },
        { q: "Hangi kampanyalara başvurabilirim?", a: "Profil ve içerik türüne göre sana özel kampanyalar listelenir." },
        {
          q: "İçeriklerin reddedilme nedenleri neler olabilir?",
          a: "• Markanın belirlediği brief dışına çıkılması.\n• Görüntü/ses kalitesinin standartların altında kalması.\n• Yasal reklam etiketlerinin (#işbirliği vb.) unutulması.\n\nReddedilen içerikler için \"tekrar deneme\" hakkınız bulunur ancak onaylanmayan içerik için hakediş ödenmez.",
        },
        { q: "Ödeme takibini nereden yaparım?", a: "Tüm ödeme durumlarını panelde görebilirsin." },
        { q: "Markalarla nasıl eşleşiyorum?", a: "AI eşleştirme motoru uyumlu markaları önerir." },
      ],
      finalCta: {
        title: "Hazırsan doğru kampanyalarla eşleşmeye başla",
        description:
          "İş yükünü azaltan, marka eşleşmelerini kolaylaştıran ve kazancını büyütmene yardımcı olan platforma şimdi katıl.",
        primaryBtn: "Hemen Başvur",
        secondaryBtn: "Demo incele",
        trust: "Ücretsiz başla • Kredi kartı gerekmez",
      },
    },
    aboutPage: {
      hero: {
        title: "Influencer marketing’te ",
        titleHighlight: "ölçülebilir ve ölçeklenebilir iş birlikleri",
        description:
          "INFUHUB; markalar, ajanslar ve içerik üreticilerinin aynı dilde konuştuğu, yapay zekâ destekli bir influencer marketing platformudur. Tekliften teslimata, bütçeden rapora kadar tüm süreci tek panelde toplar; TL bazlı bütçe ve ödeme mantığıyla Türkiye operasyonlarına uygundur.",
        highlights: [
          {
            title: "Markalar & ajanslar",
            text: "Kampanya kurulumu, influencer keşfi, teklif ve revizyon, bütçe ile içerik onayı tek akışta.",
          },
          {
            title: "İçerik üreticileri",
            text: "Uygun kampanyalar, net brief, şeffaf ücret ve teslim takibi; hak ediş süreçleri görünür.",
          },
          {
            title: "Veri & güven",
            text: "Performans ve takip linkleriyle ölçüm; KVKK ve sözleşme disiplinine uygun süreç tasarımı.",
          },
        ],
      },
      intro: {
        title: "INFUHUB tam olarak ne yapar?",
        paragraphs: [
          "Geleneksel influencer çalışmalarında e-posta zincirleri, dağınık tablolar ve net olmayan KPI’lar çoğu ekibi yavaşlatır. INFUHUB bu karmaşayı kaldırmak için tasarlandı: doğru içerik üreticisini bulmanızı, kampanyayı yönetmenizi, teklifleri karşılaştırmanızı ve yatırımın geri dönüşünü takip etmenizi sağlar.",
          "Platform; yapay zekâ ile profil ve kampanya eşleştirmesi sunar, marka tarafında operasyon yükünü azaltır, içerik üreticisi tarafında ise başvuru ve teslim süreçlerini sadeleştirir. Böylece hem hız hem de hesap verebilirlik aynı çatı altında bir araya gelir.",
          "Amacımız “sadece bir araç” değil; influencer marketing’de güvenilir, tekrarlanabilir ve büyümeye uygun bir işletim modeli sunmaktır.",
        ],
      },
      storySectionTitle: "Misyon ve vizyon",
      storySectionLead:
        "Kısa vadede süreçleri iyileştirirken, uzun vadede sektörün ölçüm ve etik standartlarına katkıda bulunmayı hedefliyoruz.",
      mission: {
        kicker: "Neden varız?",
        title: "Misyonumuz",
        bodyParagraphs: [
          "Doğru marka–içerik üreticisi eşleşmelerini hızlandırmak, kampanya yaşam döngüsünü uçtan uca sadeleştirmek ve her paydaş için şeffaf performans görünürlüğü sağlamak.",
          "Teklif pazarlığından içerik teslimine kadar tüm adımları tek yerde toplayarak ekiplerin zamanını geri kazandırmak ve hatalı iletişimden kaynaklanan maliyetleri düşürmek.",
        ],
        visionKicker: "Nereye gidiyoruz?",
        visionTitle: "Vizyonumuz",
        visionParagraphs: [
          "Influencer marketing’de güvenilir, teknoloji odaklı ve ölçülebilirliği merkeze alan küresel bir omurga olmak; markalar ile içerik üreticileri arasında sürdürülebilir iş birliklerinin standart haline gelmesine katkı sağlamak.",
          "Ölçüm, etik reklam etiketleri ve veri güvenliği konularında sektörle birlikte ilerleyerek platformumuzu sürekli geliştirmek.",
        ],
      },
      capabilities: {
        title: "Platform yetenekleri",
        subtitle: "INFUHUB’u günlük operasyonunuzun merkezine koyan başlıca modüller.",
        items: [
          {
            title: "Kampanya ve bütçe yönetimi",
            body: "Kampanya tanımı, hedef kitle, içerik satırları ve TL bazlı bütçe planı; teklif kabulünde bakiye mantığı ile operasyonel kontrol.",
          },
          {
            title: "Influencer keşfi ve teklif akışı",
            body: "Yapay zekâ destekli öneriler, davet veya herkese açık kampanyalar, çok turlu teklif ve revizyon geçmişi.",
          },
          {
            title: "AI destekli eşleştirme",
            body: "Profil, niş ve kampanya parametrelerine göre daha isabetli öneriler; zamandan tasarruf, daha az manuel tarama.",
          },
          {
            title: "Performans ve raporlama",
            body: "Takip linkleri ve kampanya metrikleriyle yatırımın etkisini görünür kılma; karar almayı kolaylaştıran özet görünümler.",
          },
        ],
      },
      pillars: {
        title: "Değerlerimiz",
        subtitle: "Ürün kararlarını ve ekip kültürümüzü şekillendiren ilkeler.",
        items: [
          { title: "Şeffaflık", body: "Veri ve süreçlerde açık iletişim; gizli maliyet ve belirsizlik yok." },
          { title: "Yenilikçilik", body: "Yapay zekâ ve otomasyon ile sürekli gelişen bir platform." },
          { title: "Ortak başarı", body: "Marka ve içerik üreticileri için sürdürülebilir, adil iş birlikleri." },
          { title: "Güven", body: "Gizlilik, KVKK ve sözleşme süreçlerinde titiz standartlar." },
        ],
      },
      partnersTitle: "Birlikte çalıştığımız markalar",
      finalCta: {
        title: "INFUHUB dünyasına katılın",
        description: "Ekibimizle tanışın ve platformu yakından keşfedin.",
        primaryBtn: "İletişime geç",
        primaryTo: "/iletisim",
        secondaryBtn: "Demo talep et",
        secondaryTo: "/iletisim",
        trust: "Yanıt süresi: 1 iş günü içinde",
      },
    },
    contactPage: {
      framer: {
        heroTitle: "İletişim",
        heroSubtitle: "Destek, satış veya uzman ekipten yardım alın.",
        mainLabel: "İletişim seçenekleri",
        featured: {
          title: "Platform desteği",
          description: "Uzmanlarımızdan yardım alın.",
          primaryCta: "Mesaj gönder",
          status: "Tüm sistemler çalışıyor",
        },
        cards: [
          {
            icon: "user",
            title: "Faturalandırma desteği",
            body: "Hesap veya ödeme konularında yardım.",
            btn: "Sohbete başla",
            category: "fatura",
          },
          {
            icon: "alert",
            title: "Acil destek",
            body: "Operasyonunda kritik bir durum olduğunda hızlı yanıt.",
            btn: "Acil",
            category: "acil",
          },
          {
            icon: "chat",
            title: "Satış ekibi",
            body: "Kurumsal çözümler için birlikte planlayalım.",
            btn: "Satış ile görüş",
            category: "satis",
          },
          {
            icon: "megaphone",
            title: "Kötüye kullanım",
            body: "İhlal, spam veya politika bildirimi.",
            btn: "Mesaj gönder",
            category: "kotuye_kullanim",
          },
        ],
      },
      contactMail: {
        label: "İletişim",
        email: "hi@infuhub.ai",
        href: "mailto:hi@infuhub.ai",
      },
      form: {
        title: "İletişim formu",
        frameTitle: "Mesajınızı yazın",
        modalCloseLabel: "Kapat",
        lead: "Telefon, e-posta ve mesajını bırak; sana dönelim.",
        leadExtended: "İsim, soyisim, konu başlığı, iletişim bilgilerin ve mesajını bırak; sana dönelim.",
        firstName: "İsim",
        lastName: "Soyisim",
        subject: "Konu başlığı",
        phone: "Telefon",
        email: "E-posta",
        message: "Mesaj",
        submit: "Gönder",
        sending: "Gönderiliyor…",
        success: "Teşekkürler! Mesajın alındı; en kısa sürede dönüş yapacağız.",
        categoryLabels: {
          platform: "Platform desteği",
          fatura: "Faturalandırma desteği",
          acil: "Acil destek",
          satis: "Satış ekibi",
          kotuye_kullanim: "Kötüye kullanım",
        },
      },
      finalCta: {
        title: "Hemen başlamaya hazır mısınız?",
        description: "Platforma kayıt olun veya demo için randevu alın.",
        primaryBtn: "Başla",
        secondaryBtn: "Demo gör",
        trust: "Ücretsiz başlangıç • Kredi kartı gerekmez",
      },
    },
    pricingPage: {
      packagesSectionLabel: "Üyelik planları",
      hero: {
        title: "Şeffaf paketler, ölçeklenebilir ",
        titleHighlight: "INFUHUB deneyimi",
        description:
          "Starter ile ücretsiz deneyin; Standard, Plus ve Premium ile kampanya hacminizi, analitiği ve desteği büyütün.",
      },
      packages: [
        {
          id: "starter",
          name: "Starter",
          tagline: "Keşif ve başlangıç",
          priceMain: "0 ₺",
          priceSub: "süresiz · kart gerekmez",
          cardVariant: "starter",
          badge: "Ücretsiz dene",
          badgeTone: "free",
          featured: false,
          features: [
            "Aylık 2 kampanya · sınırlı erişim",
            "Temel AI eşleştirme",
            "E-posta desteği",
          ],
          cta: "Hemen Başla",
          ctaTo: "/kayit-sec",
        },
        {
          id: "standard",
          name: "Standard",
          tagline: "Büyüyen ekipler",
          priceMain: "200 ₺",
          priceSub: "/ ay",
          cardVariant: "standard",
          badge: null,
          featured: false,
          features: [
            "Aylık 10 kampanya · geniş havuz",
            "Gelişmiş AI ve yönetim paneli",
            "E-posta + chat",
          ],
          cta: "Standard’a Geç",
          ctaTo: "/iletisim",
        },
        {
          id: "plus",
          name: "Plus",
          tagline: "Performans odaklı",
          priceMain: "500 ₺",
          priceSub: "/ ay",
          cardVariant: "plus",
          badge: "En popüler",
          badgeTone: "popular",
          featured: true,
          features: [
            "Aylık 25 kampanya · premium filtreler",
            "Gelişmiş analiz ve teklif yönetimi",
            "Öncelikli destek",
          ],
          cta: "Daha Fazla Güç Al",
          ctaTo: "/iletisim",
        },
        {
          id: "premium",
          name: "Premium",
          tagline: "Ajans ve kurumsal",
          priceMain: "1.000 ₺",
          priceSub: "/ ay",
          cardVariant: "premium",
          badge: "En güçlü",
          badgeTone: "strength",
          featured: false,
          features: [
            "Sınırsız kampanya · tam veri",
            "API/SDK ve gelişmiş analitik",
            "Özel temsilci · hızlı destek",
          ],
          cta: "Premium’a Geç",
          ctaTo: "/iletisim",
        },
      ],
      comparison: {
        title: "Paket özellikleri",
        subtitle: "Dört planın temel farklarını tek bakışta karşılaştırın.",
        tableAria: "Starter, Standard, Plus ve Premium özellik tablosu",
        colFeature: "Özellik",
        columns: [
          { id: "starter", label: "Starter" },
          { id: "standard", label: "Standard" },
          { id: "plus", label: "Plus" },
          { id: "premium", label: "Premium" },
        ],
        rows: [
          {
            feature: "Aylık kampanya oluşturma",
            starter: "2",
            standard: "10",
            plus: "25",
            premium: "Sınırsız",
          },
          {
            feature: "Influencer erişimi",
            starter: "Sınırlı",
            standard: "Geniş havuz",
            plus: "Premium filtreleme",
            premium: "Tüm veritabanı",
          },
          {
            feature: "AI eşleştirme / öneri",
            starter: "Temel",
            standard: "Gelişmiş",
            plus: "Gelişmiş + öncelik",
            premium: "Otomatik optimizasyon",
          },
          {
            feature: "Kampanya yönetimi & analitik",
            starter: "Özet",
            standard: "Detaylı panel + temel",
            plus: "Gelişmiş dashboard",
            premium: "Özel rapor + analitik",
          },
          {
            feature: "Teklif & sözleşme yönetimi",
            starter: "—",
            standard: "—",
            plus: "Var",
            premium: "Var + entegrasyon",
          },
          {
            feature: "API & SDK / retargeting",
            starter: "—",
            standard: "—",
            plus: "—",
            premium: "Dahil (kapsam)",
          },
          {
            feature: "Destek",
            starter: "E-posta",
            standard: "E-posta + chat",
            plus: "Öncelikli",
            premium: "Özel temsilci + hızlı",
          },
        ],
      },
      finalCta: {
        title: "Hangi paketin uygun olduğundan emin değil misiniz?",
        description: "Ekibimiz kullanım profilinize göre netleştirsin; demo ve teklif için bir mesaj yeter.",
        primaryBtn: "İletişime geç",
        primaryTo: "/iletisim",
        secondaryBtn: "Ücretsiz kayıt",
        secondaryTo: "/kayit-sec",
        trust: "Yanıt süresi: 1 iş günü içinde",
      },
    },

  },
  en: {
    menu: [
      { id: "solutions", label: "Solutions" },
      { id: "influencers", label: "For Influencers" },
      { id: "brands", label: "Brands" },
      { id: "pricing", label: "Pricing" },
      { id: "contact", label: "Contact" },
    ],
    navMega: {
      solutions: [
        {
          to: "/#hero-ozellikler",
          title: "Features",
          description: "Discovery, campaign, and analytics highlights in the interactive hero.",
          icon: "layers",
        },
        {
          to: "/#infuhub-hakkinda",
          title: "About INFUHUB",
          description: "What the platform is, plus AI-powered discovery.",
          icon: "info",
        },
        {
          to: "/#referanslar",
          title: "References",
          description: "Partners and brand logos.",
          icon: "trust",
        },
        {
          to: "/#nasil-calisir",
          title: "How it works",
          description: "From signup to matching and campaign flow.",
          icon: "flow",
        },
        {
          to: "/#ugc-videolar",
          title: "UGC videos",
          description: "Brief to delivery for authentic content.",
          icon: "video",
        },
        {
          to: "/#sss",
          title: "FAQ",
          description: "Common questions and answers.",
          icon: "faq",
        },
      ],
      influencers: [
        {
          to: "/influencerlar#infl-hero",
          title: "Overview",
          description: "Hero section, signup, and key CTAs.",
          icon: "rocket",
        },
        {
          to: "/influencerlar#infl-benefits",
          title: "Benefits",
          description: "Why creators choose INFUHUB.",
          icon: "spark",
        },
        {
          to: "/influencerlar#infl-billing",
          title: "Payouts & billing",
          description: "Uploads, invoices, and payment tracking.",
          icon: "wallet",
        },
        {
          to: "/influencerlar#nasil-calisir",
          title: "How it works",
          description: "End-to-end steps for creators.",
          icon: "flow",
        },
        {
          to: "/influencerlar#sss",
          title: "FAQ",
          description: "Creator-focused questions.",
          icon: "faq",
        },
      ],
      brands: [
        {
          to: "/markalar-icin#brand-hero",
          title: "For brands",
          description: "Find the right creators for your goals.",
          icon: "target",
        },
        {
          to: "/markalar-icin#brand-value",
          title: "Value proposition",
          description: "Measurable, scalable partnerships.",
          icon: "chart",
        },
        {
          to: "/markalar-icin#brand-features",
          title: "Platform features",
          description: "Discovery through reporting in one flow.",
          icon: "layers",
        },
        {
          to: "/markalar-icin#brand-ai",
          title: "AI matching",
          description: "Niche, audience, and style-based suggestions.",
          icon: "cpu",
        },
        {
          to: "/markalar-icin#brand-campaign",
          title: "Campaigns & offers",
          description: "Pipeline statuses and deal management.",
          icon: "campaign",
        },
        {
          to: "/markalar-icin#nasil-calisir",
          title: "How it works",
          description: "Brand-side process steps.",
          icon: "flow",
        },
      ],
      contact: [
        {
          to: "/iletisim#iletisim-hero",
          title: "Contact",
          description: "Demos, sales, and partnership requests.",
          icon: "mail",
        },
        {
          to: "/iletisim#iletisim-form",
          title: "Details",
          description: "Email, address, and hours.",
          icon: "map-pin",
        },
        {
          to: "/iletisim#iletisim-form",
          title: "Send a message",
          description: "Fill the form and we’ll get back to you.",
          icon: "form",
        },
        {
          to: "/kayit-sec",
          title: "Sign up",
          description: "Create a brand or creator account.",
          icon: "user-plus",
        },
      ],
    },
    actions: {
      login: "Login",
      getStarted: "Get Started",
      heroCta: "Get started now",
      toggleMenu: "Toggle menu",
      lang: "TR",
    },
    hero: {
      toggleBrand: "I'm a brand",
      toggleCreator: "I'm a creator",
      default: {
        title: "WHERE BRANDS AND INFLUENCERS MEET",
        description:
          "The right partnerships deliver measurable value for brands—and steady income and visibility for creators. INFUHUB makes that impact visible.",
        primaryCta: "Get started",
        primaryTo: "/kayit-sec",
        panelAriaLabel: "Main hero",
      },
      brand: {
        titlePrefix: "Increase your sales with ",
        titleBrand: "INFUHUB",
        titleSuffix: "",
        description:
          "Find the right influencers, run campaigns, and measure performance with clarity. With INFUHUB, manage influencer marketing with data—not guesswork.",
        primaryCta: "Find influencers",
        primaryTo: "/kayit/marka",
      },
      creator: {
        titleLine1: "MATCH WITH BRANDS,",
        titleLine2: "GROW YOUR REVENUE",
        description:
          "Get matched with the right brands, manage offers, and control every collaboration from one panel. Turn your content into income with INFUHUB.",
        primaryCta: "Find partnerships",
        primaryTo: "/kayit/influencer",
      },
      visualAltBrand: "Brand dashboard and analytics",
      visualAltCreator: "Creator workspace and partnerships",
    },
    trustLogoAlt: "Partner logo",
    solutionPartners: {
      title: "Our solution partners",
      ariaLabel: "Solution partner brand logos",
      logoAlts: ["ikas", "Ticimax", "Meta", "Google Partner", "TikTok"],
    },
    feature: {
      whatIsTitleBefore: "What is",
      whatIsTitleAfter: "?",
      whatIsBody:
        "INFUHUB is an AI-powered influencer marketing platform that helps you discover the right influencers, manage partnerships, and track results in one place.",
      discoverTitle: "Discover Influencers with AI-Powered Search",
      discoverLead:
        "INFUHUB’s proprietary matching algorithm analyzes your brand’s target audience, campaign goals, and content expectations to surface and rank the influencers who fit you best—so you can discover data-driven partnerships quickly.",
      discoverBody:
        "Search smarter, not harder. Find creators by niche, audience, location, and content style, then shortlist the best fits for your brand.",
      aiLabel: "Explore with AI",
      aiPlaceholder: "Who are the top influencers?",
      aiButton: "Find With AI",
      loadingTitle: "Scanning profiles…",
      loadingHint: "Matching your niche and audience.",
      resultsTitle: "Recommended Influencers",
      resultsBack: "Search again",
      profileButton: "View profile",
      offerButton: "Send offer",
      profileModalTitle: "View profile",
      profileModalBody:
        "Create an INFUHUB account or sign in to see the full profile, metric history, and contact options.",
      profileModalCta: "Sign up",
      offerModalTitle: "Send an offer",
      offerModalBody:
        "Sign up or sign in with a brand account to send offers to this creator and manage your campaign workflow.",
      offerModalCta: "Complete offer",
      modalCloseAria: "Close",
      metrics: { score: "Match", engagement: "Engagement", reach: "Reach" },
      influencers: [
        { name: "Burak K.", handle: "@burakcreates", score: "96", engagement: "6.8%", reach: "1.2M" },
        { name: "Zeynep Y.", handle: "@zeynepyonair", score: "93", engagement: "5.9%", reach: "940K" },
        { name: "Selin A.", handle: "@selinflows", score: "91", engagement: "7.2%", reach: "780K" },
        { name: "Defne T.", handle: "@defnetrends", score: "89", engagement: "5.4%", reach: "1.5M" },
      ],
    },
    howItWorks: {
      title: "How it works",
      subtitle: "Your influencer workflow in three clear steps",
      bookPrev: "Previous",
      bookNext: "Next",
      bookStepWord: "Step",
      bookDotsGroupAria: "Step selection",
      registrationMini: {
        title: "Choose registration type",
        subtitle: "Select how you want to create your account.",
        brandLabel: "Brand",
        influencerLabel: "Influencer",
        brandCta: "Brand sign-up",
        influencerCta: "Creator sign-up",
        ariaLabel: "Go to registration type selection",
      },
      aiVisual: {
        brandTag: "Brand",
        influencerTag: "Creator",
        brandName: "Lumin",
        brandNiche: "Beauty",
        influencerHandle: "@zeynepyonair",
        influencerNiche: "Lifestyle",
        scoreLabel: "match",
      },
      steps: [
        {
          id: "signup",
          icon: "signup",
          title: "Sign up",
          body: "Create your brand or creator profile in minutes, add your audience, niche, and preferences, and get ready for discovery and smart matching.",
        },
        {
          id: "ai",
          icon: "ai",
          title: "Match with AI",
          body: "Our AI scores creators against your goals and content fit, then surfaces the strongest matches you can shortlist in one click.",
        },
        {
          id: "manage",
          icon: "manage",
          title: "Manage & earn",
          body: "Run campaigns end to end in one workspace—from brief to approval to delivery and reporting—and grow your earnings with clear performance.",
        },
      ],
    },
    ugcVideos: {
      eyebrow: "Authentic content in one flow",
      title: "UGC videos",
      paragraphs: [
        "On INFUHUB, brands share campaign briefs and creators deliver on-brand user-generated video that feels native in-feed.",
        "Deliveries, revisions, and approvals live in the same workspace—ship trustworthy, performance-ready UGC without tool sprawl.",
      ],
      badges: ["Brief to delivery", "Approval flow", "Brand fit"],
      videoAria: "Sample UGC video",
    },
    faqTitle: "Frequently Asked Questions",
    faq: [
      {
        q: "What is INFUHUB?",
        a: "An AI-powered influencer marketing platform that helps you find authentic creators, run campaigns, and measure ROI.",
      },
      {
        q: "Can I manage multiple campaigns?",
        a: "Yes. You can handle multiple campaigns, teams, and workflows from a single dashboard.",
      },
      {
        q: "Does it include reporting?",
        a: "Yes. Built-in reporting makes performance and stakeholder updates easy.",
      },
    ],
    finalCta: {
      title: "the next-generation influencer marketing platform",
      description: "try it free now",
      primaryBtn: "get started",
      secondaryBtn: "get in touch",
      secondaryTo: "/iletisim",
    },
    footer: {
      about: "Run influencer marketing from one place.",
      cols: [
        {
          title: "INFUHUB",
          links: [
            { label: "How It Works", to: "/#nasil-calisir" },
            { label: "FAQ", to: "/#sss" },
            { label: "Platform Features", to: "/#platform-ozellikleri" },
            { label: "Security & Data Policy", legal: "privacy" },
            { label: "KVKK (personal data notice)", legal: "kvkk" },
            { label: "Distance sales agreement", legal: "distanceSales" },
            { label: "API & Integrations", to: "/iletisim" },
            { label: "Terms of Use", legal: "terms" },
          ],
        },
        {
          title: "SOLUTIONS",
          links: [
            { label: "UGC Videos", to: "/#ugc-videolar" },
            { label: "For Influencers", to: "/influencerlar" },
            { label: "For Brands", to: "/markalar-icin" },
            { label: "For Agencies", to: "/iletisim" },
            { label: "Campaign Management", to: "/markalar-icin" },
          ],
        },
        {
          title: "EDUCATION",
          links: [
            { label: "Blog", comingSoon: true },
            { label: "Guides", comingSoon: true },
            { label: "Influencer Marketing 101", comingSoon: true },
            { label: "Webinars & Training", comingSoon: true },
          ],
        },
        {
          title: "PRICING",
          links: [
            { label: "Plans", to: "/fiyatlandirma" },
            { label: "Contact", to: "/iletisim" },
          ],
        },
        {
          title: "ABOUT",
          links: [
            { label: "Company", to: "/hakkimizda#sirket-hakkinda" },
            { label: "Vision & Mission", to: "/hakkimizda#vizyon-misyon" },
            { label: "Partners", to: "/hakkimizda#partnerler" },
          ],
        },
      ],
      copy: "© 2026 INFUHUB. All rights reserved.",
      email: "hi@infuhub.ai",
      location: "Gaziantep, Türkiye",
      comingSoonLabel: "(coming soon)",
      registerLabel: "Sign up",
      loginLabel: "Log in",
      paymentLogosAria: "Payment partners: Mastercard, Visa",
    },
    featuresCarousel: {
      title: "Run the full workflow in one platform",
      subtitle: "From discovery to reporting—every capability in a single, connected flow.",
      dotsAria: "Feature cards",
      cards: [
        {
          id: "ai",
          icon: "ai",
          title: "AI matching engine",
          body: "Build the best brand–creator matches with AI-driven pairing.",
        },
        {
          id: "discovery",
          icon: "discovery",
          title: "Influencer discovery",
          body: "Filter thousands of influencers to surface the right profiles fast.",
        },
        {
          id: "campaign",
          icon: "campaign",
          title: "Campaign management",
          body: "Manage every partnership from one clear dashboard.",
        },
        {
          id: "analytics",
          icon: "analytics",
          title: "Analytics & reporting",
          body: "Analyze campaign performance with detailed, export-ready data.",
        },
        {
          id: "payment",
          icon: "payment",
          title: "Payments & contracts",
          body: "Handle payouts and agreements securely in one place.",
        },
      ],
    },
    brandsPage: {
      hero: {
        title: "Find the right influencer with INFUHUB",
        titleHighlight: "INFUHUB",
        description: "Automatically discover the most relevant creators for your brand and reach your audience in the most effective way.",
        primaryBtn: "Get Started",
        secondaryBtn: "Watch Demo",
        demo: {
          startBtn: "Start analysis",
          scoreLabel: "Match",
          cards: [
            { name: "Zeynep Y.", score: 92, meta: "Beauty · Lifestyle", initials: "ZY", handle: "@zeynepy" },
            { name: "Burak K.", score: 88, meta: "Tech · Review", initials: "BK", handle: "@burakk" },
            { name: "Elif S.", score: 85, meta: "Fashion · Lifestyle", initials: "ES", handle: "@elifstyle" },
            { name: "Mert A.", score: 79, meta: "Fitness · Health", initials: "MA", handle: "@mertfit" },
          ],
        },
      },
      value: {
        title: "All control in one panel",
        subtitle: "Manage influencer campaigns and social media data from a single dashboard with INFUHUB.",
        panel: {
          chromeTitle: "INFUHUB — Brand",
          navHints: {
            overview: "All metrics at a glance",
            campaigns: "Manage campaigns and statuses",
            match: "AI suggestions and match scores",
            analytics: "Clicks, conversion & ROI",
            settings: "Brand profile & budget",
          },
          mock: {
            greeting: "Welcome",
            brandName: "Lumin",
            brandInitial: "L",
            searchPlaceholder: "Search campaigns or influencers…",
            notificationCount: "3",
            kpis: [
              { label: "Campaigns", value: "12", hint: "3 active" },
              { label: "Clicks", value: "128K", hint: "7 days" },
              { label: "Engagement", value: "6.8%", hint: "Avg." },
              { label: "ROI", value: "4.2x", hint: "30 days" },
            ],
            chartTitle: "Performance overview",
            chartHint: "Last 7 days",
            activityTitle: "Recent activity",
            activities: [
              { text: "New offer: Summer collection", time: "2h" },
              { text: "AI ranked 3 suggestions", time: "1h" },
              { text: "Report ready: Retargeting", time: "5d" },
            ],
            tableTitle: "Active campaigns",
            tableCols: ["Campaign", "Status", "ROI"],
            rows: [
              { campaign: "Product launch", status: "Active", statusKey: "active", roi: "3.8x" },
              { campaign: "Influencer tour", status: "Pending", statusKey: "pending", roi: "—" },
              { campaign: "Summer collection", status: "Active", statusKey: "active", roi: "4.1x" },
            ],
          },
          sidebar: [
            { id: "overview", label: "Overview" },
            { id: "campaigns", label: "Campaigns" },
            { id: "match", label: "Matches" },
            { id: "analytics", label: "Analytics" },
            { id: "settings", label: "Brand" },
          ],
        },
      },
      features: {
        title: "Powerful features",
        subtitle: "A comprehensive toolkit built for your brand.",
        items: [
          { title: "AI Influencer Matching", body: "Our neural network model automatically recommends the most suitable influencers for your brand." },
          { title: "Campaign Management", body: "Create, manage, and track your campaigns from a single dashboard." },
          { title: "Offer & Proposal", body: "Send offers to influencers, evaluate incoming proposals, and manage workflows easily." },
          { title: "Engagement Tracking", body: "Analyze engagement rates and user behavior in real time." },
          { title: "Smart Analytics", body: "See campaign performance clearly with detailed dashboards." },
          { title: "Retargeting & Growth", body: "Increase conversions by retargeting interested users." },
        ],
      },
      aiMatch: {
        title: "AI finds the best matches for your brand",
        description: "Match score, audience overlap, and category fit for the most effective partnerships.",
        tags: ["Match Score", "Audience Overlap", "Category Fit", "Campaign Fit"],
        overlapLabel: "Audience overlap",
        categoryLabel: "Category",
        cards: [
          { influencer: "Burak K.", score: "92", overlap: "78%", category: "Beauty", label: "Match score" },
          { influencer: "Zeynep Y.", score: "88", overlap: "65%", category: "Tech", label: "Match score" },
          { influencer: "Selin A.", score: "86", overlap: "71%", category: "Lifestyle", label: "Match score" },
        ],
      },
      campaign: {
        title: "From offer to launch — all in one place",
        description: "Manage offer creation, approval workflows, and processes from a single panel.",
        statuses: [
          { label: "Pending", count: "3", status: "pending" },
          { label: "Active", count: "5", status: "active" },
          { label: "Completed", count: "12", status: "completed" },
        ],
        offerExpandHint: "Show or hide campaign details",
        offers: [
          {
            name: "Summer Collection",
            status: "Active",
            statusKey: "active",
            detailRows: [
              { label: "Budget", value: "$24,000" },
              { label: "Est. reach", value: "1.2M" },
              { label: "Creators", value: "8 partners" },
              { label: "Period", value: "Jun 12 – Aug 30" },
              { label: "Highlight", value: "Reels + Stories bundle" },
            ],
          },
          {
            name: "Tech Review",
            status: "Pending",
            statusKey: "pending",
            detailRows: [
              { label: "Budget", value: "$9,500" },
              { label: "Audience", value: "Tech · 25–44" },
              { label: "Creators", value: "3 candidates pending" },
              { label: "Deadline", value: "Next 14 days" },
              { label: "Status", value: "Offer review" },
            ],
          },
          {
            name: "Launch Campaign",
            status: "Completed",
            statusKey: "completed",
            detailRows: [
              { label: "Total reach", value: "890K" },
              { label: "Engagement", value: "7.1%" },
              { label: "ROI", value: "3.8x" },
              { label: "Completed", value: "Mar 18, 2026" },
              { label: "Summary", value: "Launch targets met" },
            ],
          },
          {
            name: "Holiday Special",
            status: "Active",
            statusKey: "active",
            detailRows: [
              { label: "Budget", value: "$18,000" },
              { label: "Est. reach", value: "950K" },
              { label: "Creators", value: "5 active" },
              { label: "Period", value: "Dec 1 – Jan 15" },
              { label: "Highlight", value: "Coupon + live stream" },
            ],
          },
        ],
      },
      howItWorks: {
        title: "How it works",
        subtitle: "Start your influencer marketing in 3 steps.",
        registrationMini: {
          title: "Choose registration type",
          subtitle: "Select how you want to create your account.",
          brandLabel: "Brand",
          influencerLabel: "Influencer",
          brandCta: "Brand sign-up",
          influencerCta: "Creator sign-up",
          ariaLabel: "Go to registration type selection",
        },
        aiVisual: {
          brandTag: "Brand",
          influencerTag: "Creator",
          brandName: "Lumin",
          brandNiche: "Beauty",
          influencerHandle: "@zeynepyonair",
          influencerNiche: "Lifestyle",
          scoreLabel: "match",
        },
        steps: [
          {
            id: "profile",
            icon: "signup",
            title: "Create brand profile",
            body: "Capture your audience, industry, tone, and goals so matching stays accurate as you scale campaigns.",
          },
          {
            id: "ai",
            icon: "ai",
            title: "Get AI recommendations",
            body: "AI ranks creator fits for your brief, surfaces the strongest options, and helps you build a shortlist in minutes.",
          },
          {
            id: "launch",
            icon: "dashboard",
            title: "Launch campaign",
            body: "Go live, track deliveries and approvals, and read performance with clicks, engagement, and conversion in one view.",
          },
        ],
      },
      faqTitle: "Frequently asked questions",
      faq: [
        { q: "How does AI matching work?", a: "AI compares your brand's target audience, industry, and content preferences with influencer profile data to calculate the highest match score." },
        { q: "How do I launch a campaign?", a: "After creating your brand profile, you can select influencers from AI suggestions and create a campaign with one click." },
        { q: "Where does the data come from?", a: "Real-time data is collected through social media platform APIs and our proprietary analytics engine." },
      ],
      finalCta: {
        title: "Ready to grow your brand?",
        description: "Reach the right audience with the right influencer.",
        primaryBtn: "Get Started Free",
        secondaryBtn: "Watch Demo",
        trust: "Free to start • No credit card required",
      },
    },
    influencersPage: {
      hero: {
        eyebrow: "For influencers",
        title: "Match with brands, join campaigns, and grow your earnings",
        titleHighlight: "grow your earnings",
        description:
          "Upload your exemption document, discover the right campaigns, match with brands, and manage everything from one panel.",
        primaryBtn: "Apply now",
        secondaryBtn: "See how it works",
        chips: ["Billing support", "AI matching", "Single-panel management"],
        panel: {
          title: "AI Match",
          badge: "+12%",
          cards: [
            { title: "Match score", value: "92", meta: "Beauty · Lifestyle" },
            { title: "Earnings", value: "$1,240", meta: "Last 30 days" },
            { title: "Pending approvals", value: "4 campaigns", meta: "2 new offers" },
            { title: "Document status", value: "Verified", meta: "Billing active" },
          ],
        },
        demo: {
          nnLabel: "AI analysis",
          offerBtn: "Submit offer",
        },
      },
      trust: {
        title: "Trust & ease",
        subtitle: "Reduce operational load with a clear, professional flow.",
        items: [
          { icon: "invoice", title: "Let billing run itself", body: "Hand off operations and focus on creation." },
          { icon: "ai", title: "Right-fit campaigns", body: "AI surfaces collaborations that fit your profile." },
          { icon: "panel", title: "One-panel control", body: "Track applications, approvals, and payouts in one place." },
        ],
      },
      benefits: {
        title: "Why creators choose INFUHUB",
        subtitle: "A professional, secure, and revenue-focused workflow.",
        items: [
          { icon: "aiMatch", title: "AI brand matching", body: "Get matches tailored to your profile and content." },
          { icon: "discovery", title: "Campaign discovery", body: "See relevant opportunities and apply fast." },
          { icon: "invoice", title: "Simplified billing", body: "Once your document is verified, billing is handled for you." },
          { icon: "earnings", title: "Earnings tracking", body: "Monitor payouts and totals with clarity." },
          { icon: "panel", title: "Single dashboard", body: "Manage submissions, deliveries, and payments." },
          { icon: "workflow", title: "Professional workflow", body: "Work with brands in a structured, trusted flow." },
        ],
      },
      billing: {
        title: "Focus on your work, not billing",
        description:
          "Upload your exemption document and let the platform handle the workflow. Spend time creating, not managing paperwork.",
        steps: ["Document upload", "Verification", "Automated billing", "Payout tracking"],
        badge: "Document verified",
        labels: {
          uploadTitle: "Exemption document.pdf",
          uploadStatus: "Document verified",
          billingLabel: "Billing",
          billingStatus: "Active",
          payoutLabel: "Payout status",
          payoutStatus: "Pending",
          progressLabel: "Process 72% complete",
        },
      },
      howItWorks: {
        title: "How it works",
        subtitle: "Launch your creator journey in three steps.",
        registrationMini: {
          title: "Choose registration type",
          subtitle: "Select how you want to create your account.",
          brandLabel: "Brand",
          influencerLabel: "Influencer",
          brandCta: "Brand sign-up",
          influencerCta: "Creator sign-up",
          ariaLabel: "Go to registration type selection",
        },
        aiVisual: {
          brandTag: "Brand",
          influencerTag: "Creator",
          brandName: "Lumin",
          brandNiche: "Beauty",
          influencerHandle: "@zeynepyonair",
          influencerNiche: "Lifestyle",
          scoreLabel: "match",
        },
        steps: [
          {
            id: "profile",
            icon: "signup",
            title: "Create your profile",
            body: "Show your niche, content style, and audience stats so brands can match you to the right briefs faster.",
          },
          {
            id: "doc",
            icon: "ai",
            title: "Upload your document",
            body: "Add your exemption document securely; verification and billing workflows are handled for you end to end.",
          },
          {
            id: "earn",
            icon: "dashboard",
            title: "Join campaigns",
            body: "Discover relevant campaigns, apply, track approvals, and manage deliveries and payouts from one dashboard.",
          },
        ],
      },
      dashboard: {
        title: "Track everything from one panel",
        description: "See your applications, deliverables, and payouts in a single view.",
        stats: [
          { label: "Active campaigns", value: "6" },
          { label: "Pending payout", value: "$1,260" },
          { label: "Total earnings", value: "$3,480" },
        ],
        mock: {
          greeting: "Good morning",
          userName: "Zeynep",
          userHandle: "@zeynepyonair · Creator",
          avatarInitials: "ZY",
          searchPlaceholder: "Search campaigns or brands…",
          notificationCount: "3",
          chartLabel: "Weekly earnings",
          chartHint: "Last 7 days",
          activityTitle: "Recent activity",
          activities: [
            { text: "Maven campaign offer approved", time: "2h ago" },
            { text: "Lumin brief updated", time: "Yesterday" },
            { text: "Payout instruction created", time: "2d ago" },
          ],
          tableTitle: "Active work",
          tableCols: ["Campaign", "Brand", "Status", "Due"],
          sidebar: [
            { id: "home", label: "Overview", active: true },
            { id: "campaigns", label: "Campaigns" },
            { id: "payments", label: "Payouts" },
            { id: "profile", label: "Profile" },
          ],
          rows: [
            { campaign: "Summer collection · UGC", brand: "Lumin", status: "In production", statusVariant: "info", due: "Apr 18" },
            { campaign: "UGC set (3/5)", brand: "Maven", status: "In review", statusVariant: "warning", due: "Apr 22" },
            { campaign: "Product launch", brand: "Crescent", status: "Awaiting payout", statusVariant: "success", due: "—" },
          ],
        },
      },
      faqTitle: "Frequently asked questions",
      faq: [
        { q: "What is the exemption document and how do I upload it?", a: "Use the upload area in your panel to add it in minutes." },
        { q: "How does billing work?", a: "Once verified, billing flows are handled automatically." },
        { q: "Which campaigns can I apply to?", a: "You will see campaigns that match your profile and content." },
        { q: "Where do I track payouts?", a: "All payout statuses are visible in your dashboard." },
        { q: "How do I get matched with brands?", a: "Our AI matching engine recommends the best fits." },
      ],
      finalCta: {
        title: "Ready to start matching with the right campaigns?",
        description:
          "Join the platform that reduces your operational load and helps you grow earnings through better matches.",
        primaryBtn: "Apply now",
        secondaryBtn: "View demo",
        trust: "Start free • No credit card required",
      },
    },
    aboutPage: {
      hero: {
        title: "Measurable, scalable partnerships in ",
        titleHighlight: "influencer marketing",
        description:
          "INFUHUB is an AI-assisted influencer marketing platform where brands, agencies, and creators speak the same language. It unifies the journey from offers to delivery and from budget to reporting in one dashboard—designed with transparent budgets and workflows teams can run every day.",
        highlights: [
          {
            title: "Brands & agencies",
            text: "Campaign setup, creator discovery, offers and revisions, budgets, and content approvals in one flow.",
          },
          {
            title: "Creators",
            text: "Relevant campaigns, clear briefs, transparent fees, and delivery tracking with visible payout stages.",
          },
          {
            title: "Data & trust",
            text: "Measurement with tracking links and summaries; privacy-first process design aligned with compliance needs.",
          },
        ],
      },
      intro: {
        title: "What does INFUHUB actually do?",
        paragraphs: [
          "Traditional influencer programs often stall on long email threads, scattered spreadsheets, and fuzzy KPIs. INFUHUB removes that friction: it helps you find the right creators, run the campaign, compare offers, and track return on spend with clarity.",
          "The platform uses AI-assisted matching to speed up discovery, reduces operational load for brands, and simplifies applications and deliveries for creators—so speed and accountability live in the same place.",
          "Our goal is not “just another tool,” but a dependable, repeatable operating model for influencer marketing at scale.",
        ],
      },
      storySectionTitle: "Mission & vision",
      storySectionLead:
        "We improve day-to-day workflows now while contributing to stronger measurement and ethics in the long run.",
      mission: {
        kicker: "Why we exist",
        title: "Our mission",
        bodyParagraphs: [
          "Accelerate the right brand–creator matches, simplify the end-to-end campaign lifecycle, and give every stakeholder transparent visibility into performance.",
          "Centralize steps from negotiation to content delivery so teams reclaim time and reduce the cost of miscommunication.",
        ],
        visionKicker: "Where we’re headed",
        visionTitle: "Our vision",
        visionParagraphs: [
          "To become a trusted, technology-led backbone for influencer marketing worldwide—helping sustainable collaborations between brands and creators become the norm.",
          "To evolve the product continuously alongside the industry on measurement, disclosure, and data stewardship.",
        ],
      },
      capabilities: {
        title: "Platform capabilities",
        subtitle: "The modules that make INFUHUB the hub for day-to-day operations.",
        items: [
          {
            title: "Campaign & budget management",
            body: "Campaign definition, audiences, content lines, and budget planning—with operational guardrails as offers are accepted.",
          },
          {
            title: "Discovery & offer flow",
            body: "AI-assisted recommendations, invite-only or open campaigns, multi-round offers, and a clear revision history.",
          },
          {
            title: "AI-assisted matching",
            body: "More relevant suggestions from profile, niche, and campaign inputs—less manual searching, faster decisions.",
          },
          {
            title: "Performance & reporting",
            body: "Tracking links and campaign metrics to show impact and support better decisions with at-a-glance summaries.",
          },
        ],
      },
      pillars: {
        title: "What we stand for",
        subtitle: "Principles that guide product decisions and how we work.",
        items: [
          { title: "Transparency", body: "Open communication on data and process—no hidden fees or ambiguity." },
          { title: "Innovation", body: "AI and automation that evolve continuously with the industry." },
          { title: "Shared success", body: "Sustainable, fair partnerships for brands and creators." },
          { title: "Trust", body: "Rigorous standards for privacy, compliance, and contracts." },
        ],
      },
      partnersTitle: "Brands we work with",
      finalCta: {
        title: "Join the INFUHUB community",
        description: "Meet our team and explore the platform in detail.",
        primaryBtn: "Contact us",
        primaryTo: "/iletisim",
        secondaryBtn: "Request a demo",
        secondaryTo: "/iletisim",
        trust: "Replies within one business day",
      },
    },
    contactPage: {
      framer: {
        heroTitle: "Contact",
        heroSubtitle: "Get help from support, sales, or experts.",
        mainLabel: "Contact options",
        featured: {
          title: "Product support",
          description: "Get help from an expert.",
          primaryCta: "Send message",
          status: "All systems operational",
        },
        cards: [
          {
            icon: "user",
            title: "Billing support",
            body: "Fix account or billing issues.",
            btn: "Start chat",
            category: "fatura",
          },
          {
            icon: "alert",
            title: "Emergency support",
            body: "Urgent help when your workflow is blocked.",
            btn: "Emergency",
            category: "acil",
          },
          {
            icon: "chat",
            title: "Talk to sales",
            body: "Work with our team on enterprise solutions.",
            btn: "Talk to sales",
            category: "satis",
          },
          {
            icon: "megaphone",
            title: "Abuse",
            body: "Report abuse, spam, or policy violations.",
            btn: "Send message",
            category: "kotuye_kullanim",
          },
        ],
      },
      contactMail: {
        label: "Contact",
        email: "hi@infuhub.ai",
        href: "mailto:hi@infuhub.ai",
      },
      form: {
        title: "Contact form",
        frameTitle: "Write your message",
        modalCloseLabel: "Close",
        lead: "Leave your phone, email, and message—we’ll get back to you.",
        leadExtended: "Leave your name, subject line, contact details and message—we’ll get back to you.",
        firstName: "First name",
        lastName: "Last name",
        subject: "Subject",
        phone: "Phone",
        email: "Email",
        message: "Message",
        submit: "Send",
        sending: "Sending…",
        success: "Thanks! We received your message and will reply soon.",
        categoryLabels: {
          platform: "Product support",
          fatura: "Billing support",
          acil: "Emergency support",
          satis: "Sales",
          kotuye_kullanim: "Abuse / misuse",
        },
      },
      finalCta: {
        title: "Ready to get started?",
        description: "Sign up on the platform or book a demo.",
        primaryBtn: "Get started",
        secondaryBtn: "Watch demo",
        trust: "Free to start • No credit card required",
      },
    },
    pricingPage: {
      packagesSectionLabel: "Membership plans",
      hero: {
        title: "Transparent plans for a scalable ",
        titleHighlight: "INFUHUB experience",
        description:
          "Start on Starter for free, then scale with Standard, Plus, and Premium for campaigns, analytics, and support that match your stage.",
      },
      packages: [
        {
          id: "starter",
          name: "Starter",
          tagline: "Explore & start",
          priceMain: "₺0",
          priceSub: "forever · no card required",
          cardVariant: "starter",
          badge: "Try free",
          badgeTone: "free",
          featured: false,
          features: [
            "2 campaigns / mo · limited access",
            "Basic AI matching",
            "Email support",
          ],
          cta: "Get started",
          ctaTo: "/kayit-sec",
        },
        {
          id: "standard",
          name: "Standard",
          tagline: "Growing teams",
          priceMain: "₺200",
          priceSub: "/ month",
          cardVariant: "standard",
          badge: null,
          featured: false,
          features: [
            "10 campaigns / mo · broad pool",
            "Advanced AI & management",
            "Email + chat",
          ],
          cta: "Move to Standard",
          ctaTo: "/iletisim",
        },
        {
          id: "plus",
          name: "Plus",
          tagline: "Performance-led",
          priceMain: "₺500",
          priceSub: "/ month",
          cardVariant: "plus",
          badge: "Most popular",
          badgeTone: "popular",
          featured: true,
          features: [
            "25 campaigns / mo · premium filters",
            "Advanced analytics & offers",
            "Priority support",
          ],
          cta: "Get more power",
          ctaTo: "/iletisim",
        },
        {
          id: "premium",
          name: "Premium",
          tagline: "Agency & enterprise",
          priceMain: "₺1,000",
          priceSub: "/ month",
          cardVariant: "premium",
          badge: "Most powerful",
          badgeTone: "strength",
          featured: false,
          features: [
            "Unlimited · full data access",
            "API/SDK & advanced analytics",
            "Dedicated CSM · fast support",
          ],
          cta: "Go Premium",
          ctaTo: "/iletisim",
        },
      ],
      comparison: {
        title: "Compare features",
        subtitle: "See how Starter, Standard, Plus, and Premium differ at a glance.",
        tableAria: "Feature comparison: Starter, Standard, Plus, and Premium",
        colFeature: "Feature",
        columns: [
          { id: "starter", label: "Starter" },
          { id: "standard", label: "Standard" },
          { id: "plus", label: "Plus" },
          { id: "premium", label: "Premium" },
        ],
        rows: [
          {
            feature: "Campaigns / month (create)",
            starter: "2",
            standard: "10",
            plus: "25",
            premium: "Unlimited",
          },
          {
            feature: "Influencer access",
            starter: "Limited",
            standard: "Wide pool",
            plus: "Premium filters",
            premium: "Full database",
          },
          {
            feature: "AI matching / recommendations",
            starter: "Basic",
            standard: "Advanced",
            plus: "Advanced + priority",
            premium: "Auto-optimization",
          },
          {
            feature: "Management & analytics",
            starter: "Summary",
            standard: "Full panel + basic",
            plus: "Advanced dashboard",
            premium: "Custom reports + deep analytics",
          },
          {
            feature: "Offer & contract workflows",
            starter: "—",
            standard: "—",
            plus: "Yes",
            premium: "Yes + integrations",
          },
          {
            feature: "API & SDK / retargeting",
            starter: "—",
            standard: "—",
            plus: "—",
            premium: "In scope",
          },
          {
            feature: "Support",
            starter: "Email",
            standard: "Email + chat",
            plus: "Priority",
            premium: "Dedicated + fast",
          },
        ],
      },
      finalCta: {
        title: "Not sure which plan fits?",
        description: "Tell us about your workflow—we’ll recommend the right tier and next steps.",
        primaryBtn: "Contact us",
        secondaryBtn: "Sign up free",
        trust: "Replies within one business day",
      },
    },

  },
};

/** Menü → React Router yolu (tanıtım sitesi) */
const NAV_PATHS = {
  solutions: "/",
  influencers: "/influencerlar",
  brands: "/markalar-icin",
  pricing: "/fiyatlandirma",
  contact: "/iletisim",
};

function pathToPage(pathname) {
  const p = (pathname || "/").replace(/\/$/, "") || "/";
  if (p === "/influencerlar") return "influencers";
  if (p === "/markalar-icin") return "brands";
  if (p === "/hakkimizda") return "about";
  if (p === "/iletisim") return "contact";
  if (p === "/fiyatlandirma") return "pricing";
  return "home";
}

function IconUserLogin({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none">
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M6.5 19.5v-.5a5.5 5.5 0 0 1 11 0v.5" />
    </svg>
  );
}

function IconArrowStart({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h11m0 0l-4.25-4.25M16 12l-4.25 4.25"
      />
    </svg>
  );
}

function BrandLogo({ variant = "header" }) {
  const horizontalSrc =
    variant === "footer" ? publicAsset("pics/infulogobeyaz.png") : publicAsset("pics/infulogo.png");
  return (
    <>
      <img
        className="logo-horizontal"
        src={horizontalSrc}
        alt="INFUHUB"
        {...(variant === "footer" ? { width: 112, height: 26 } : {})}
      />
      <img className="logo-square" src={publicAsset("pics/infulogoy.png.png")} alt="INFUHUB square" />
    </>
  );
}

function NavMegaIcon({ name }) {
  const c = "nav-mega__icon-svg";
  switch (name) {
    case "layers":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "info":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
        </svg>
      );
    case "trust":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" strokeLinejoin="round" />
          <path d="M9.5 12l2 2 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "flow":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <circle cx="6" cy="7" r="2.5" />
          <circle cx="18" cy="7" r="2.5" />
          <circle cx="12" cy="17" r="2.5" />
          <path d="M8 8.5h8M10.5 9.2L12 15l1.5-5.8" strokeLinecap="round" />
        </svg>
      );
    case "video":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <rect x="3" y="5" width="14" height="14" rx="2" />
          <path d="M17 10l4-2v8l-4-2v-4z" strokeLinejoin="round" />
        </svg>
      );
    case "faq":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M9 10a3 3 0 1 1 4 2.83c0 1.17-.8 1.67-1.33 2.17-.35.32-.67.62-.67 1.5V17" strokeLinecap="round" />
          <path d="M12 19h.01" strokeLinecap="round" />
        </svg>
      );
    case "rocket":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M12 3s4 4 4 9a4 4 0 1 1-8 0c0-5 4-9 4-9z" strokeLinejoin="round" />
          <path d="M10 18v3M14 18v3M9 21h6" strokeLinecap="round" />
        </svg>
      );
    case "spark":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M12 3l1.8 4.6L18 10l-4.2 1.7L12 17l-1.8-5.3L6 10l4.2-2.4L12 3z" strokeLinejoin="round" />
        </svg>
      );
    case "wallet":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M4 7a2 2 0 0 1 2-2h12v16H6a2 2 0 0 1-2-2V7z" strokeLinejoin="round" />
          <path d="M16 11h2M18 7V5a2 2 0 0 0-2-2H6" strokeLinecap="round" />
        </svg>
      );
    case "cpu":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <rect x="7" y="7" width="10" height="10" rx="2" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" strokeLinecap="round" />
        </svg>
      );
    case "target":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case "chart":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M4 20h16" strokeLinecap="round" />
          <path d="M7 16V10M12 16V6M17 16v-5" strokeLinecap="round" />
        </svg>
      );
    case "campaign":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 15h4" strokeLinecap="round" />
        </svg>
      );
    case "mail":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M4 7l8 5 8-5M4 7v10h16V7" strokeLinejoin="round" />
        </svg>
      );
    case "map-pin":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z" strokeLinejoin="round" />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
      );
    case "form":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" strokeLinejoin="round" />
          <path d="M8 9h8M8 13h6" strokeLinecap="round" />
        </svg>
      );
    case "user-plus":
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M4 20v-1a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v1" strokeLinecap="round" />
          <path d="M19 8v6M22 11h-6" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function InfuhubMarketingSite() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState("tr");
  const [aiQuery, setAiQuery] = useState("");
  /** Ana sayfa özellik demosu: arama → kısa yükleme → sonuçlar */
  const [featureScreenPhase, setFeatureScreenPhase] = useState("search");
  const featureLoadTimerRef = useRef(null);
  const pageBgVideoRef = useRef(null);
  const topbarWrapRef = useRef(null);
  const [trustLogos, setTrustLogos] = useState(() => defaultTrustLogoItems(defaultTrustLogoCount()));
  const [legalModal, setLegalModal] = useState(null);
  const [influencerActionModal, setInfluencerActionModal] = useState(null);
  const [megaMenuDismissed, setMegaMenuDismissed] = useState(false);
  const reduceMotion = useReducedMotion();

  const page = pathToPage(location.pathname);
  const isHomePage = page === "home";

  useEffect(() => {
    let cancelled = false;
    const manifestUrl = publicAsset("pics/NEW/manifest.json");
    fetch(manifestUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const names = data
          .filter((x) => typeof x === "string")
          .map((x) => x.replace(/^\/+/, "").replace(/\\/g, "/"));
        const items = trustLogoItemsFromFilenames(names);
        if (items.length > 0) setTrustLogos(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  /** Yenilemede tarayıcı eski scroll’u geri yüklemesin; hash yoksa hero (sayfa başı) */
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const el = pageBgVideoRef.current;
    if (!el) return;
    el.play().catch(() => {});
  }, [reduceMotion, location.pathname]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    return () => {
      if (featureLoadTimerRef.current != null) {
        window.clearTimeout(featureLoadTimerRef.current);
        featureLoadTimerRef.current = null;
      }
    };
  }, []);

  /** Mobil menü + body overflow:hidden sticky’yi bozar; header’ı fixed + spacer ile sabitle */
  useLayoutEffect(() => {
    if (!mobileMenuOpen) {
      document.documentElement.style.removeProperty("--topbar-spacer-h");
      return;
    }
    const el = topbarWrapRef.current;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--topbar-spacer-h", `${Math.ceil(h)}px`);
    return () => {
      document.documentElement.style.removeProperty("--topbar-spacer-h");
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (location.hash) return;
    const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    scrollToTop();
    const t = window.setTimeout(scrollToTop, 0);
    const t2 = window.setTimeout(scrollToTop, 100);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const lockScroll = Boolean(legalModal || influencerActionModal || mobileMenuOpen);
    if (!lockScroll) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const onKey = (e) => {
      if (e.key === "Escape") {
        setLegalModal(null);
        setInfluencerActionModal(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overscrollBehavior = prevOverscroll;
      window.removeEventListener("keydown", onKey);
    };
  }, [legalModal, influencerActionModal, mobileMenuOpen]);

  function closeMegaMenuFromLink() {
    setMegaMenuDismissed(true);
    window.requestAnimationFrame(() => {
      const el = document.activeElement;
      if (el && typeof el.blur === "function") el.blur();
    });
  }

  const t = translations[language];
  const isInfluencerPage = page === "influencers";
  const isBrandsPage = page === "brands";
  const isAboutPage = page === "about";
  const isContactPage = page === "contact";
  const isPricingPage = page === "pricing";
  const influencerContent = t.influencersPage;
  const brandsContent = t.brandsPage;
  const aboutContent = t.aboutPage;
  const contactContent = t.contactPage;
  const pricingContent = t.pricingPage;
  const finalCtaContent = isInfluencerPage
    ? influencerContent.finalCta
    : isBrandsPage
      ? brandsContent.finalCta
      : isAboutPage
        ? aboutContent.finalCta
        : isContactPage
          ? contactContent.finalCta
          : isPricingPage
            ? pricingContent.finalCta
            : t.finalCta;

  const mainPageClass = [
    isInfluencerPage && "influencer-page",
    isBrandsPage && "brands-page",
    isAboutPage && "about-page",
    isContactPage && "contact-page",
    isPricingPage && "pricing-page",
  ]
    .filter(Boolean)
    .join(" ");

  function navLinkIsActive(itemId) {
    const target = NAV_PATHS[itemId] ?? "/";
    if (itemId === "solutions") {
      return location.pathname === "/" || location.pathname === "";
    }
    return location.pathname === target;
  }

  function resetFeatureScreen() {
    if (featureLoadTimerRef.current != null) {
      window.clearTimeout(featureLoadTimerRef.current);
      featureLoadTimerRef.current = null;
    }
    setFeatureScreenPhase("search");
  }

  function startFeatureSearch() {
    if (featureLoadTimerRef.current != null) {
      window.clearTimeout(featureLoadTimerRef.current);
    }
    setFeatureScreenPhase("loading");
    featureLoadTimerRef.current = window.setTimeout(() => {
      featureLoadTimerRef.current = null;
      setFeatureScreenPhase("results");
    }, 1800);
  }

  const featureScreenIsResultsLayout = featureScreenPhase !== "search";
  const featureScreenAriaLabel =
    featureScreenPhase === "search"
      ? t.feature.aiLabel
      : featureScreenPhase === "loading"
        ? t.feature.loadingTitle
        : t.feature.resultsTitle;

  return (
    <div className={isHomePage ? "page page--home" : "page"}>
      {!reduceMotion ? (
        <div className="page-bg-video" aria-hidden>
          <video
            ref={pageBgVideoRef}
            className="page-bg-video__media"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={MARKETING_BG_VIDEO_SRC} type="video/mp4" />
          </video>
          <div className="page-bg-video__scrim" aria-hidden />
        </div>
      ) : (
        <div className="page-bg-video page-bg-video--static" aria-hidden>
          <div className="page-bg-video__scrim page-bg-video__scrim--static" aria-hidden />
        </div>
      )}
      {isHomePage && <div className="page-atmosphere" aria-hidden="true" />}
      <header
        ref={topbarWrapRef}
        className={`topbar-wrap${mobileMenuOpen ? " topbar-wrap--menu-open" : ""}`}
      >
        <div className="topbar">
          <Link
            className="logo"
            to="/"
            aria-label="INFUHUB"
            onClick={() => {
              setMobileMenuOpen(false);
              resetFeatureScreen();
            }}
          >
            <BrandLogo />
          </Link>

          <nav className="desktop-nav" aria-label={language === "tr" ? "Ana menü" : "Main navigation"}>
            {t.menu.map((item) => {
              const mega = t.navMega[item.id];
              const basePath = NAV_PATHS[item.id] ?? "/";
              const active = navLinkIsActive(item.id);
              if (!mega?.length) {
                return (
                  <Link
                    key={item.id}
                    to={basePath}
                    className={active ? "is-active" : ""}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (item.id === "solutions") resetFeatureScreen();
                    }}
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <div
                  key={item.id}
                  className={`nav-mega ${megaMenuDismissed ? "nav-mega--dismissed" : ""}`}
                  onMouseLeave={() => setMegaMenuDismissed(false)}
                >
                  <Link
                    to={basePath}
                    className={`nav-mega__trigger ${active ? "is-active" : ""}`}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (item.id === "solutions") resetFeatureScreen();
                      closeMegaMenuFromLink();
                    }}
                  >
                    {item.label}
                  </Link>
                  <div className="nav-mega__panel" role="region" aria-label={item.label}>
                    <div className="nav-mega__panel-inner">
                      <div className="nav-mega__grid">
                        {mega.map((entry) => (
                          <Link
                            key={`${item.id}-${entry.title}`}
                            to={entry.to}
                            className="nav-mega__row"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              if (item.id === "solutions") resetFeatureScreen();
                              closeMegaMenuFromLink();
                            }}
                          >
                            <span className="nav-mega__icon-wrap" aria-hidden="true">
                              <NavMegaIcon name={entry.icon} />
                            </span>
                            <span className="nav-mega__text">
                              <span className="nav-mega__title">{entry.title}</span>
                              <span className="nav-mega__desc">{entry.description}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="actions">
            <button className="lang-btn" onClick={() => setLanguage((prev) => (prev === "tr" ? "en" : "tr"))}>
              {t.actions.lang}
            </button>
            <Link className="btn btn-light" to="/giris">
              <IconUserLogin className="btn-svg-icon" />
              {t.actions.login}
            </Link>
            <Link className="btn btn-primary" to="/kayit-sec">
              <IconArrowStart className="btn-svg-icon" />
              {t.actions.getStarted}
            </Link>
          </div>

          <button
            type="button"
            className={`hamburger ${mobileMenuOpen ? "is-open" : ""}`}
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={t.actions.toggleMenu}
            aria-expanded={mobileMenuOpen}
          >
            <svg className="hamburger-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none">
              <path
                className="hamburger-svg__line hamburger-svg__line--1"
                d="M5 8h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                className="hamburger-svg__line hamburger-svg__line--2"
                d="M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                className="hamburger-svg__line hamburger-svg__line--3"
                d="M5 16h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={`mobile-menu ${mobileMenuOpen ? "is-open" : ""}`}>
          <nav className="mobile-nav-links mobile-nav-links--flat" aria-label={language === "tr" ? "Mobil menü" : "Mobile menu"}>
            {t.menu.map((item) => (
              <Link
                key={item.id}
                to={NAV_PATHS[item.id] ?? "/"}
                className={navLinkIsActive(item.id) ? "is-active" : ""}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (item.id === "solutions") resetFeatureScreen();
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mobile-actions mobile-actions--drawer">
            <button className="lang-btn" onClick={() => setLanguage((prev) => (prev === "tr" ? "en" : "tr"))}>
              {t.actions.lang}
            </button>
            <Link className="btn btn-light" to="/giris" onClick={() => setMobileMenuOpen(false)}>
              <IconUserLogin className="btn-svg-icon" />
              {t.actions.login}
            </Link>
            <Link className="btn btn-primary" to="/kayit-sec" onClick={() => setMobileMenuOpen(false)}>
              <IconArrowStart className="btn-svg-icon" />
              {t.actions.getStarted}
            </Link>
          </div>
        </div>
      </header>
      {mobileMenuOpen ? (
        <div
          className="topbar-wrap-spacer"
          aria-hidden
          style={{
            height: "var(--topbar-spacer-h, var(--marketing-header-sticky-offset))",
          }}
        />
      ) : null}

      <main className={mainPageClass}>
        {isInfluencerPage ? (
          <InfluencersPage content={influencerContent} />
        ) : isBrandsPage ? (
          <BrandsPage content={brandsContent} />
        ) : isAboutPage ? (
          <AboutPage content={aboutContent} partnerLogos={trustLogos} partnerLogoAlt={t.trustLogoAlt} />
        ) : isPricingPage ? (
          <PricingPage content={pricingContent} />
        ) : isContactPage ? (
          <ContactPage content={contactContent} />
        ) : (
          <>
        <MarketingHeroSection
          tHero={t.hero}
          trustStrip={{
            logos: trustLogos,
            logoAlt: t.trustLogoAlt,
            ariaLabel: language === "tr" ? "Referanslar" : "References",
          }}
          solutionPartners={{
            title: t.solutionPartners.title,
            ariaLabel: t.solutionPartners.ariaLabel,
            logos: t.solutionPartners.logoAlts.map((alt, i) => ({
              src: publicAsset(`pics/cortaklari/${15 + i}.png`),
              alt,
            })),
          }}
        />

        <section className="feature-showcase" id="infuhub-hakkinda">
          <div className="feature-showcase-split">
            <div className="feature-showcase-copy">
              <h2 className="feature-showcase-hero-title">{t.feature.discoverTitle}</h2>
              <p className="feature-showcase-lead">{t.feature.discoverLead}</p>
            </div>
            <div className="feature-showcase-visual">
              <div
                className={`feature-showcase-screen${featureScreenIsResultsLayout ? " feature-showcase-screen--results" : ""}${featureScreenPhase === "loading" ? " feature-showcase-screen--loading-phase" : ""}`}
                role="region"
                aria-label={featureScreenAriaLabel}
                aria-busy={featureScreenPhase === "loading"}
              >
                <div className="feature-showcase-screen__chrome" aria-hidden="true" />
                <div className="feature-showcase-screen__inner">
                  {featureScreenPhase === "search" ? (
                    <>
                      <p className="feature-showcase-ai-label">{t.feature.aiLabel}</p>
                      <div className="ai-search-row">
                        <input
                          type="text"
                          placeholder={t.feature.aiPlaceholder}
                          value={aiQuery}
                          onChange={(e) => setAiQuery(e.target.value)}
                          aria-label={t.feature.aiPlaceholder}
                        />
                        <button className="ai-find-btn" type="button" onClick={startFeatureSearch}>
                          {t.feature.aiButton}
                        </button>
                      </div>
                    </>
                  ) : featureScreenPhase === "loading" ? (
                    <>
                      <div className="feature-showcase-screen__results-head">
                        <p className="influencer-results-title">{t.feature.loadingTitle}</p>
                        <button type="button" className="feature-showcase-screen__back" onClick={resetFeatureScreen}>
                          {t.feature.resultsBack}
                        </button>
                      </div>
                      <div className="feature-showcase-screen__loading" role="status" aria-live="polite">
                        <div className="feature-showcase-screen__loading-spinner" aria-hidden="true" />
                        <p className="feature-showcase-screen__loading-hint">{t.feature.loadingHint}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="feature-showcase-screen__results-head">
                        <p className="influencer-results-title">{t.feature.resultsTitle}</p>
                        <button type="button" className="feature-showcase-screen__back" onClick={resetFeatureScreen}>
                          {t.feature.resultsBack}
                        </button>
                      </div>
                      <div className="influencer-grid influencer-grid--screen">
                        {t.feature.influencers.map((item, idx) => (
                          <article className="influencer-card" key={item.handle}>
                            <div className="influencer-head">
                              <img src={`https://i.pravatar.cc/160?img=${idx + 18}`} alt={`${item.name} avatar`} />
                              <div>
                                <h5>{item.name}</h5>
                                <p>{item.handle}</p>
                              </div>
                              <span className="score-pill">{item.score}</span>
                            </div>
                            <div className="influencer-metrics">
                              <div>
                                <span>{t.feature.metrics.score}</span>
                                <strong>{item.score}/100</strong>
                              </div>
                              <div>
                                <span>{t.feature.metrics.engagement}</span>
                                <strong>{item.engagement}</strong>
                              </div>
                              <div>
                                <span>{t.feature.metrics.reach}</span>
                                <strong>{item.reach}</strong>
                              </div>
                            </div>
                            <div className="influencer-card-actions">
                              <button
                                type="button"
                                className="influencer-btn influencer-btn--ghost"
                                onClick={() =>
                                  setInfluencerActionModal({
                                    type: "profile",
                                    name: item.name,
                                    handle: item.handle,
                                  })
                                }
                              >
                                {t.feature.profileButton}
                              </button>
                              <button
                                type="button"
                                className="influencer-btn influencer-btn--accent"
                                onClick={() =>
                                  setInfluencerActionModal({
                                    type: "offer",
                                    name: item.name,
                                    handle: item.handle,
                                  })
                                }
                              >
                                {t.feature.offerButton}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </section>

        <HowItWorks
          title={t.howItWorks.title}
          subtitle={t.howItWorks.subtitle}
          steps={t.howItWorks.steps}
          registrationMini={t.howItWorks.registrationMini}
          aiVisual={t.howItWorks.aiVisual}
          stepWord={t.howItWorks.bookStepWord}
          stepsNavAria={t.howItWorks.bookDotsGroupAria}
        />

        <UgcVideoSection
          eyebrow={t.ugcVideos.eyebrow}
          title={t.ugcVideos.title}
          paragraphs={t.ugcVideos.paragraphs}
          badges={t.ugcVideos.badges}
          videoAriaLabel={t.ugcVideos.videoAria}
        />

        <FaqSection key={language} title={t.faqTitle} items={t.faq} />
          </>
        )}
      </main>

      <section className="final-cta" aria-labelledby="final-cta-h">
        <div className="final-cta__bg" aria-hidden="true" />
        <div className="final-cta__inner">
          <img
            className="final-cta__logo"
            src="/pics/infulogobeyaz.png"
            alt="INFUHUB"
            width={168}
            height={36}
            decoding="async"
          />
          <h2 id="final-cta-h" className="final-cta__title">
            {finalCtaContent.title}
          </h2>
          <p className="final-cta__desc">{finalCtaContent.description}</p>
          <div className="final-cta__buttons">
            <Link className="final-cta__btn final-cta__btn--glass" to={finalCtaContent.primaryTo ?? "/kayit-sec"}>
              {finalCtaContent.primaryBtn}
            </Link>
            <Link className="final-cta__btn final-cta__btn--glass" to={finalCtaContent.secondaryTo ?? "/giris"}>
              {finalCtaContent.secondaryBtn}
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer footer--on-media">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <Link
              className="logo footer-logo"
              to="/"
              onClick={() => {
                setMobileMenuOpen(false);
                resetFeatureScreen();
              }}
            >
              <BrandLogo variant="footer" />
            </Link>
            <p className="footer-about">{t.footer.about}</p>
            <div className="footer-auth" aria-label={language === "tr" ? "Hesap" : "Account"}>
              <Link to="/kayit-sec" className="footer-link footer-auth__link">
                {t.footer.registerLabel}
              </Link>
              <span className="footer-auth__sep" aria-hidden="true">
                ·
              </span>
              <Link to="/giris" className="footer-link footer-auth__link">
                {t.footer.loginLabel}
              </Link>
            </div>
            <div className="footer-socials" aria-label={language === "tr" ? "Sosyal medya" : "Social links"}>
              <a
                href="https://www.instagram.com/infuhub/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3z"
                  />
                </svg>
              </a>
              <a
                href="https://x.com/infuhubtr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/112520065/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                  />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@infuhubai?lang=tr-TR"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
                  />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@infuhubai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
                  />
                </svg>
              </a>
            </div>
          </div>

          {t.footer.cols.map((col) => (
            <div key={col.title} className="footer-col">
              <h3 className="footer-col-title">{col.title}</h3>
              <ul className="footer-col-list">
                {col.links.map((item, i) => (
                  <li key={`${col.title}-${i}`}>
                    {item.legal ? (
                      <button
                        type="button"
                        className="footer-link-button"
                        onClick={() => setLegalModal(item.legal)}
                      >
                        {item.label}
                      </button>
                    ) : item.comingSoon ? (
                      <span className="footer-link-coming-soon">
                        {item.label}{" "}
                        <span className="footer-soon-badge">{t.footer.comingSoonLabel}</span>
                      </span>
                    ) : (
                      <Link to={item.to} className="footer-link">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-payment" aria-label={t.footer.paymentLogosAria}>
          <ul className="footer-payment__list">
            <li>
              <img
                className="footer-payment__logo footer-payment__logo--mc"
                src={publicAsset("pics/iyzico/mastercard.png")}
                alt="Mastercard"
                width={40}
                height={24}
                loading="lazy"
                decoding="async"
              />
            </li>
            <li>
              <img
                className="footer-payment__logo footer-payment__logo--visa"
                src={publicAsset("pics/iyzico/visa.png")}
                alt="Visa"
                width={40}
                height={24}
                loading="lazy"
                decoding="async"
              />
            </li>
          </ul>
        </div>
        <div className="footer-bottom">
          <p className="copy">{t.footer.copy}</p>
          <div className="footer-meta">
            <a href={`mailto:${t.footer.email}`}>{t.footer.email}</a>
            <span>{t.footer.location}</span>
          </div>
        </div>
      </footer>

      {legalModal && footerLegalBodies[language]?.[legalModal] && (
        <div
          className="legal-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLegalModal(null);
          }}
        >
          <div className="legal-modal">
            <div className="legal-modal-header">
              <h2 id="legal-modal-title">{footerLegalTitles[language][legalModal]}</h2>
              <button
                type="button"
                className="legal-modal-close"
                onClick={() => setLegalModal(null)}
                aria-label={language === "tr" ? "Kapat" : "Close"}
              >
                ×
              </button>
            </div>
            <div className="legal-modal-body">{footerLegalBodies[language][legalModal]}</div>
          </div>
        </div>
      )}

      {influencerActionModal && (
        <div
          className="legal-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="influencer-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInfluencerActionModal(null);
          }}
        >
          <div className="legal-modal influencer-cta-modal">
            <div className="legal-modal-header">
              <h2 id="influencer-modal-title">
                {influencerActionModal.type === "profile"
                  ? t.feature.profileModalTitle
                  : t.feature.offerModalTitle}
              </h2>
              <button
                type="button"
                className="legal-modal-close"
                onClick={() => setInfluencerActionModal(null)}
                aria-label={t.feature.modalCloseAria}
              >
                ×
              </button>
            </div>
            <div className="legal-modal-body influencer-modal-body">
              <p className="influencer-modal__who">
                <strong>{influencerActionModal.name}</strong>{" "}
                <span className="influencer-modal__handle">{influencerActionModal.handle}</span>
              </p>
              <p className="influencer-modal__copy">
                {influencerActionModal.type === "profile"
                  ? t.feature.profileModalBody
                  : t.feature.offerModalBody}
              </p>
              <Link
                className="btn btn-primary influencer-modal__cta"
                to="/kayit-sec"
                onClick={() => setInfluencerActionModal(null)}
              >
                {influencerActionModal.type === "profile"
                  ? t.feature.profileModalCta
                  : t.feature.offerModalCta}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
