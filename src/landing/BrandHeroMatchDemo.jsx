import React, { useEffect, useMemo, useState } from "react";

const CURSOR_IMG = "/pics/infucursor2.png";
const CYCLE_MS = 12000;
/** CSS `brand-hero-demo-results` ile uyum: sonuçlar ~%48’de görünür */
const SHOW_OFFSET_MS = CYCLE_MS * 0.48;
const COUNT_MS = 900;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

export default function BrandHeroMatchDemo({ demo }) {
  const targets = useMemo(() => demo.cards.map((c) => c.score), [demo.cards]);
  const [scores, setScores] = useState(() => targets.map(() => 0));

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setScores([...targets]);
      return undefined;
    }

    setScores(targets.map(() => 0));

    let innerTimeoutId = null;

    const runCountUp = () => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / COUNT_MS);
        const e = easeOutCubic(t);
        setScores(targets.map((target) => Math.round(target * e)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const firstId = window.setTimeout(() => runCountUp(), SHOW_OFFSET_MS);

    const cycleId = window.setInterval(() => {
      setScores(targets.map(() => 0));
      innerTimeoutId = window.setTimeout(() => {
        runCountUp();
        innerTimeoutId = null;
      }, SHOW_OFFSET_MS);
    }, CYCLE_MS);

    return () => {
      window.clearTimeout(firstId);
      window.clearInterval(cycleId);
      if (innerTimeoutId != null) window.clearTimeout(innerTimeoutId);
    };
  }, [targets]);

  return (
    <div className="brand-hero-demo">
      <div className="brand-hero-demo__intro">
        <button type="button" className="brand-hero-demo__start" tabIndex={-1} aria-hidden="true">
          {demo.startBtn}
        </button>
      </div>

      <div className="brand-hero-demo__results" aria-hidden="true">
        <div className="brand-hero-demo__grid">
          {demo.cards.map((card, i) => (
            <article key={card.name} className={`brand-hero-demo__card brand-hero-demo__card--${i}`}>
              <div className="brand-hero-demo__card-top">
                <span className="brand-hero-demo__avatar">{card.initials}</span>
                <div>
                  <p className="brand-hero-demo__name">{card.name}</p>
                  <span className="brand-hero-demo__handle">{card.handle}</span>
                </div>
              </div>
              <div className="brand-hero-demo__score-row">
                <span>{demo.scoreLabel}</span>
                <strong className="brand-hero-demo__score">{scores[i] ?? 0}%</strong>
              </div>
              <span className="brand-hero-demo__meta">{card.meta}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="brand-hero-demo__cursor" aria-hidden="true">
        <div className="brand-hero-demo__cursor-arm">
          <span className="brand-hero-demo__click-ring" />
          <img className="brand-hero-demo__pointer-img" src={CURSOR_IMG} alt="" width={32} height={32} draggable={false} />
        </div>
      </div>
    </div>
  );
}
