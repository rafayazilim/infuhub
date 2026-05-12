import React, { useCallback, useEffect, useId, useState } from "react";
import { submitSupportMessage } from "@/services/firebaseSupportMessageService";

function IconBrandMark({ className }) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#08afd5" />
          <stop offset="100%" stopColor="#e3447c" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
      <circle cx="16" cy="11" r="2.2" fill="#fff" />
      <rect x="14" y="15" width="4" height="9" rx="1.2" fill="#fff" />
    </svg>
  );
}

function IconUser({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6 19.5v-.4a6 6 0 0 1 12 0v.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAlert({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M12 4l9 14H3L12 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 10v4M12 17v.02" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconChat({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M4 6h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5l-4 3v-3H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMegaphone({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M4 11V6a1 1 0 0 1 1-1h1l10-2v14L6 16H5a1 1 0 0 1-1-1v-1.2M8 16v3a2 2 0 0 0 2 2h1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClose({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const CARD_ICONS = { user: IconUser, alert: IconAlert, chat: IconChat, megaphone: IconMegaphone };

function ContactFramerCard({ item, onOpen }) {
  const Icon = CARD_ICONS[item.icon] || IconChat;
  return (
    <article className="contact-framer-card">
      <div className="contact-framer-card__icon-wrap" aria-hidden="true">
        <Icon className="contact-framer-card__icon" />
      </div>
      <h3 className="contact-framer-card__title">{item.title}</h3>
      <p className="contact-framer-card__body">{item.body}</p>
      <button type="button" className="contact-framer-btn contact-framer-btn--ghost" onClick={() => onOpen(item.category)}>
        {item.btn}
      </button>
    </article>
  );
}

export default function ContactPage({ content }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState("platform");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [subject, setSubject] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const titleId = useId();
  const closeLabel = content.form.modalCloseLabel || "Kapat";
  const categoryLabels = content.form.categoryLabels || {};

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSent(false);
    setSubmitError("");
    setFirstName("");
    setLastName("");
    setSubject("");
    setPhone("");
    setEmail("");
    setMessage("");
    setModalCategory("platform");
    if (typeof window !== "undefined" && window.location.hash === "#iletisim-form") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  function openModal(category) {
    setModalCategory(category || "platform");
    setModalOpen(true);
    setSubmitError("");
    window.history.replaceState(null, "", "#iletisim-form");
  }

  useEffect(() => {
    function syncHash() {
      if (window.location.hash === "#iletisim-form") {
        setModalOpen(true);
      }
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (!modalOpen) return undefined;
    function onKey(e) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      await submitSupportMessage({
        category: modalCategory,
        firstName,
        lastName,
        subject,
        email,
        phone,
        message,
      });
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gönderilemedi. Lütfen tekrar deneyin.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const f = content.framer;
  const cards = f.cards ?? [];
  const categoryTitle = categoryLabels[modalCategory] || modalCategory;

  return (
    <div className="contact-framer">
      <section className="contact-framer-hero" id="iletisim-hero">
        <h1 className="contact-framer-hero__title">{f.heroTitle}</h1>
        <p className="contact-framer-hero__subtitle">{f.heroSubtitle}</p>
      </section>

      <section className="contact-framer-main" aria-label={f.mainLabel}>
        <div className="contact-framer-feature">
          <div className="contact-framer-feature__head">
            <IconBrandMark className="contact-framer-feature__mark" />
            <div className="contact-framer-feature__text">
              <h2 className="contact-framer-feature__title">{f.featured.title}</h2>
              <p className="contact-framer-feature__desc">{f.featured.description}</p>
              <div className="contact-framer-feature__actions">
                <button type="button" onClick={() => openModal("platform")} className="contact-framer-btn contact-framer-btn--primary">
                  {f.featured.primaryCta}
                </button>
              </div>
            </div>
          </div>
          <div className="contact-framer-feature__footer">
            <span className="contact-framer-feature__status">
              <span className="contact-framer-feature__dot" aria-hidden="true" />
              {f.featured.status}
            </span>
          </div>
        </div>

        <div className="contact-framer-grid">
          {cards.map((item) => (
            <ContactFramerCard key={item.title} item={item} onOpen={openModal} />
          ))}
        </div>
      </section>

      {modalOpen ? (
        <div
          className="contact-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="contact-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button type="button" className="contact-modal__close" onClick={closeModal} aria-label={closeLabel}>
              <IconClose />
            </button>
            <h2 id={titleId} className="contact-modal__title">
              {content.form.frameTitle}
              {categoryTitle ? ` — ${categoryTitle}` : ""}
            </h2>
            <p className="contact-modal__lead">{content.form.leadExtended || content.form.lead}</p>
            {sent ? (
              <p className="contact-form-success contact-modal__success" role="status">
                {content.form.success}
              </p>
            ) : (
              <form className="contact-form contact-form--modal" onSubmit={handleSubmit} aria-label={content.form.title}>
                {submitError ? (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-2" role="alert">
                    {submitError}
                  </p>
                ) : null}
                <label className="contact-field">
                  <span>{content.form.firstName}</span>
                  <input
                    type="text"
                    name="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </label>
                <label className="contact-field">
                  <span>{content.form.lastName}</span>
                  <input
                    type="text"
                    name="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </label>
                <label className="contact-field">
                  <span>{content.form.subject}</span>
                  <input
                    type="text"
                    name="subject"
                    autoComplete="off"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </label>
                <label className="contact-field">
                  <span>{content.form.email}</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </label>
                <label className="contact-field">
                  <span>{content.form.phone}</span>
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </label>
                <label className="contact-field">
                  <span>{content.form.message}</span>
                  <textarea
                    name="message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </label>
                <button
                  type="submit"
                  className="contact-framer-btn contact-framer-btn--primary contact-framer-btn--block"
                  disabled={submitting}
                >
                  {submitting ? content.form.sending || "Gönderiliyor…" : content.form.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
