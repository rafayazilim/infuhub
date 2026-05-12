import { AnimatePresence, motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import MarketingHeroFeatureVisual from "@/components/landing/MarketingHeroFeatureVisual";

const HERO_TITLE_ICON_SRC = "/pics/infuhub_icon.png";

/** WebP referans logoları — intrinsik boyutlar CLS ve SEO için (manifest dosya adına göre eşlenir). */
export type MarketingHeroTrustLogo = {
  src: string;
  width: number;
  height: number;
};

export type MarketingHeroTrustStrip = {
  logos: MarketingHeroTrustLogo[];
  logoAlt: string;
  ariaLabel: string;
};

export type MarketingHeroSolutionPartners = {
  title: string;
  ariaLabel: string;
  logos: { src: string; alt: string }[];
};

export type HeroLandingCopy = {
  toggleBrand: string;
  toggleCreator: string;
  default: {
    title: string;
    description: string;
    primaryCta: string;
    primaryTo: string;
    panelAriaLabel: string;
  };
  brand: {
    titlePrefix: string;
    titleBrand: string;
    titleSuffix: string;
    description: string;
    primaryCta: string;
    primaryTo: string;
  };
  creator: {
    titleLine1: string;
    titleLine2: string;
    description: string;
    primaryCta: string;
    primaryTo: string;
  };
  visualAltBrand: string;
  visualAltCreator: string;
};

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none">
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

type HeroMode = "default" | "brand" | "creator";

export default function MarketingHeroSection({
  tHero,
  trustStrip,
  solutionPartners,
}: {
  tHero: HeroLandingCopy;
  trustStrip?: MarketingHeroTrustStrip;
  solutionPartners?: MarketingHeroSolutionPartners;
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const typeParam = searchParams.get("type");
  const mode: HeroMode =
    typeParam === "creator" ? "creator" : typeParam === "brand" ? "brand" : "default";

  const setMode = (next: "brand" | "creator") => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("type", next === "creator" ? "creator" : "brand");
        return p;
      },
      { replace: true },
    );
  };

  const copy = mode === "default" ? tHero.default : mode === "brand" ? tHero.brand : tHero.creator;
  const tablistLabel = `${tHero.toggleBrand} / ${tHero.toggleCreator}`;

  return (
    <section className="hero hero--media">
      <div className="hero-intro">
        <div className="hero-intro__center">
          <div className="hero-switch-stack-shell">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                id="hero-panel"
                role="tabpanel"
                aria-label={mode === "default" ? tHero.default.panelAriaLabel : undefined}
                aria-labelledby={
                  mode === "default"
                    ? undefined
                    : mode === "brand"
                      ? "hero-tab-brand"
                      : "hero-tab-creator"
                }
                className="hero-switch-stack"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {mode === "default" ? (
                  <>
                    <div className="hero-title-icon-wrap" aria-hidden="true">
                      <img src={HERO_TITLE_ICON_SRC} alt="" className="hero-title-icon" width={44} height={44} decoding="async" />
                    </div>
                    <h1 className="hero-title-default">
                      <span className="hero-title-default__text">{tHero.default.title}</span>
                    </h1>
                  </>
                ) : mode === "brand" ? (
                  <>
                    <div className="hero-title-icon-wrap" aria-hidden="true">
                      <img src={HERO_TITLE_ICON_SRC} alt="" className="hero-title-icon" width={44} height={44} decoding="async" />
                    </div>
                    <h1>
                      {tHero.brand.titlePrefix}
                      <span className="hero-title-brand">{tHero.brand.titleBrand}</span>
                      {tHero.brand.titleSuffix ? (
                        <span className="hero-title-suffix">{tHero.brand.titleSuffix}</span>
                      ) : null}
                    </h1>
                  </>
                ) : (
                  <>
                    <div className="hero-title-icon-wrap" aria-hidden="true">
                      <img src={HERO_TITLE_ICON_SRC} alt="" className="hero-title-icon" width={44} height={44} decoding="async" />
                    </div>
                    <h1 className="hero-title-creator">
                      <span className="hero-title-creator__line1">{tHero.creator.titleLine1}</span>
                      <span className="hero-title-creator__line2">{tHero.creator.titleLine2}</span>
                    </h1>
                  </>
                )}
                <p className="hero-switch-body">{copy.description}</p>
                <div className="hero-cta-row">
                  <Link to={copy.primaryTo} className="btn btn-primary hero-cta">
                    {copy.primaryCta}
                    <IconChevronRight className="btn-svg-icon hero-cta__icon" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {solutionPartners && solutionPartners.logos.length > 0 ? (
            <section
              className="hero-solution-partners hero-solution-partners--in-intro"
              aria-label={solutionPartners.ariaLabel}
            >
              <div className="hero-solution-partners__inner hero-solution-partners__inner--logos-only">
                <ul className="hero-solution-partners__logos" role="list">
                  {solutionPartners.logos.map((logo) => (
                    <li key={logo.src} className="hero-solution-partners__item">
                      <img
                        className="hero-solution-partners__logo"
                        src={logo.src}
                        alt={logo.alt}
                        loading="lazy"
                        decoding="async"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </div>

        <div className="hero-mode-toggle-wrap">
          <div className="hero-mode-toggle" role="tablist" aria-label={tablistLabel}>
            <button
              type="button"
              role="tab"
              id="hero-tab-brand"
              aria-selected={mode === "brand"}
              aria-controls="hero-panel"
              tabIndex={mode === "default" || mode === "brand" ? 0 : -1}
              className={`hero-mode-toggle__btn${mode === "brand" ? " is-active" : ""}`}
              onClick={() => setMode("brand")}
            >
              {tHero.toggleBrand}
            </button>
            <button
              type="button"
              role="tab"
              id="hero-tab-creator"
              aria-selected={mode === "creator"}
              aria-controls="hero-panel"
              tabIndex={mode === "default" || mode === "creator" ? 0 : -1}
              className={`hero-mode-toggle__btn${mode === "creator" ? " is-active" : ""}`}
              onClick={() => setMode("creator")}
            >
              {tHero.toggleCreator}
            </button>
          </div>
        </div>
      </div>

      {trustStrip && trustStrip.logos.length > 0 ? (
        <section
          className="trust-strip trust-strip--hero"
          id="referanslar"
          aria-label={trustStrip.ariaLabel}
        >
          {(() => {
            const logos = trustStrip.logos;
            const mid = Math.ceil(logos.length / 2);
            const topRowLogos = logos.slice(0, mid);
            const bottomRowLogos = logos.slice(mid);
            const topDup = [...topRowLogos, ...topRowLogos];
            const bottomDup = [...bottomRowLogos, ...bottomRowLogos];
            return (
              <>
                <div className="trust-lane trust-lane-left">
                  <div className="trust-track">
                    {topDup.map((logo, idx) => (
                      <img
                        key={`left-a-${idx}`}
                        src={logo.src}
                        alt={trustStrip.logoAlt}
                        width={logo.width}
                        height={logo.height}
                        decoding="async"
                      />
                    ))}
                  </div>
                  <div className="trust-track" aria-hidden="true">
                    {topDup.map((logo, idx) => (
                      <img
                        key={`left-b-${idx}`}
                        src={logo.src}
                        alt=""
                        width={logo.width}
                        height={logo.height}
                        decoding="async"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>

                <div className="trust-lane trust-lane-right">
                  <div className="trust-track">
                    {bottomDup.map((logo, idx) => (
                      <img
                        key={`right-a-${idx}`}
                        src={logo.src}
                        alt={trustStrip.logoAlt}
                        width={logo.width}
                        height={logo.height}
                        decoding="async"
                      />
                    ))}
                  </div>
                  <div className="trust-track" aria-hidden="true">
                    {bottomDup.map((logo, idx) => (
                      <img
                        key={`right-b-${idx}`}
                        src={logo.src}
                        alt=""
                        width={logo.width}
                        height={logo.height}
                        decoding="async"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </section>
      ) : null}

      <div className="hero-visual">
        <MarketingHeroFeatureVisual
          variant={mode === "creator" ? "creator" : "brand"}
          ariaLabel={mode === "creator" ? tHero.visualAltCreator : tHero.visualAltBrand}
        />
      </div>
    </section>
  );
}
