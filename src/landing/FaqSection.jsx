import React, { useEffect, useId, useState } from "react";

/**
 * Ana sayfa SSS: sol sütun soru listesi, sağda seçilen cevap (header ile aynı yatay sütun).
 */
export default function FaqSection({ title, items }) {
  const uid = useId().replace(/:/g, "");
  const headingId = `faq-h-${uid}`;
  const list = items ?? [];
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, list.length - 1)));
  }, [list.length]);

  if (!list.length) return null;

  const idx = Math.min(selected, list.length - 1);
  const active = list[idx];

  return (
    <section id="sss" className="faq" aria-labelledby={headingId}>
      <h2 id={headingId} className="faq__title">
        {title}
      </h2>

      <div className="faq__grid">
        <nav className="faq__nav" aria-label={title}>
          <ul className="faq__list">
            {list.map((item, i) => {
              const isActive = i === idx;
              return (
                <li key={`faq-${i}`}>
                  <button
                    type="button"
                    className={`faq__tab${isActive ? " faq__tab--active" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => setSelected(i)}
                  >
                    <span className="faq__tab-text">{item.q}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="faq__panel" aria-live="polite">
          <h3 className="faq__question">{active.q}</h3>
          <p className="faq__answer">{active.a}</p>
        </div>
      </div>
    </section>
  );
}
