import React from "react";
import { Link } from "react-router-dom";

function IconTarget({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconUsers({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconShield({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconSpark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 3l2.2 5.6L20 11l-5.8 2.3L12 19l-2.2-5.7L4 11l5.8-2.4L12 3z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconBriefcase({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="3" y="7" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconChart({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 16V10M12 16V6M17 16V12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconCpu({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 4v2M17 4v2M7 18v2M17 18v2M4 7h2M4 17h2M18 7h2M18 17h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const PILLAR_ICONS = [IconTarget, IconSpark, IconUsers, IconShield];
const CAPABILITY_ICONS = [IconBriefcase, IconUsers, IconCpu, IconChart];

/** @param {string | { src: string; width: number; height: number }} entry */
function partnerLogoSrc(entry) {
  return typeof entry === "string" ? entry : entry.src;
}

/** @param {string | { src: string; width: number; height: number }} entry */
function partnerLogoDims(entry) {
  if (typeof entry === "string") return {};
  return { width: entry.width, height: entry.height };
}

function PartnerMarqueeLane({ logos, laneClass, partnerLogoAlt }) {
  if (logos.length === 0) return null;
  const doubled = [...logos, ...logos];
  return (
    <div className={`trust-lane ${laneClass}`}>
      <div className="trust-track">
        {doubled.map((entry, idx) => (
          <img
            key={`${laneClass}-a-${idx}`}
            src={partnerLogoSrc(entry)}
            alt={idx === 0 ? partnerLogoAlt : ""}
            {...partnerLogoDims(entry)}
            decoding="async"
          />
        ))}
      </div>
      <div className="trust-track" aria-hidden="true">
        {doubled.map((entry, idx) => (
          <img
            key={`${laneClass}-b-${idx}`}
            src={partnerLogoSrc(entry)}
            alt=""
            {...partnerLogoDims(entry)}
            decoding="async"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}

export default function AboutPage({ content, partnerLogos = [], partnerLogoAlt = "" }) {
  const mid = Math.ceil(partnerLogos.length / 2);
  const logosRowLeft = partnerLogos.slice(0, mid);
  const logosRowRight = partnerLogos.slice(mid);
  const intro = content.intro;
  const capabilities = content.capabilities;
  const highlights = content.hero.highlights ?? [];
  const cta = content.finalCta;

  return (
    <>
      <section className="subpage-hero about-hero">
        <div className="subpage-hero-bg about-hero-bg" aria-hidden="true" />
        <div className="subpage-hero-inner about-hero-inner">
          <h1 className="subpage-hero-title about-hero-title">
            {content.hero.title.replace(content.hero.titleHighlight, "")}
            <span className="about-hero-title-accent">{content.hero.titleHighlight}</span>
          </h1>
          <p className="subpage-hero-desc about-hero-desc">{content.hero.description}</p>
          {highlights.length > 0 && (
            <ul className="about-hero-highlights">
              {highlights.map((item) => (
                <li key={item.title} className="about-hero-highlight">
                  <span className="about-hero-highlight-title">{item.title}</span>
                  <span className="about-hero-highlight-text">{item.text}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="about-hero-ctas">
            <Link className="final-cta__btn final-cta__btn--primary about-hero-cta-primary" to={cta.primaryTo ?? "/iletisim"}>
              {cta.primaryBtn}
            </Link>
            <span className="final-cta__btn-outline about-hero-cta-secondary-wrap">
              <Link className="final-cta__btn final-cta__btn--secondary" to={cta.secondaryTo ?? "/iletisim"}>
                {cta.secondaryBtn}
              </Link>
            </span>
          </div>
          {cta.trust ? <p className="about-hero-trust">{cta.trust}</p> : null}
        </div>
      </section>

      {intro ? (
        <section className="about-intro" aria-labelledby="about-intro-heading">
          <div className="about-intro-inner">
            <div className="about-intro-accent" aria-hidden="true" />
            <h2 id="about-intro-heading" className="about-intro-title">
              {intro.title}
            </h2>
            <div className="about-intro-copy">
              {intro.paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="about-story">
        <div className="about-story-head">
          <h2 className="about-story-label">{content.storySectionTitle}</h2>
          <p className="about-story-lead">{content.storySectionLead}</p>
        </div>
        <div className="about-story-grid">
          <article id="sirket-hakkinda" className="about-glass-card about-glass-card--lift">
            <p className="about-card-kicker">{content.mission.kicker}</p>
            <h2>{content.mission.title}</h2>
            {content.mission.bodyParagraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </article>
          <article id="vizyon-misyon" className="about-glass-card about-glass-card--accent about-glass-card--lift">
            <p className="about-card-kicker">{content.mission.visionKicker}</p>
            <h2>{content.mission.visionTitle}</h2>
            {content.mission.visionParagraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </article>
        </div>
      </section>

      {capabilities ? (
        <section className="about-capabilities" aria-labelledby="about-cap-heading">
          <div className="about-capabilities-head">
            <h2 id="about-cap-heading">{capabilities.title}</h2>
            <p>{capabilities.subtitle}</p>
          </div>
          <div className="about-cap-grid">
            {capabilities.items.map((item, idx) => {
              const Icon = CAPABILITY_ICONS[idx % CAPABILITY_ICONS.length];
              return (
                <article key={item.title} className="about-cap-card">
                  <div className="about-cap-icon">
                    <Icon />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="about-pillars">
        <div className="section-header about-pillars-head">
          <h2>{content.pillars.title}</h2>
          <p>{content.pillars.subtitle}</p>
        </div>
        <div className="about-pillar-grid">
          {content.pillars.items.map((item, idx) => {
            const Icon = PILLAR_ICONS[idx % PILLAR_ICONS.length];
            return (
              <article key={item.title} className="about-pillar-card about-pillar-card--lift">
                <div className="about-pillar-icon">
                  <Icon />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      {partnerLogos.length > 0 && (
        <section id="partnerler" className="about-partners" aria-label={content.partnersTitle}>
          <p className="about-partners-label">{content.partnersTitle}</p>
          <div className="about-partners-strip">
            <PartnerMarqueeLane logos={logosRowLeft} laneClass="trust-lane-left" partnerLogoAlt={partnerLogoAlt} />
            <PartnerMarqueeLane logos={logosRowRight} laneClass="trust-lane-right" partnerLogoAlt={partnerLogoAlt} />
          </div>
        </section>
      )}
    </>
  );
}
