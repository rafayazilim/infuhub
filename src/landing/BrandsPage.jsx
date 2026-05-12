import React, { useState } from "react";
import { Link } from "react-router-dom";
import HowItWorks from "./HowItWorks";
import FaqSection from "./FaqSection";
import BrandHeroMatchDemo from "./BrandHeroMatchDemo";
import BrandValuePanelMockup from "./BrandValuePanelMockup";

function IconBrain({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 2a7 7 0 0 0-5 11.9V17a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.1A7 7 0 0 0 12 2z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 6v4l2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChart({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 16V10M12 16V6M17 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCampaign({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconOffer({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M9 3v2M15 3v2M4 8h16M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRetarget({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconTracking({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M3 12h4l2.2-5 3.6 10 2.2-5H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMatch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="8" cy="9" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="9" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 18v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1M12 18v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const FEATURE_ICONS = [IconBrain, IconCampaign, IconOffer, IconTracking, IconChart, IconRetarget];

export default function BrandsPage({ content }) {
  const [openOfferIndex, setOpenOfferIndex] = useState(null);

  return (
    <>
      {/* 1 — Hero */}
      <section className="brand-hero" id="brand-hero">
        <div className="brand-hero-bg" aria-hidden="true" />
        <div className="brand-hero-grid">
          <div className="brand-hero-copy">
            <h1 className="brand-hero-title">
              {content.hero.title.replace(content.hero.titleHighlight, "")}
              <span>{content.hero.titleHighlight}</span>
            </h1>
            <p className="brand-hero-desc">{content.hero.description}</p>
            <div className="brand-hero-actions">
              <Link className="final-cta__btn final-cta__btn--primary" to="/kayit/marka">
                {content.hero.primaryBtn}
              </Link>
              <span className="final-cta__btn-outline">
                <Link className="final-cta__btn final-cta__btn--secondary" to="/giris">
                  {content.hero.secondaryBtn}
                </Link>
              </span>
            </div>
          </div>

          <div className="brand-hero-visual">
            <div className="brand-glass-panel brand-glass-panel--hero-demo">
              <BrandHeroMatchDemo demo={content.hero.demo} />
            </div>
            <div className="brand-floating-glow" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* 2 — Value Section */}
      <section className="brand-value" id="brand-value">
        <div className="section-header">
          <h2>{content.value.title}</h2>
          <p>{content.value.subtitle}</p>
        </div>
        <BrandValuePanelMockup panel={content.value.panel} />
      </section>

      {/* 3 — Features */}
      <section className="brand-features" id="brand-features">
        <div className="section-header">
          <h2>{content.features.title}</h2>
          <p>{content.features.subtitle}</p>
        </div>
        <div className="brand-feature-grid">
          {content.features.items.map((item, idx) => {
            const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
            return (
              <article key={item.title} className="brand-feature-card">
                <div className="brand-feature-icon">
                  <Icon />
                </div>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* 4 — AI Matching */}
      <section className="brand-ai" id="brand-ai">
        <div className="brand-split">
          <div className="brand-split-copy">
            <h2>{content.aiMatch.title}</h2>
            <p>{content.aiMatch.description}</p>
            <div className="brand-tags">
              {content.aiMatch.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          <div className="brand-split-visual">
            <div className="brand-match-grid">
              {content.aiMatch.cards.map((card, idx) => (
                <article key={card.influencer} className="brand-match-card">
                  <div className="brand-match-top">
                    <img
                      className="brand-match-avatar"
                      src={`https://i.pravatar.cc/128?img=${idx + 18}`}
                      alt=""
                    />
                    <div className="brand-match-top-text">
                      <h5>{card.influencer}</h5>
                      <div className="brand-match-score-row">
                        <strong>{card.score}%</strong>
                        <span>{card.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="brand-match-meta">
                    <span>{content.aiMatch.overlapLabel}</span>
                    <span>{card.overlap}</span>
                  </div>
                  <div className="brand-match-meta">
                    <span>{content.aiMatch.categoryLabel}</span>
                    <span>{card.category}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5 — Campaign & Offer Management */}
      <section className="brand-campaign" id="brand-campaign">
        <div className="brand-split brand-split--reverse">
          <div className="brand-split-copy">
            <h2>{content.campaign.title}</h2>
            <p>{content.campaign.description}</p>
            <div className="brand-pipeline">
              {content.campaign.statuses.map((s) => (
                <div key={s.label} className={`brand-pipeline-item brand-pipeline-item--${s.status}`}>
                  <span className="brand-pipeline-dot" />
                  <span>{s.label}</span>
                  <strong>{s.count}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="brand-split-visual">
            <div className="brand-glass-panel brand-glass-panel--campaign-offers">
              <div className="brand-offer-list">
                {content.campaign.offers.map((offer, idx) => {
                  const isOpen = openOfferIndex === idx;
                  const rows = offer.detailRows ?? [];
                  const expandHint = content.campaign.offerExpandHint ?? "";
                  return (
                    <div key={offer.name} className={`brand-offer-card ${isOpen ? "is-open" : ""}`}>
                      <button
                        type="button"
                        className="brand-offer-row"
                        onClick={() => setOpenOfferIndex(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                        aria-controls={`brand-offer-detail-${idx}`}
                        id={`brand-offer-trigger-${idx}`}
                        aria-label={expandHint ? `${offer.name}. ${expandHint}` : offer.name}
                      >
                        <span className="brand-offer-name">{offer.name}</span>
                        <span className="brand-offer-row-end">
                          <span className={`brand-offer-status brand-offer-status--${offer.statusKey}`}>{offer.status}</span>
                          <span className="brand-offer-chevron" aria-hidden />
                        </span>
                      </button>
                      <div
                        className="brand-offer-detail-wrap"
                        aria-hidden={!isOpen}
                        id={`brand-offer-detail-${idx}`}
                        role="region"
                        aria-labelledby={`brand-offer-trigger-${idx}`}
                      >
                        <div className="brand-offer-detail-inner">
                          {rows.length > 0 ? (
                            <dl className="brand-offer-detail-grid">
                              {rows.map((row) => (
                                <div key={row.label} className="brand-offer-detail-pair">
                                  <dt>{row.label}</dt>
                                  <dd>{row.value}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 — How It Works */}
      <HowItWorks
        title={content.howItWorks.title}
        subtitle={content.howItWorks.subtitle}
        steps={content.howItWorks.steps}
        registrationMini={content.howItWorks.registrationMini}
        aiVisual={content.howItWorks.aiVisual}
      />

      {/* 7 — FAQ */}
      <FaqSection key={content.faqTitle} title={content.faqTitle} items={content.faq} />
    </>
  );
}
