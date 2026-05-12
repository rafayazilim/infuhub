import React, { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

function IconOverview({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M4 4h7v7H4V4zM13 4h7v4h-7V4zM13 10h7v10h-7V10zM4 15h7v5H4v-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconCampaigns({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M4 11V5a2 2 0 012-2h12a2 2 0 012 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 13h16v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMatch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 19v-1a4 4 0 014-4h2M14 16v3M21 16v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconAnalytics({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 16V11M12 16V6M17 16v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBrand({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 3l8 4v10a2 2 0 01-1 1.8l-7 3.2-7-3.2A2 2 0 013 17V7l9-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 8v13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconSearch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBell({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M12 22a2 2 0 002-2H10a2 2 0 002 2zM18 9a6 6 0 10-12 0c0 4-2 5-2 5h16s-2-1-2-5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SIDEBAR_ICONS = {
  overview: IconOverview,
  campaigns: IconCampaigns,
  match: IconMatch,
  analytics: IconAnalytics,
  settings: IconBrand,
};

export default function BrandValuePanelMockup({ panel }) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const m = panel.mock;
  const firstId = panel.sidebar[0]?.id ?? "overview";
  const [active, setActive] = useState(firstId);
  const hint = panel.navHints[active] ?? panel.navHints.overview;

  const sparkFill = `brand-val-spark-fill-${uid}`;
  const sparkLine = `brand-val-spark-line-${uid}`;

  return (
    <div className="brand-value-panel-stage">
      <motion.div
        className="brand-value-mock"
        aria-hidden="true"
        initial={reduce ? false : { opacity: 0, scale: 0.94, y: 32 }}
        whileInView={reduce ? false : { opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.22 }}
        transition={{ duration: 0.68, ease: [0.25, 0.85, 0.3, 1] }}
      >
        <div className="brand-value-mock__chrome">
          <span className="brand-value-mock__dot brand-value-mock__dot--r" />
          <span className="brand-value-mock__dot brand-value-mock__dot--y" />
          <span className="brand-value-mock__dot brand-value-mock__dot--g" />
          <span className="brand-value-mock__chrome-title">{panel.chromeTitle}</span>
        </div>

        <div className="brand-value-mock__body">
          <nav className="brand-value-mock__rail" aria-label="Panel">
            {panel.sidebar.map((item) => {
              const Icon = SIDEBAR_ICONS[item.id] || IconOverview;
              return (
                <button
                  key={item.id}
                  type="button"
                  tabIndex={-1}
                  className={active === item.id ? "brand-value-mock__rail-btn is-active" : "brand-value-mock__rail-btn"}
                  onClick={() => setActive(item.id)}
                  aria-pressed={active === item.id}
                >
                  <Icon className="brand-value-mock__rail-ico" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="brand-value-mock__main">
            <header className="brand-value-mock__top">
              <div className="brand-value-mock__hello">
                <div className="brand-value-mock__avatar">{m.brandInitial}</div>
                <div>
                  <p className="brand-value-mock__greet">
                    {m.greeting}, <strong>{m.brandName}</strong>
                  </p>
                  <p className="brand-value-mock__context">{hint}</p>
                </div>
              </div>
              <div className="brand-value-mock__top-actions">
                <div className="brand-value-mock__search">
                  <IconSearch className="brand-value-mock__search-ico" />
                  <span>{m.searchPlaceholder}</span>
                </div>
                <button type="button" tabIndex={-1} className="brand-value-mock__bell">
                  <IconBell className="brand-value-mock__bell-ico" />
                  <span className="brand-value-mock__bell-badge">{m.notificationCount}</span>
                </button>
              </div>
            </header>

            <div className="brand-value-mock__kpis">
              {m.kpis.map((k) => (
                <div key={k.label} className="brand-value-mock__kpi">
                  <span className="brand-value-mock__kpi-label">{k.label}</span>
                  <strong className="brand-value-mock__kpi-value">{k.value}</strong>
                  <span className="brand-value-mock__kpi-hint">{k.hint}</span>
                </div>
              ))}
            </div>

            <div className="brand-value-mock__mid">
              <div className="brand-value-mock__chart-card">
                <div className="brand-value-mock__chart-head">
                  <span>{m.chartTitle}</span>
                  <span className="brand-value-mock__chart-hint">{m.chartHint}</span>
                </div>
                <svg className="brand-value-mock__spark" viewBox="0 0 200 56" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={sparkFill} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(8, 175, 213, 0.35)" />
                      <stop offset="100%" stopColor="rgba(8, 175, 213, 0)" />
                    </linearGradient>
                    <linearGradient id={sparkLine} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#08afd5" />
                      <stop offset="100%" stopColor="#e3447c" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 40 L28 34 L56 36 L84 26 L112 30 L140 16 L168 20 L200 6 L200 56 L0 56 Z"
                    fill={`url(#${sparkFill})`}
                  />
                  <path
                    d="M0 40 L28 34 L56 36 L84 26 L112 30 L140 16 L168 20 L200 6"
                    fill="none"
                    stroke={`url(#${sparkLine})`}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="brand-value-mock__activity">
                <p className="brand-value-mock__activity-title">{m.activityTitle}</p>
                <ul>
                  {m.activities.map((a, i) => (
                    <li key={i} className="brand-value-mock__activity-row">
                      <span className="brand-value-mock__activity-dot" />
                      <span>{a.text}</span>
                      <time>{a.time}</time>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="brand-value-mock__table-wrap">
              <p className="brand-value-mock__table-title">{m.tableTitle}</p>
              <div className="brand-value-mock__table">
                <div className="brand-value-mock__thead">
                  {m.tableCols.map((col) => (
                    <span key={col}>{col}</span>
                  ))}
                </div>
                {m.rows.map((row, i) => (
                  <div key={i} className="brand-value-mock__trow">
                    <span className="brand-value-mock__tcell brand-value-mock__tcell--main">{row.campaign}</span>
                    <span className="brand-value-mock__tcell">
                      <span className={`brand-value-mock__pill brand-value-mock__pill--${row.statusKey}`}>{row.status}</span>
                    </span>
                    <span className="brand-value-mock__tcell brand-value-mock__tcell--muted">{row.roi}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
