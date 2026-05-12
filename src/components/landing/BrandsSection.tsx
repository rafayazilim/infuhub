import React from "react";
import { motion } from "framer-motion";
import { Search, FolderKanban, Monitor, Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Search, text: "Influencer keşfet ve filtreleme" },
  { icon: FolderKanban, text: "Kampanya oluşturma ve yönetme" },
  { icon: Monitor, text: "Tek panelden süreç takibi" },
  { icon: Target, text: "Performans odaklı karar alma" },
];

export const BrandsSection: React.FC = () => {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden" id="markalar">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] -right-[15%] w-[50%] h-[50%] rounded-full bg-[#08afd5]/[0.04] blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Visual */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="relative rounded-3xl bg-gradient-to-br from-[#08afd5]/[0.06] to-[#08afd5]/[0.02] border border-[#08afd5]/10 p-8 lg:p-10">
              {/* Mock dashboard cards */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/80 dark:bg-white/[0.05] backdrop-blur-lg border border-white/60 dark:border-white/5 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-[#08afd5]/10 flex items-center justify-center shrink-0">
                    <FolderKanban size={22} className="text-[#08afd5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Aktif Kampanyalar</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">12 kampanya yönetiliyor</p>
                  </div>
                  <span className="text-2xl font-bold text-[#08afd5]">12</span>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/80 dark:bg-white/[0.05] backdrop-blur-lg border border-white/60 dark:border-white/5 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-[#e3447c]/10 flex items-center justify-center shrink-0">
                    <Search size={22} className="text-[#e3447c]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Influencer Havuzu</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Filtrelenebilir profiller</p>
                  </div>
                  <span className="text-2xl font-bold text-[#e3447c]">2.4K</span>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/80 dark:bg-white/[0.05] backdrop-blur-lg border border-white/60 dark:border-white/5 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-[#08afd5]/10 flex items-center justify-center shrink-0">
                    <Target size={22} className="text-[#08afd5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Kampanya Başarısı</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ortalama ROI</p>
                  </div>
                  <span className="text-2xl font-bold text-[#08afd5]">3.2x</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#08afd5]/10 border border-[#08afd5]/20 mb-6">
              <span className="text-xs font-semibold text-[#08afd5] uppercase tracking-wider">Markalar İçin</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-[3rem] font-extrabold text-gray-900 dark:text-white mb-5 leading-tight">
              Uçtan uca{' '}
              <span className="bg-gradient-to-r from-[#08afd5] to-[#0b96b8] bg-clip-text text-transparent">
                kampanya yönetimi
              </span>
            </h2>

            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
              Dogru influencer'lari kesfedin, kampanyalarinizi yonetin, surecleri tek panel uzerinden takip edin ve is birliklerinizi daha verimli hale getirin.
            </p>

            <div className="space-y-4 mb-10">
              {features.map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#08afd5]/10 flex items-center justify-center shrink-0">
                    <f.icon size={16} className="text-[#08afd5]" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.text}</span>
                </motion.div>
              ))}
            </div>

            <Link
              to="/kayit/marka"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full text-[#08afd5] font-semibold bg-white/20 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/10 hover:border-[#08afd5]/30 hover:gap-3 transition-all duration-300"
            >
              Marka olarak başlayın
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
