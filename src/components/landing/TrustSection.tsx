import React from "react";
import { motion } from "framer-motion";
import { Zap, LayoutDashboard, Eye, BarChart3, Sparkles } from "lucide-react";

const items = [
  {
    icon: Zap,
    title: "Hızlı Eşleşme",
    description:
      "Yapay zeka destekli sistemimiz ile en uygun marka–influencer eşleşmeleri saniyeler içinde oluşur.",
    accent: "cyan" as const,
    tag: "AI destekli",
  },
  {
    icon: LayoutDashboard,
    title: "Merkezi Yönetim",
    description:
      "Kampanyalar, teklifler ve mesajlar tek bir panel üzerinden kolayca yönetilir.",
    accent: "rose" as const,
    tag: "Tek panel",
  },
  {
    icon: Eye,
    title: "Şeffaf Süreç Takibi",
    description:
      "Her adımı gerçek zamanlı izleyin; süreçlerde tam görünürlük ve kontrol.",
    accent: "cyan" as const,
    tag: "Canlı durum",
  },
  {
    icon: BarChart3,
    title: "Ölçülebilir Performans",
    description:
      "Detaylı analitik ve raporlarla kampanyalarınızın gerçek etkisini ölçün.",
    accent: "rose" as const,
    tag: "Veri odaklı",
  },
];

const accentStyles = {
  cyan: {
    ring: "from-[#08afd5]/25 to-[#08afd5]/5",
    iconBg: "bg-gradient-to-br from-[#08afd5]/20 to-[#08afd5]/5",
    iconColor: "text-[#08afd5]",
    glow: "shadow-[0_0_0_1px_rgba(8,175,213,0.12),0_20px_50px_-12px_rgba(8,175,213,0.25)]",
    border: "group-hover:border-[#08afd5]/35",
    line: "from-[#08afd5] to-transparent",
    tag: "bg-[#08afd5]/10 text-[#0899b8] dark:text-[#6edff3] border-[#08afd5]/20",
  },
  rose: {
    ring: "from-[#e3447c]/25 to-[#e3447c]/5",
    iconBg: "bg-gradient-to-br from-[#e3447c]/20 to-[#e3447c]/5",
    iconColor: "text-[#e3447c]",
    glow: "shadow-[0_0_0_1px_rgba(227,68,124,0.12),0_20px_50px_-12px_rgba(227,68,124,0.22)]",
    border: "group-hover:border-[#e3447c]/35",
    line: "from-[#e3447c] to-transparent",
    tag: "bg-[#e3447c]/10 text-[#c7366a] dark:text-[#ff8eb3] border-[#e3447c]/20",
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export const TrustSection: React.FC = () => {
  return (
    <section
      className="relative py-16 sm:py-20 lg:py-28 overflow-hidden"
      id="ozellikler"
      aria-labelledby="trust-heading"
    >
      {/* Arka plan: marka renkleri + derinlik */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-0 w-[min(520px,90vw)] h-[min(520px,90vw)] rounded-full bg-[#08afd5]/[0.07] blur-[100px] -translate-x-1/3" />
        <div className="absolute bottom-0 right-0 w-[min(480px,85vw)] h-[min(480px,85vw)] rounded-full bg-[#e3447c]/[0.06] blur-[110px] translate-x-1/4 translate-y-1/4" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(8,175,213,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(8,175,213,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,black,transparent)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(90%,720px)] h-px bg-gradient-to-r from-transparent via-[#08afd5]/25 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8 relative z-10">
        {/* Başlık bloğu */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-14 lg:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#08afd5]/20 bg-white/70 dark:bg-gray-900/60 backdrop-blur-md px-3 py-1.5 text-xs font-semibold tracking-wide text-[#0899b8] dark:text-[#7ce7ff] shadow-sm mb-5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span>Platform özellikleri</span>
          </div>
          <h2
            id="trust-heading"
            className="text-4xl sm:text-5xl lg:text-[3rem] font-extrabold tracking-tight text-gray-900 dark:text-white mb-4 leading-[1.12]"
          >
            Neden{" "}
            <span className="bg-gradient-to-r from-[#08afd5] via-[#2ab8d9] to-[#e3447c] bg-clip-text text-transparent">
              INFUHUB?
            </span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Influencer marketing süreçlerinizi uçtan uca sadeleştirir; markalar ve içerik üreticileri
            için güvenilir, hızlı ve ölçülebilir bir deneyim sunarız.
          </p>
        </motion.div>

        {/* Bento grid: mobil tek sütun, tablet 2, büyük ekranda asimetrik */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 auto-rows-fr"
        >
          {items.map((item, i) => {
            const s = accentStyles[item.accent];
            return (
              <motion.article
                key={item.title}
                variants={itemVariants}
                className={`
                  group relative rounded-2xl sm:rounded-3xl border border-gray-200/70 dark:border-white/[0.08]
                  bg-white/75 dark:bg-gray-950/50 backdrop-blur-xl
                  p-6 sm:p-7 lg:p-8 min-h-[260px] sm:min-h-[280px] flex flex-col
                  transition-all duration-300 ease-out
                  motion-safe:hover:-translate-y-1 hover:shadow-xl
                  ${s.border}
                `}
              >
                {/* İç gradient vurgu */}
                <div
                  className={`pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${s.ring} via-transparent to-transparent`}
                  aria-hidden
                />

                <div className="relative flex flex-col h-full flex-1">
                  <div className="flex items-start justify-between gap-4 mb-4 sm:mb-5">
                    <span
                      className={`text-[11px] sm:text-xs font-bold tabular-nums text-gray-400 dark:text-gray-500`}
                      aria-hidden
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full border ${s.tag}`}
                    >
                      {item.tag}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5 flex-1 min-h-0">
                    <div
                      className={`
                        shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center
                        ${s.iconBg} ${s.glow}
                        ring-1 ring-white/50 dark:ring-white/5
                        transition-transform duration-300 group-hover:scale-[1.05]
                      `}
                    >
                      <item.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${s.iconColor}`} strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-sm sm:text-[15px] leading-relaxed text-gray-600 dark:text-gray-400 flex-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`mt-5 sm:mt-6 h-px w-full bg-gradient-to-r ${s.line} opacity-60 group-hover:opacity-100 transition-opacity shrink-0`}
                    aria-hidden
                  />
                </div>
              </motion.article>
            );
          })}
        </motion.div>

        {/* Alt bilgi çubuğu */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-center text-sm text-gray-500 dark:text-gray-500 mt-10 sm:mt-12 max-w-2xl mx-auto"
        >
          Tüm özellikler mobil ve masaüstünde tutarlı arayüzle sunulur; ekibiniz nerede olursa olsun aynı
          kalitede deneyim.
        </motion.p>
      </div>
    </section>
  );
};
