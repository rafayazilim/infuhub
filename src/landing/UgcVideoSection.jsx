import React, { useId } from "react";
import { publicAsset } from "@/lib/publicAsset";

/**
 * Ana sayfa: UGC video içerik bölümü (metin + örnek video).
 */
export default function UgcVideoSection({ eyebrow, title, paragraphs, badges, videoAriaLabel, videoSrc }) {
  const uid = useId().replace(/:/g, "");
  const src = videoSrc ?? publicAsset("pics/videos/ugcvideo.mp4");

  return (
    <section id="ugc-videolar" className="ugv-section" aria-labelledby={`ugv-h-${uid}`}>
      <div className="ugv-bg" aria-hidden="true" />
      <div className="ugv-glow ugv-glow--a" aria-hidden="true" />
      <div className="ugv-glow ugv-glow--b" aria-hidden="true" />

      <div className="ugv-inner">
        <div className="ugv-copy">
          {eyebrow ? (
            <p className="ugv-eyebrow">{eyebrow}</p>
          ) : null}
          <h2 id={`ugv-h-${uid}`} className="ugv-title">
            {title}
          </h2>
          <div className="ugv-text-stack">
            {paragraphs.map((p, i) => (
              <p key={i} className="ugv-text">
                {p}
              </p>
            ))}
          </div>
          {badges?.length ? (
            <ul className="ugv-pills">
              {badges.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="ugv-media">
          <div className="ugv-frame">
            <div className="ugv-frame__shine" aria-hidden="true" />
            <video
              className="ugv-video"
              src={src}
              controls
              playsInline
              preload="metadata"
              aria-label={videoAriaLabel}
            />
          </div>
          <p className="ugv-caption">{videoAriaLabel}</p>
        </div>
      </div>
    </section>
  );
}
