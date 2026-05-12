import React from "react";

function IconHome({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconBriefcase({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M4 9h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconWallet({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 12h3M4 11h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconUser({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 20v-1a5 5 0 015-5h4a5 5 0 015 5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBell({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 22a2 2 0 002-2H10a2 2 0 002 2zM18 9a6 6 0 10-12 0c0 4-2 5-2 5h16s-2-1-2-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
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

const SIDEBAR_ICONS = {
  home: IconHome,
  campaigns: IconBriefcase,
  payments: IconWallet,
  profile: IconUser,
};

/** Pazarlama sayfası: gerçekçi influencer paneli mockup’ı (dekoratif) */
export default function InfluencerDashboardMockup({ dashboard }) {
  const m = dashboard.mock;
  const stats = dashboard.stats || [];

  return (
    <div className="infl-dash-mock" aria-hidden="true">
      <div className="infl-dash-mock__chrome">
        <span className="infl-dash-mock__dot infl-dash-mock__dot--r" />
        <span className="infl-dash-mock__dot infl-dash-mock__dot--y" />
        <span className="infl-dash-mock__dot infl-dash-mock__dot--g" />
        <span className="infl-dash-mock__chrome-title">INFUHUB — Creator</span>
      </div>

      <div className="infl-dash-mock__body">
        <nav className="infl-dash-mock__rail">
          {m.sidebar.map((item) => {
            const Icon = SIDEBAR_ICONS[item.id] || IconHome;
            return (
              <button
                key={item.id}
                type="button"
                tabIndex={-1}
                className={item.active ? "infl-dash-mock__rail-btn is-active" : "infl-dash-mock__rail-btn"}
              >
                <Icon className="infl-dash-mock__rail-ico" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="infl-dash-mock__main">
          <header className="infl-dash-mock__top">
            <div className="infl-dash-mock__hello">
              <div className="infl-dash-mock__avatar" aria-hidden="true">
                {m.avatarInitials}
              </div>
              <div className="infl-dash-mock__hello-text">
                <p className="infl-dash-mock__greet">
                  {m.greeting}, <strong>{m.userName}</strong>
                </p>
                <p className="infl-dash-mock__handle">{m.userHandle}</p>
              </div>
            </div>
            <div className="infl-dash-mock__top-actions">
              <div className="infl-dash-mock__search">
                <IconSearch className="infl-dash-mock__search-ico" />
                <span>{m.searchPlaceholder}</span>
              </div>
              <button type="button" tabIndex={-1} className="infl-dash-mock__bell">
                <IconBell className="infl-dash-mock__bell-ico" />
                <span className="infl-dash-mock__bell-badge">{m.notificationCount}</span>
              </button>
            </div>
          </header>

          <div className="infl-dash-mock__kpis">
            {stats.map((s) => (
              <div key={s.label} className="infl-dash-mock__kpi">
                <span className="infl-dash-mock__kpi-label">{s.label}</span>
                <strong className="infl-dash-mock__kpi-value">{s.value}</strong>
              </div>
            ))}
          </div>

          <div className="infl-dash-mock__mid">
            <div className="infl-dash-mock__chart-card">
              <div className="infl-dash-mock__chart-head">
                <span className="infl-dash-mock__chart-title">{m.chartLabel}</span>
                <span className="infl-dash-mock__chart-hint">{m.chartHint}</span>
              </div>
              <svg className="infl-dash-mock__spark" viewBox="0 0 200 56" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="infl-dash-spark-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(8, 175, 213, 0.35)" />
                    <stop offset="100%" stopColor="rgba(8, 175, 213, 0)" />
                  </linearGradient>
                  <linearGradient id="infl-dash-spark-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#08afd5" />
                    <stop offset="100%" stopColor="#e3447c" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 42 L28 36 L56 38 L84 28 L112 32 L140 18 L168 22 L200 8 L200 56 L0 56 Z"
                  fill="url(#infl-dash-spark-fill)"
                />
                <path
                  d="M0 42 L28 36 L56 38 L84 28 L112 32 L140 18 L168 22 L200 8"
                  fill="none"
                  stroke="url(#infl-dash-spark-line)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="infl-dash-mock__activity">
              <p className="infl-dash-mock__activity-title">{m.activityTitle}</p>
              <ul className="infl-dash-mock__activity-list">
                {m.activities.map((a, i) => (
                  <li key={i} className="infl-dash-mock__activity-row">
                    <span className="infl-dash-mock__activity-dot" />
                    <span className="infl-dash-mock__activity-text">{a.text}</span>
                    <time className="infl-dash-mock__activity-time">{a.time}</time>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="infl-dash-mock__table-wrap">
            <p className="infl-dash-mock__table-title">{m.tableTitle}</p>
            <div className="infl-dash-mock__table">
              <div className="infl-dash-mock__thead">
                {m.tableCols.map((col) => (
                  <span key={col}>{col}</span>
                ))}
              </div>
              {m.rows.map((row, i) => (
                <div key={i} className="infl-dash-mock__trow">
                  <span className="infl-dash-mock__tcell infl-dash-mock__tcell--main">{row.campaign}</span>
                  <span className="infl-dash-mock__tcell">{row.brand}</span>
                  <span className="infl-dash-mock__tcell">
                    <span className={`infl-dash-mock__pill infl-dash-mock__pill--${row.statusVariant}`}>{row.status}</span>
                  </span>
                  <span className="infl-dash-mock__tcell infl-dash-mock__tcell--muted">{row.due}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
