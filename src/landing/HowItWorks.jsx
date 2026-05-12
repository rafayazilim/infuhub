import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";

function IconBuilding({ className = "hiw-reg-preview__ico" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 21V8l8-4 8 4v13M9 21v-4h6v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUser({ className = "hiw-reg-preview__ico" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HiwVisualRegistrationPreview({ registrationMini }) {
  return (
    <Link to="/kayit-sec" className="hiw-reg-preview" aria-label={registrationMini.ariaLabel}>
      <p className="hiw-reg-preview__title">{registrationMini.title}</p>
      <p className="hiw-reg-preview__sub">{registrationMini.subtitle}</p>
      <div className="hiw-reg-preview__grid">
        <div className="hiw-reg-preview__option">
          <IconBuilding />
          <span className="hiw-reg-preview__opt-title">{registrationMini.brandLabel}</span>
          <span className="hiw-reg-preview__opt-cta">{registrationMini.brandCta}</span>
        </div>
        <div className="hiw-reg-preview__option">
          <IconUser />
          <span className="hiw-reg-preview__opt-title">{registrationMini.influencerLabel}</span>
          <span className="hiw-reg-preview__opt-cta">{registrationMini.influencerCta}</span>
        </div>
      </div>
    </Link>
  );
}

const DEFAULT_AI_VISUAL = {
  brandTag: "Marka",
  influencerTag: "Influencer",
  brandName: "Lumin",
  brandNiche: "Beauty",
  influencerHandle: "@zeynepyonair",
  influencerNiche: "Lifestyle",
  scoreLabel: "eşleşme",
};

function HiwVisualAi({ labels }) {
  const l = { ...DEFAULT_AI_VISUAL, ...labels };
  return (
    <div className="hiw-visual hiw-visual--ai-split" aria-hidden="true">
      <div className="hiw-visual__ai-side hiw-visual__ai-side--brand">
        <div className="hiw-visual__ai-avatar hiw-visual__ai-avatar--brand">
          <IconBuilding className="hiw-visual__ai-avatar-svg" />
        </div>
        <span className="hiw-visual__ai-pill">{l.brandTag}</span>
        <strong className="hiw-visual__ai-name">{l.brandName}</strong>
        <span className="hiw-visual__ai-meta">{l.brandNiche}</span>
      </div>

      <div className="hiw-visual__ai-bridge">
        <div className="hiw-visual__ai-connector">
          <span className="hiw-visual__ai-line hiw-visual__ai-line--a" />
          <div className="hiw-visual__ai-score-badge">
            <span className="hiw-visual__ai-score-num">98</span>
            <span className="hiw-visual__ai-score-den">/100</span>
          </div>
          <span className="hiw-visual__ai-line hiw-visual__ai-line--b" />
        </div>
        <span className="hiw-visual__ai-score-caption">{l.scoreLabel}</span>
      </div>

      <div className="hiw-visual__ai-side hiw-visual__ai-side--infl">
        <div className="hiw-visual__ai-avatar hiw-visual__ai-avatar--infl">
          <IconUser className="hiw-visual__ai-avatar-svg" />
        </div>
        <span className="hiw-visual__ai-pill">{l.influencerTag}</span>
        <strong className="hiw-visual__ai-name hiw-visual__ai-name--handle">{l.influencerHandle}</strong>
        <span className="hiw-visual__ai-meta">{l.influencerNiche}</span>
      </div>
    </div>
  );
}

const HIW_CURSOR_IMG = "/pics/infucursor2.png";

function HiwVisualManageGrow() {
  const gid = useId().replace(/:/g, "");
  const lineId = `hiw-mg-line-${gid}`;
  return (
    <div className="hiw-visual hiw-visual--managegrow" aria-hidden="true">
      <div className="hiw-visual__mg-kanban">
        <div className="hiw-visual__col">
          <span className="hiw-visual__chip" />
          <span className="hiw-visual__chip hiw-visual__chip--short" />
        </div>
        <div className="hiw-visual__col">
          <span className="hiw-visual__chip" />
          <span className="hiw-visual__chip" />
        </div>
      </div>
      <div className="hiw-visual__mg-chart">
        <svg viewBox="0 0 100 40" fill="none" className="hiw-visual__chart-svg">
          <defs>
            <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#08afd5" />
              <stop offset="100%" stopColor="#e3447c" />
            </linearGradient>
          </defs>
          <path
            d="M4 32 L24 22 L44 26 L64 10 L84 16 L96 8"
            stroke={`url(#${lineId})`}
            strokeWidth="1.75"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div className="hiw-visual__kpi">
          <span>ROI</span>
          <strong className="hiw-visual__mg-kpi-target">+42%</strong>
        </div>
      </div>
      <div className="hiw-visual__mg-cursor" aria-hidden="true">
        <div className="hiw-visual__mg-cursor-arm">
          <span className="hiw-visual__mg-click-ring" />
          <img className="hiw-visual__mg-pointer-img" src={HIW_CURSOR_IMG} alt="" width={32} height={32} draggable={false} />
        </div>
      </div>
    </div>
  );
}

const VISUALS = {
  manage: HiwVisualManageGrow,
  grow: HiwVisualManageGrow,
  dashboard: HiwVisualManageGrow,
};

function showRegistrationPreview(step, registrationMini) {
  if (!registrationMini) return false;
  return step.id === "signup" || step.id === "profile";
}

function StepPanel({ step, registrationMini, aiVisual, index, stepWord, headingId }) {
  const useReg = showRegistrationPreview(step, registrationMini);
  let VisualComponent = VISUALS[step.icon] || (() => <HiwVisualAi labels={aiVisual} />);
  if (useReg && registrationMini) {
    VisualComponent = () => <HiwVisualRegistrationPreview registrationMini={registrationMini} />;
  } else if (step.icon === "ai") {
    VisualComponent = () => <HiwVisualAi labels={aiVisual} />;
  }

  const num = String(index + 1).padStart(2, "0");

  return (
    <>
      <header className="hiw-step__head">
        <span className="hiw-step__index" aria-label={`${stepWord} ${index + 1}`}>
          {num}
        </span>
        <h3 id={headingId} className="hiw-step__title">
          {step.title}
        </h3>
      </header>
      <p className="hiw-step__body">{step.body}</p>
      <div className={`hiw-step__plate${useReg ? " hiw-step__plate--reg" : ""}`}>
        <VisualComponent />
      </div>
    </>
  );
}

/** Nasıl çalışır — iki sütun, kaydırmayla solda adım vurgusu. */
export default function HowItWorks({
  title,
  subtitle,
  steps,
  registrationMini,
  aiVisual,
  stepWord = "Adım",
  stepsNavAria = "Adımlar",
}) {
  const uid = useId().replace(/:/g, "");
  const list = steps ?? [];
  const [activeStep, setActiveStep] = useState(0);
  const reducedMotion = useReducedMotion();
  const panelRefs = useRef([]);

  const scrollToStep = useCallback(
    (idx) => {
      const el = panelRefs.current[idx];
      if (!el) return;
      el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    },
    [reducedMotion],
  );

  useEffect(() => {
    const nodes = panelRefs.current.filter(Boolean);
    if (nodes.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            idx: Number(e.target.getAttribute("data-step-index")),
            ratio: e.intersectionRatio,
          }))
          .filter((x) => !Number.isNaN(x.idx));

        if (intersecting.length === 0) return;

        intersecting.sort((a, b) => b.ratio - a.ratio);
        setActiveStep(intersecting[0].idx);
      },
      {
        root: null,
        rootMargin: "-18% 0px -42% 0px",
        threshold: [0, 0.08, 0.15, 0.25, 0.35, 0.5, 0.65, 0.8, 1],
      },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [list.length]);

  if (list.length < 1) return null;

  const liveAnnounce = `${stepWord} ${activeStep + 1}: ${list[activeStep]?.title ?? ""}`;

  return (
    <section id="nasil-calisir" className="hiw-section hiw-section--split" aria-labelledby={`hiw-h-${uid}`}>
      <div className="hiw-inner hiw-inner--split">
        <div className="hiw-split">
          <aside className="hiw-split__aside">
            <div className="hiw-split__intro">
              <h2 id={`hiw-h-${uid}`} className="hiw-split__heading">
                {title}
              </h2>
              {subtitle ? <p className="hiw-split__lead">{subtitle}</p> : null}
            </div>

            <nav className="hiw-split__nav" aria-label={stepsNavAria}>
              <ol className="hiw-split__nav-list">
                {list.map((s, i) => (
                  <li key={s.id ?? i} className="hiw-split__nav-item">
                    <button
                      type="button"
                      className={`hiw-split__nav-btn${i === activeStep ? " hiw-split__nav-btn--active" : ""}`}
                      aria-current={i === activeStep ? "step" : undefined}
                      onClick={() => scrollToStep(i)}
                    >
                      <span className="hiw-split__nav-num" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="hiw-split__nav-label">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="hiw-split__panels">
            <p className="hiw-split__sr-live" aria-live="polite" aria-atomic="true">
              {liveAnnounce}
            </p>
            {list.map((step, i) => (
              <article
                key={step.id ?? i}
                ref={(el) => {
                  panelRefs.current[i] = el;
                }}
                id={`hiw-panel-${uid}-${i}`}
                data-step-index={i}
                className="hiw-step"
                aria-labelledby={`hiw-step-h-${uid}-${i}`}
              >
                <div className="hiw-step__inner">
                  <StepPanel
                    step={step}
                    registrationMini={registrationMini}
                    aiVisual={aiVisual}
                    index={i}
                    stepWord={stepWord}
                    headingId={`hiw-step-h-${uid}-${i}`}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
