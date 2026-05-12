import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import HowItWorks from "./HowItWorks";
import FaqSection from "./FaqSection";
import InfluencerHeroDemo from "./InfluencerHeroDemo";
import InfluencerDashboardMockup from "./InfluencerDashboardMockup";

function IconShield({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.5 12l2 2 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUpload({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 16V6m0 0l-3 3m3-3l3 3M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAI({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2.2 2.2M17.2 17.2l2.2 2.2M4.6 19.4l2.2-2.2M17.2 6.8l2.2-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconInvoice({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 8h6M9 11h6M9 14h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconPanelGrid({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** AI / akıllı eşleştirme */
function IconAiMatch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M17 17l1.4 1.4M5.6 18.4L7.1 17M17 7l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M10 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Kampanya keşfi */
function IconDiscovery({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7l1.6 3.6L17 12l-3.4 1.4L12 17l-1.6-3.6L7 12l3.4-1.4L12 7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Gelir / ödeme takibi */
function IconEarnings({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="15.5" cy="13" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Profesyonel süreç / iş akışı */
function IconWorkflow({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="5" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="19" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 12h3M14.5 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 9v1.5M12 14.5V16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const BENEFIT_ICONS = {
  aiMatch: IconAiMatch,
  discovery: IconDiscovery,
  invoice: IconInvoice,
  earnings: IconEarnings,
  panel: IconPanelGrid,
  workflow: IconWorkflow,
};

const TRUST_ICONS = {
  invoice: IconInvoice,
  ai: IconAI,
  panel: IconPanelGrid,
};

const INFL_CARD_VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -72px 0px" };
const INFL_CARD_EASE = [0.25, 0.85, 0.3, 1];

/** 3 sütun: sol / orta / sağ — kaydırınca iki yandan ortaya */
function useInflCardReveal(idx, staggerScale = 1) {
  const reduce = useReducedMotion();
  if (reduce) return {};

  const col = idx % 3;
  const row = Math.floor(idx / 3);
  const delay = row * 0.12 + col * 0.06 * staggerScale;

  const transition = {
    duration: 0.58,
    ease: INFL_CARD_EASE,
    delay,
  };

  if (col === 0) {
    return {
      initial: { opacity: 0, x: -56 },
      whileInView: { opacity: 1, x: 0 },
      viewport: INFL_CARD_VIEWPORT,
      transition,
    };
  }
  if (col === 2) {
    return {
      initial: { opacity: 0, x: 56 },
      whileInView: { opacity: 1, x: 0 },
      viewport: INFL_CARD_VIEWPORT,
      transition,
    };
  }
  return {
    initial: { opacity: 0, y: 26, scale: 0.97 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: INFL_CARD_VIEWPORT,
    transition,
  };
}

function TrustCard({ item, idx }) {
  const Icon = TRUST_ICONS[item.icon] || IconShield;
  const motionProps = useInflCardReveal(idx);

  return (
    <motion.article className="infl-trust-card" {...motionProps}>
      <div className="infl-trust-icon">
        <Icon />
      </div>
      <div>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
      </div>
    </motion.article>
  );
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return coarse;
}

function BenefitCard({ item, idx }) {
  const Icon = BENEFIT_ICONS[item.icon] || IconShield;
  const motionProps = useInflCardReveal(idx, 0.85);
  const titleId = `infl-benefit-title-${idx}`;
  const reduceMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const [touchFlipped, setTouchFlipped] = useState(false);

  useEffect(() => {
    setTouchFlipped(false);
  }, [item.title]);

  const touchMode = coarsePointer && !reduceMotion;
  const flippedClass = touchMode && touchFlipped ? " infl-benefit-card--flipped" : "";

  const toggleTouchFlip = useCallback(() => {
    if (!touchMode) return;
    setTouchFlipped((f) => !f);
  }, [touchMode]);

  return (
    <motion.div className="infl-benefit-card-wrap" {...motionProps}>
      <article
        className={`infl-benefit-card${flippedClass}`}
        {...(touchMode
          ? {
              role: "button",
              tabIndex: 0,
              "aria-pressed": touchFlipped,
              "aria-labelledby": titleId,
              onClick: () => toggleTouchFlip(),
              onKeyDown: (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTouchFlip();
                }
              },
            }
          : {
              tabIndex: 0,
              "aria-labelledby": titleId,
            })}
      >
        <div className="infl-benefit-card__inner">
          <div className="infl-benefit-card__face infl-benefit-card__face--front">
            <div className="infl-benefit-icon" aria-hidden="true">
              <Icon />
            </div>
            <h4 id={titleId}>{item.title}</h4>
          </div>
          <div className="infl-benefit-card__face infl-benefit-card__face--back">
            <p>{item.body}</p>
          </div>
        </div>
      </article>
    </motion.div>
  );
}

/** Faturalandırma demo kartı: görününce bar %8→%100, ardından “Belge doğrulandı” belirir */
function BillingDemoPanel({ billingLabels }) {
  const reduce = useReducedMotion();
  const wrapRef = useRef(null);
  const [pct, setPct] = useState(reduce ? 100 : 0);
  const [verified, setVerified] = useState(Boolean(reduce));

  useEffect(() => {
    if (reduce) return;
    const el = wrapRef.current;
    if (!el) return;

    let cancelled = false;
    let raf = 0;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || cancelled) return;
        obs.disconnect();
        const t0 = performance.now();
        const duration = 3400;
        const start = 0.08;

        function frame(now) {
          if (cancelled) return;
          const u = Math.min(1, (now - t0) / duration);
          const ease = 1 - (1 - u) ** 3;
          const p = start + (1 - start) * ease;
          setPct(p * 100);
          if (u < 1) {
            raf = requestAnimationFrame(frame);
          } else {
            setPct(100);
            window.setTimeout(() => {
              if (!cancelled) setVerified(true);
            }, 420);
          }
        }
        raf = requestAnimationFrame(frame);
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [reduce]);

  const progressText = billingLabels.progressLabel.replace(/\d+(?=%)/, String(Math.round(pct)));

  return (
    <div className="infl-glass-panel infl-billing-panel" ref={wrapRef}>
      <div className="infl-billing-panel__shine" aria-hidden="true" />
      <div className="infl-upload">
        <div className="infl-upload-icon">
          <IconUpload />
        </div>
        <div className="infl-upload-text">
          <p className="infl-upload-title">{billingLabels.uploadTitle}</p>
          <span
            className={verified ? "infl-upload-status infl-upload-status--visible" : "infl-upload-status"}
            aria-hidden={!verified}
          >
            {billingLabels.uploadStatus}
          </span>
        </div>
      </div>
      <div className="infl-status-row">
        <span>{billingLabels.billingLabel}</span>
        <strong>{billingLabels.billingStatus}</strong>
      </div>
      <div className="infl-status-row">
        <span>{billingLabels.payoutLabel}</span>
        <strong>{billingLabels.payoutStatus}</strong>
      </div>
      <div className="infl-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={progressText}>
        <div className="infl-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="infl-progress-label" aria-live="polite">
        {progressText}
      </p>
    </div>
  );
}

export default function InfluencersPage({ content }) {
  const billingLabels = content.billing.labels;

  return (
    <>
      <section className="infl-hero" id="infl-hero">
        <div className="infl-hero-bg" aria-hidden="true" />
        <div className="infl-hero-grid">
          <div className="infl-hero-copy">
            <h1 className="infl-hero-title">
              {content.hero.title.replace(content.hero.titleHighlight, "")}
              <span>{content.hero.titleHighlight}</span>
            </h1>
            <p className="infl-hero-desc">{content.hero.description}</p>
            <div className="infl-hero-actions">
              <Link className="final-cta__btn final-cta__btn--primary" to="/kayit/influencer">
                {content.hero.primaryBtn}
              </Link>
              <span className="final-cta__btn-outline">
                <Link className="final-cta__btn final-cta__btn--secondary" to="/">
                  {content.hero.secondaryBtn}
                </Link>
              </span>
            </div>
          </div>

          <div className="infl-hero-visual">
            <div className="infl-glass-panel infl-glass-panel--demo" aria-hidden="true">
              <InfluencerHeroDemo demo={content.hero.demo} />
            </div>
            <div className="infl-floating-glow" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="infl-trust" id="infl-trust">
        <div className="section-header">
          <h2>{content.trust.title}</h2>
          <p>{content.trust.subtitle}</p>
        </div>
        <div className="infl-trust-grid">
          {content.trust.items.map((item, idx) => (
            <TrustCard key={item.title} item={item} idx={idx} />
          ))}
        </div>
      </section>

      <section className="infl-benefits" id="infl-benefits">
        <div className="section-header">
          <h2>{content.benefits.title}</h2>
          <p>{content.benefits.subtitle}</p>
        </div>
        <div className="infl-benefit-grid">
          {content.benefits.items.map((item, idx) => (
            <BenefitCard key={item.title} item={item} idx={idx} />
          ))}
        </div>
      </section>

      <section className="infl-billing" id="infl-billing">
        <div className="infl-split">
          <div className="infl-split-copy">
            <h2>{content.billing.title}</h2>
            <p>{content.billing.description}</p>
            <ul className="infl-step-list">
              {content.billing.steps.map((step) => (
                <li key={step}>
                  <span className="infl-step-dot" />
                  {step}
                </li>
              ))}
            </ul>
          </div>
          <div className="infl-split-visual">
            <BillingDemoPanel billingLabels={billingLabels} />
          </div>
        </div>
      </section>

      <HowItWorks
        title={content.howItWorks.title}
        subtitle={content.howItWorks.subtitle}
        steps={content.howItWorks.steps}
        registrationMini={content.howItWorks.registrationMini}
        aiVisual={content.howItWorks.aiVisual}
      />

      <section className="infl-dashboard" id="infl-dashboard">
        <div className="infl-dashboard__shell">
          <header className="infl-dashboard__header">
            <h2 className="infl-dashboard__title">{content.dashboard.title}</h2>
            <p className="infl-dashboard__desc">{content.dashboard.description}</p>
          </header>
          <div className="infl-dashboard__visual-row">
            <div className="infl-dashboard__visual">
              <InfluencerDashboardMockup dashboard={content.dashboard} />
            </div>
          </div>
        </div>
      </section>

      <FaqSection key={content.faqTitle} title={content.faqTitle} items={content.faq} />
    </>
  );
}
