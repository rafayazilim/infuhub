import React from "react";

import trustLogoMeta from "@/data/trustLogoMeta.json";

const logos = trustLogoMeta.logos.map((l) => ({
  src: `/pics/NEW/${l.file}`,
  width: l.width,
  height: l.height,
}));

const Row: React.FC<{ reverse?: boolean; duration?: number }> = ({ reverse, duration = 26 }) => {
  const items = [...logos, ...logos];
  return (
    <div className="relative overflow-hidden">
      <div
        className={`flex w-max items-center gap-4 md:gap-6 ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        }`}
        style={{ animationDuration: `${duration}s` }}
      >
        {items.map((logo, idx) => (
          <div
            key={`${logo.src}-${idx}`}
            className="flex items-center justify-center px-5 sm:px-8 py-2"
          >
            <img
              src={logo.src}
              alt="Marka logosu"
              width={logo.width}
              height={logo.height}
              className="h-12 sm:h-14 md:h-16 lg:h-18 w-auto opacity-95 drop-shadow-[0_10px_28px_rgba(8,175,213,0.22)]"
              decoding="async"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const LogoMarqueeSection: React.FC = () => {
  return (
    <section className="relative -mt-10 pt-12 pb-6 sm:pt-14 sm:pb-8 lg:pt-16 lg:pb-10 bg-transparent">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2f6adf] via-[#37b5ea] to-[#f06ab9] opacity-95" />
        <div className="absolute -left-24 top-6 h-[520px] w-[520px] rounded-full bg-[#3fc7f6]/45 blur-[140px]" />
        <div className="absolute right-[-140px] top-24 h-[420px] w-[420px] rounded-full bg-[#5f62e6]/35 blur-[150px]" />
        <div className="absolute bottom-[-120px] left-[25%] h-[620px] w-[620px] rounded-full bg-[#f06ab9]/45 blur-[180px]" />
        <div className="absolute inset-0 opacity-[0.2] mix-blend-soft-light [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:14px_14px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/20" />
      </div>

      <div className="relative w-full px-0 space-y-4 sm:space-y-5">
        <Row duration={28} />
        <Row reverse duration={24} />
        <Row duration={30} />
      </div>

      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes marquee-reverse {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
          .animate-marquee {
            animation: marquee linear infinite;
          }
          .animate-marquee-reverse {
            animation: marquee-reverse linear infinite;
          }
        `}
      </style>
    </section>
  );
};
