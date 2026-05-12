import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

const ICONS = {
  ai: (gid) => (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 6l2.2 6.8H33l-5.5 4 2.1 6.5L24 19.3l-5.6 4 2.1-6.5-5.5-4h6.8L24 6zM12 26l1.5 4.5h4.5l-3.6 2.6 1.4 4.3L12 34.6l-3.8 2.8 1.4-4.3-3.6-2.6h4.5L12 26zm24 2l1.2 3.6h3.6l-2.9 2.1 1.1 3.4L36 35l-2.9 2.1 1.1-3.4-2.9-2.1h3.6L36 28z"
        stroke={`url(#${gid})`}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="38" r="3" stroke={`url(#${gid})`} strokeWidth="1.4" />
    </svg>
  ),
  discovery: (gid) => (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="9" stroke={`url(#${gid})`} strokeWidth="1.75" />
      <path d="M27 27l10 10" stroke={`url(#${gid})`} strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="20" cy="17" r="2.5" fill={`url(#${gid})`} />
    </svg>
  ),
  campaign: (gid) => (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M14 14h20v24H14V14z"
        stroke={`url(#${gid})`}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 20h20M20 14v24" stroke={`url(#${gid})`} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M28 28l6 4" stroke={`url(#${gid})`} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  analytics: (gid) => (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M12 34V22M22 34V14M32 34v-12" stroke={`url(#${gid})`} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 36h30" stroke={`url(#${gid})`} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),
  payment: (gid) => (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="10" y="16" width="28" height="18" rx="3" stroke={`url(#${gid})`} strokeWidth="1.75" />
      <path d="M10 24h28" stroke={`url(#${gid})`} strokeWidth="1.5" opacity="0.6" />
      <rect x="28" y="28" width="8" height="4" rx="1" stroke={`url(#${gid})`} strokeWidth="1.2" />
    </svg>
  ),
};

const AUTO_SCROLL_PX_PER_SEC = 52;

export default function FeaturesCarousel({ title, subtitle, cards, dotsListLabel = "Features" }) {
  const uid = useId().replace(/:/g, "");
  const scrollRef = useRef(null);
  const itemRefs = useRef([]);
  const loopWidthRef = useRef(0);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, pointerId: null });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const n = cards.length;

  const updateFromScroll = useCallback(() => {
    const track = scrollRef.current;
    if (!track || n === 0) return;

    const w = loopWidthRef.current;
    if (w > 0) {
      while (track.scrollLeft >= w) {
        track.scrollLeft -= w;
      }
    }

    const trackRect = track.getBoundingClientRect();
    const center = trackRect.left + trackRect.width / 2;
    let best = 0;
    let bestDist = Infinity;
    itemRefs.current.forEach((card, domIdx) => {
      if (!card) return;
      const r = card.getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(c - center);
      if (d < bestDist) {
        bestDist = d;
        best = domIdx % n;
      }
    });
    setActiveIndex(best);

    itemRefs.current.forEach((card) => {
      if (!card) return;
      const r = card.getBoundingClientRect();
      const c = r.left + r.width / 2;
      const parallax = Math.max(-1, Math.min(1, (c - center) / (trackRect.width * 0.65)));
      card.style.setProperty("--fc-parallax", `${parallax * -6}px`);
    });
  }, [n]);

  const scrollToIndex = useCallback(
    (index, behavior = "smooth") => {
      const track = scrollRef.current;
      const card = itemRefs.current[index];
      if (!track || !card) return;
      const trackRect = track.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const delta = cardRect.left + cardRect.width / 2 - (trackRect.left + trackRect.width / 2);
      track.scrollBy({ left: delta, behavior });
    },
    []
  );

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      const track = scrollRef.current;
      if (!track) return;
      if (n >= 2) {
        track.scrollLeft = 0;
      } else {
        scrollToIndex(0, "auto");
      }
    });
  }, [scrollToIndex, n]);

  useEffect(() => {
    const track = scrollRef.current;
    if (!track || n === 0) return;

    const measureLoop = () => {
      loopWidthRef.current =
        n >= 2 && track.scrollWidth > 0 ? track.scrollWidth / 2 : 0;
    };

    measureLoop();
    updateFromScroll();

    const onScroll = () => updateFromScroll();
    track.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      measureLoop();
      updateFromScroll();
    });
    ro.observe(track);
    return () => {
      track.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [updateFromScroll, n]);

  useEffect(() => {
    const track = scrollRef.current;
    if (!track || n < 2) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.064);
      last = now;
      const w = loopWidthRef.current;
      if (!document.hidden && !dragRef.current.active && w > 1) {
        track.scrollLeft += AUTO_SCROLL_PX_PER_SEC * dt;
        if (track.scrollLeft >= w) {
          track.scrollLeft -= w;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const track = scrollRef.current;
    if (!track) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: track.scrollLeft,
      pointerId: e.pointerId,
    };
    setIsDragging(true);
    try {
      track.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const track = scrollRef.current;
    if (!track) return;
    const dx = e.clientX - dragRef.current.startX;
    track.scrollLeft = dragRef.current.startScroll - dx;
  }, []);

  const endDrag = useCallback(
    (e) => {
      if (!dragRef.current.active) return;
      const track = scrollRef.current;
      if (track && e?.pointerId != null) {
        try {
          track.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      dragRef.current.active = false;
      setIsDragging(false);
      requestAnimationFrame(() => {
        updateFromScroll();
      });
    },
    [updateFromScroll]
  );

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToIndex(Math.min(n - 1, activeIndex + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToIndex(Math.max(0, activeIndex - 1));
      }
    },
    [activeIndex, n, scrollToIndex]
  );

  const renderCard = (item, logicalI, domIdx, keySuffix, duplicate = false) => {
    const Icon = ICONS[item.icon] || ICONS.ai;
    return (
      <article
        key={keySuffix === "" ? item.id : `${item.id}${keySuffix}`}
        ref={(el) => {
          itemRefs.current[domIdx] = el;
        }}
        className={`feature-glass-card${logicalI === activeIndex ? " is-active" : ""}${logicalI === 0 ? " is-first" : ""}`}
        style={{ "--fc-index": logicalI }}
        aria-hidden={duplicate ? true : undefined}
      >
        <div className="feature-glass-card__glow" aria-hidden="true" />
        <div className="feature-glass-card__icon-wrap">
          <div className="feature-glass-card__icon">{Icon(`fc-grad-${uid}`)}</div>
        </div>
        <h3 className="feature-glass-card__title">{item.title}</h3>
        <p className="feature-glass-card__body">{item.body}</p>
      </article>
    );
  };

  return (
    <section id="platform-ozellikleri" className="features-carousel-section" aria-labelledby={`fc-title-${uid}`}>
      <svg className="features-carousel-gradients" aria-hidden="true" focusable="false" width="0" height="0">
        <defs>
          <linearGradient id={`fc-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#08afd5" />
            <stop offset="100%" stopColor="#e3447c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="features-carousel-bg" aria-hidden="true" />
      <div className="features-carousel-wrap">
        <header className="features-carousel-header">
          <h2 id={`fc-title-${uid}`} className="features-carousel-title">
            {title}
          </h2>
          <p className="features-carousel-subtitle">{subtitle}</p>
        </header>

        <div className="features-carousel-viewport">
          <div
            ref={scrollRef}
            className={`features-carousel-track${isDragging ? " is-dragging" : ""}`}
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label={title}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={(e) => {
              if (dragRef.current.active && e.pointerId === dragRef.current.pointerId) endDrag(e);
            }}
            onKeyDown={onKeyDown}
          >
            {n > 0 &&
              cards.map((item, i) => renderCard(item, i, i, ""))}
            {n > 1 &&
              cards.map((item, i) => renderCard(item, i, n + i, "-loop", true))}
          </div>
        </div>

        <div className="features-carousel-footer">
          <div className="features-carousel-dots" role="tablist" aria-label={dotsListLabel}>
            {cards.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`${i + 1} / ${n}: ${item.title}`}
                className={`features-carousel-dot${i === activeIndex ? " is-active" : ""}`}
                onClick={() => scrollToIndex(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
