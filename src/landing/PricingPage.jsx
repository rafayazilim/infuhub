import React from "react";
import { Link } from "react-router-dom";

function CtaLink({ to, className, children }) {
  if (!to) return null;
  const isMail = /^mailto:/i.test(to);
  if (isMail) {
    return (
      <a className={className} href={to}>
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={to}>
      {children}
    </Link>
  );
}

export default function PricingPage({ content }) {
  const { hero, packages, comparison } = content;

  return (
    <>
      <section className="subpage-hero pricing-hero">
        <div className="subpage-hero-bg" aria-hidden="true" />
        <div className="subpage-hero-inner">
          <h1 className="subpage-hero-title pricing-hero-title">
            {hero.title.replace(hero.titleHighlight, "")}
            <span>{hero.titleHighlight}</span>
          </h1>
          <p className="subpage-hero-desc">{hero.description}</p>
        </div>
      </section>

      <section className="pricing-packages" aria-label={content.packagesSectionLabel}>
        <div className="pricing-packages-grid">
          {packages.map((pkg) => {
            const v = pkg.cardVariant || "";
            return (
            <article
              key={pkg.id}
              className={[
                "pricing-card",
                pkg.featured ? "pricing-card--featured" : "",
                v ? `pricing-card--${v}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {pkg.badge ? (
                <span
                  className={[
                    "pricing-card-badge",
                    pkg.badgeTone ? `pricing-card-badge--${pkg.badgeTone}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {pkg.badge}
                </span>
              ) : null}
              <div className="pricing-card-head">
                <h3 className="pricing-card-name">{pkg.name}</h3>
                <p className="pricing-card-tagline">{pkg.tagline}</p>
                <div className="pricing-card-price">
                  <span className="pricing-card-price-main">{pkg.priceMain}</span>
                  {pkg.priceSub ? <span className="pricing-card-price-sub">{pkg.priceSub}</span> : null}
                </div>
                {pkg.description ? <p className="pricing-card-desc">{pkg.description}</p> : null}
              </div>
              <ul className="pricing-card-features">
                {pkg.features.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <CtaLink
                to={pkg.ctaTo}
                className={["btn", "pricing-card-cta", pkg.featured ? "btn-primary" : "btn-light", pkg.featured ? "pricing-card-cta--featured" : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                {pkg.cta}
              </CtaLink>
            </article>
            );
          })}
        </div>
      </section>

      <section id="fiyatlandirma-ozellikler" className="pricing-compare" aria-labelledby="pricing-compare-title">
        <div className="section-header pricing-compare-header">
          <h2 id="pricing-compare-title">{comparison.title}</h2>
          <p>{comparison.subtitle}</p>
        </div>
        <div className="pricing-compare-scroll" role="region" aria-label={comparison.tableAria}>
          <table className="pricing-compare-table">
            <thead>
              <tr>
                <th scope="col">{comparison.colFeature}</th>
                {comparison.columns.map((col) => (
                  <th key={col.id} scope="col">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  {comparison.columns.map((col) => (
                    <td key={col.id}>{row[col.id]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
