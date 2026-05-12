import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Scroll ile aktif özellik; sağda cam çerçeve + altta hizalı ekran görselleri (bir → iki → üç → dört).
 */

/** FEATURES ile aynı sıra; null = henüz eklenmedi */
const FEATURE_SCREEN_IMAGES = [
  "/pics/screens/bir.png",
  "/pics/screens/iki.png",
  "/pics/screens/üç.png",
  "/pics/screens/dört.png",
];

/** Aktif satır: düz accordion vurgusu (ince çizgiler + hafif dolgu), cam kutu yok */
const ACTIVE_ROW_CLASS = "bg-white/[0.07] backdrop-blur-[1px]";

const FEATURES = [
  {
    id: "discovery",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8a3 3 0 0 0-3 3" />
      </svg>
    ),
    title: "Influencer Keşfi",
    description:
      "Yapay zeka destekli arama motorumuzla markanız için en uygun influencer'ları saniyeler içinde bulun. Kategori, lokasyon, takipçi sayısı ve etkileşim oranına göre gelişmiş filtrelerle binlerce profil arasından ideal eşleşmeleri keşfedin.",
    activeCardClass: ACTIVE_ROW_CLASS,
  },
  {
    id: "campaign",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        <rect width="20" height="14" x="2" y="6" rx="2" />
      </svg>
    ),
    title: "Kampanya Yönetimi",
    description:
      "Kampanyalarınızı baştan sona tek bir panelden yönetin. Taslak, aktif, inceleme ve tamamlanmış aşamalarını takip edin. Bütçe planlaması, içerik takvimi ve teslimat takibi ile tüm süreçlerinizi kolaylaştırın.",
    activeCardClass: ACTIVE_ROW_CLASS,
  },
  {
    id: "analytics",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    title: "Detaylı Analitik",
    description:
      "Kampanyalarınızın performansını gerçek zamanlı olarak izleyin. Erişim, etkileşim, dönüşüm oranı ve ROI gibi kritik metrikleri görsel grafikler ve raporlarla analiz edin. Veriye dayalı kararlar alın.",
    activeCardClass: ACTIVE_ROW_CLASS,
  },
  {
    id: "payment",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Güvenli Ödeme",
    description:
      "Güvenli escrow sistemiyle ödemelerinizi koruma altına alın. Kilometre taşlarına dayalı ödeme planları oluşturun, teslimat onaylandıktan sonra otomatik ödeme serbest bırakma ile hem markalar hem de influencer'lar için güvence sağlayın.",
    activeCardClass: ACTIVE_ROW_CLASS,
  },
];

const SCROLL_SEGMENT_VH = 72;

function cardInactiveClass() {
  return "border-0 bg-transparent shadow-none hover:bg-transparent dark:border-0 dark:bg-transparent dark:hover:bg-transparent";
}

function iconInactiveClass() {
  return "border-0 bg-transparent text-white dark:bg-transparent dark:text-white";
}

function iconActiveClass() {
  return "bg-white/15 text-white ring-0 backdrop-blur-sm dark:bg-white/15 dark:text-white";
}

