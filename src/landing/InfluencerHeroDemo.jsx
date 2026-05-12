import React, { useId } from "react";
import { Link } from "react-router-dom";

const CURSOR_IMG = "/pics/infucursor2.png";

const NN_INPUT = [
  [18, 22],
  [18, 50],
  [18, 78],
];
const NN_HIDDEN = [
  [108, 12],
  [108, 36],
  [108, 60],
  [108, 84],
];
const NN_OUTPUT = [
  [228, 38],
  [228, 68],
];

const NN_LINES = (() => {
  const L = [];
  NN_INPUT.forEach(([x1, y1]) => {
    NN_HIDDEN.forEach(([x2, y2]) => {
      L.push({ x1, y1, x2, y2, key: `i-h-${x1}-${y1}-${x2}-${y2}` });
    });
  });
  NN_HIDDEN.forEach(([x1, y1]) => {
    NN_OUTPUT.forEach(([x2, y2]) => {
      L.push({ x1, y1, x2, y2, key: `h-o-${x1}-${y1}-${x2}-${y2}` });
    });
  });
  return L;
})();

/** Basit sinir ağı: giriş → gizli → çıkış bağlantıları */
function NeuralWeb({ gradId }) {
  const nodes = [
    ...NN_INPUT.map(([cx, cy], i) => ({ cx, cy, key: `in-${i}`, className: "infl-hero-demo__node infl-hero-demo__node--in" })),
    ...NN_HIDDEN.map(([cx, cy], i) => ({ cx, cy, key: `hi-${i}`, className: "infl-hero-demo__node infl-hero-demo__node--hidden" })),
    ...NN_OUTPUT.map(([cx, cy], i) => ({ cx, cy, key: `out-${i}`, className: "infl-hero-demo__node infl-hero-demo__node--out" })),
  ];

  return (
    <svg className="infl-hero-demo__nn-svg" viewBox="0 0 260 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#08afd5" />
          <stop offset="100%" stopColor="#e3447c" />
        </linearGradient>
      </defs>
      {NN_LINES.map(({ x1, y1, x2, y2, key }) => (
        <line
          key={key}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="infl-hero-demo__edge"
          stroke={`url(#${gradId})`}
          strokeWidth="1.15"
          strokeLinecap="round"
        />
      ))}
      {nodes.map(({ cx, cy, key, className }) => (
        <circle key={key} cx={cx} cy={cy} r="5" className={className} />
      ))}
    </svg>
  );
}

export default function InfluencerHeroDemo({ demo }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `infl-nn-${uid}`;

  return (
    <div className="infl-hero-demo">
      <div className="infl-hero-demo__nn">
        <p className="infl-hero-demo__nn-label">{demo.nnLabel}</p>
        <NeuralWeb gradId={gradId} />
      </div>

      <div className="infl-hero-demo__offer">
        <div className="infl-hero-demo__cta-area">
          <Link to="/kayit/influencer" className="infl-hero-demo__cta">
            {demo.offerBtn}
          </Link>
        </div>
      </div>

      <div className="infl-hero-demo__cursor" aria-hidden="true">
        <div className="infl-hero-demo__cursor-arm">
          <span className="infl-hero-demo__click-ring" />
          <img className="infl-hero-demo__pointer-img" src={CURSOR_IMG} alt="" width={32} height={32} draggable={false} />
        </div>
      </div>
    </div>
  );
}
