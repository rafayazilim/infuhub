import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const HeroSection: React.FC = () => {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    lastPos.current = { x, y };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      if (!el || !lastPos.current) return;
      el.style.setProperty("--mx", `${lastPos.current.x}%`);
      el.style.setProperty("--my", `${lastPos.current.y}%`);
      rafRef.current = null;
    });
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-28"
      style={{ "--mx": "50%", "--my": "30%" } as React.CSSProperties}
    >
      <style>
        {`
          @keyframes auroraFloat {
            0% { transform: translate3d(0, 0, 0) scale(1); }
            50% { transform: translate3d(-4%, 3%, 0) scale(1.05); }
            100% { transform: translate3d(0, 0, 0) scale(1); }
          }
          @keyframes auroraDrift {
            0% { transform: translate3d(0, 0, 0) scale(1); }
            50% { transform: translate3d(3%, -3%, 0) scale(1.08); }
            100% { transform: translate3d(0, 0, 0) scale(1); }
          }
          .animate-aurora-slow {
            animation: auroraFloat 18s ease-in-out infinite;
          }
          .animate-aurora-fast {
            animation: auroraDrift 12s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-aurora-slow,
            .animate-aurora-fast {
              animation: none;
            }
          }
        `}
      </style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2f6adf] via-[#37b5ea] to-[#f06ab9] opacity-95" />
        <div
          className="absolute inset-[-20%] animate-aurora-slow blur-[14px]"
          style={{
            backgroundImage:
              "radial-gradient(circle at var(--mx) var(--my), rgba(240,106,185,0.8), transparent 45%)," +
              "radial-gradient(circle at 20% 80%, rgba(52,174,240,0.75), transparent 40%)," +
              "radial-gradient(circle at 80% 20%, rgba(80,90,220,0.65), transparent 45%)",
          }}
        />
        <div
          className="absolute inset-[-16%] animate-aurora-fast mix-blend-screen blur-[20px]"
          style={{
            backgroundImage:
              "radial-gradient(circle at calc(var(--mx) - 10%) calc(var(--my) + 6%), rgba(55,181,234,0.6), transparent 45%)," +
              "radial-gradient(circle at 70% 60%, rgba(240,106,185,0.6), transparent 45%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.18] mix-blend-soft-light [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] xl:text-[4rem] font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.25)]">
            Influencer marketing süreçlerinizi{" "}
            <span className="text-white">tek merkezden</span> yönetin.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl mx-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.2)]">
            INFUHUB ile markaları ve içerik üreticilerini verimli, hızlı ve ölçeklenebilir
            bir altyapıda bir araya getirin.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              to="/kayit-sec"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#08afd5] to-[#0b96b8] shadow-[0_8px_24px_rgba(8,175,213,0.35)] hover:shadow-[0_12px_30px_rgba(8,175,213,0.45)] transition-all duration-300 hover:-translate-y-0.5"
            >
              Hemen Kayıt Ol
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="mt-12 lg:mt-16">
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/70 via-white/50 to-white/20 shadow-[0_30px_80px_rgba(15,23,42,0.15)]" />
            <div className="relative rounded-[28px] border border-white/60 bg-white/80 backdrop-blur-2xl p-4 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <div className="rounded-[22px] border border-slate-200/60 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/60 bg-gradient-to-r from-white to-slate-50">
                  <div className="flex items-center gap-2">
                    <img src="/pics/infulogo.png" alt="INFUHUB" className="h-6 w-auto" />
                    <span className="text-xs font-semibold text-slate-500">Yönetim Paneli</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr]">
                  <div className="hidden lg:block border-r border-slate-200/60 bg-slate-50/80 p-4">
                    <div className="space-y-3">
                      {["Genel Bakış", "Kampanyalar", "Teklifler", "İçerikler", "Raporlar"].map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: "Aktif Kampanya", value: "12" },
                        { label: "Açık Teklif", value: "86" },
                        { label: "Toplam Etkileşim", value: "2.4M" },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(8,175,213,0.18)]"
                        >
                          <p className="text-xs text-slate-500">{card.label}</p>
                          <p className="text-xl font-semibold text-slate-900">{card.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-[#f1fbff] via-white to-white p-5">
                      <p className="text-sm font-semibold text-slate-900 mb-3">
                        Influencer eşleştirme akışı
                      </p>
                      <div className="space-y-3">
                        {[
                          "Moda kategorisinde 8 yeni creator önerisi",
                          "Kampanya bütçesi %40 kullanıldı",
                          "Bu hafta 14 içerik onaylandı",
                        ].map((line) => (
                          <div
                            key={line}
                            className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 text-sm text-slate-600 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(8,175,213,0.16)]"
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 left-1/2 h-16 w-[70%] -translate-x-1/2 rounded-full bg-[#08afd5]/15 blur-[40px]" />
          </div>
        </div>
      </div>
    </section>
  );
};