function HeroFeatureGlassPanel({ activeIndex }) {
  const reduceMotion = useReducedMotion();
  const src = FEATURE_SCREEN_IMAGES[activeIndex] ?? null;
  const feature = FEATURES[activeIndex];

  return (
    <div className="hero-feature-scroll-visual relative mx-auto aspect-square w-full max-w-[min(100%,440px)] overflow-hidden md:ml-auto md:max-w-[min(100%,520px)]">
      <div className="hero-feature-scroll-visual__frame" aria-hidden="true" />
      <div className="hero-feature-scroll-visual__screen">
        <AnimatePresence mode="wait" initial={false}>
          {src ? (
            <motion.img
              key={activeIndex}
              src={src}
              alt={feature ? `${feature.title} ekran görüntüsü` : ""}
              draggable={false}
              loading="lazy"
              decoding="async"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function MarketingHeroFeatureVisual({ className = "", ariaLabel = "Platform özellikleri", variant = "brand" }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [variant]);

  const updateActiveFromScroll = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    const sectionTop = scrollY + rect.top;
    const sectionHeight = el.offsetHeight;
    const viewportHeight = window.innerHeight;
    const relativeScroll = scrollY - sectionTop + viewportHeight * 0.4;
    const segmentHeight = sectionHeight / FEATURES.length;
    let newIndex = Math.floor(relativeScroll / segmentHeight);
    newIndex = Math.max(0, Math.min(FEATURES.length - 1, newIndex));
    setActiveIndex(newIndex);
  }, []);

  useEffect(() => {
    updateActiveFromScroll();
    window.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    window.addEventListener("resize", updateActiveFromScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateActiveFromScroll);
      window.removeEventListener("resize", updateActiveFromScroll);
    };
  }, [updateActiveFromScroll]);

  const scrollToFeature = (index) => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    const sectionTop = scrollY + rect.top;
    const sectionHeight = el.offsetHeight;
    const segmentHeight = sectionHeight / FEATURES.length;
    const targetScroll = sectionTop + segmentHeight * index;
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  return (
    <div
      id="hero-ozellikler"
      ref={sectionRef}
      className={`marketing-hero-feature-visual relative w-full overflow-x-visible text-left ${className}`}
      role="region"
      aria-label={ariaLabel}
      style={{ minHeight: `${FEATURES.length * SCROLL_SEGMENT_VH}vh` }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute -left-24 top-1/3 h-[min(280px,45vw)] w-[min(280px,45vw)] rounded-full bg-slate-400/10 blur-[90px] dark:bg-slate-500/10" />
      </div>

      <div className="sticky top-0 z-[1] flex min-h-screen w-full flex-col justify-center overflow-x-visible py-8 sm:py-10 md:py-12">
        <div className="relative w-full max-w-none px-0">
          <div className="flex flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:gap-6 lg:gap-8 xl:gap-10">
            <div className="flex w-full min-w-0 flex-col md:w-1/2">
              {FEATURES.map((feature, index) => {
                const isActive = index === activeIndex;
                return (
                  <motion.div
                    key={feature.id}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isActive}
                    aria-controls={`hero-feature-panel-${feature.id}`}
                    className={`relative outline-none transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                      isActive
                        ? `border-t border-b border-white ${feature.activeCardClass}`
                        : `rounded-none ${cardInactiveClass()}`
                    }`}
                    onClick={() => scrollToFeature(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        scrollToFeature(index);
                      }
                    }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <div className="px-3 py-3.5 sm:px-4 sm:py-4" id={`hero-feature-panel-${feature.id}`}>
                      <div className="flex items-start gap-3 sm:gap-3.5">
                        <div
                          className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border-0 transition-all duration-500 sm:h-10 sm:w-10 ${
                            isActive ? iconActiveClass() : iconInactiveClass()
                          }`}
                        >
                          {feature.icon}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-center gap-2">
                            <h3 className="flex-1 text-left text-[14px] font-semibold leading-snug text-white sm:text-[15px] lg:text-base">
                              {feature.title}
                            </h3>
                            <motion.div className="flex-shrink-0" animate={{ rotate: isActive ? 180 : 0 }} transition={{ duration: 0.25 }}>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-5 w-5 ${isActive ? "text-white" : "text-white/85"}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </motion.div>
                          </div>

                          <AnimatePresence mode="wait">
                            {isActive && (
                              <motion.div
                                key={`content-${feature.id}`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  height: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                                  opacity: { duration: 0.28, delay: 0.06 },
                                }}
                                className="overflow-hidden"
                              >
                                <p className="mt-3 max-w-none text-left text-[12px] leading-relaxed text-white/88 sm:text-[13px]">
                                  {feature.description}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex w-full min-h-0 min-w-0 flex-col items-stretch justify-center overflow-visible pt-1 md:w-1/2 md:items-stretch md:justify-center">
              <div className="hero-feature-photo-column w-full md:flex md:min-h-[min(520px,70svh)] md:items-center md:justify-end">
                <HeroFeatureGlassPanel activeIndex={activeIndex} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketingHeroFeatureVisual;
