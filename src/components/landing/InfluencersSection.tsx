import React from "react";
import { motion } from "framer-motion";
import { Handshake, LayoutDashboard, MessageCircle, UserCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Handshake, text: "Marka iş birliklerine erişim" },
  { icon: LayoutDashboard, text: "Tek panelden başvuru ve yönetim" },
  { icon: MessageCircle, text: "Düzenli iletişim ve süreç görünürlüğü" },
  { icon: UserCheck, text: "Profesyonel profil sunumu" },
];

export const InfluencersSection: React.FC = () => {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden" id="influencerlar">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] -left-[15%] w-[50%] h-[50%] rounded-full bg-[#e3447c]/[0.04] blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="order-2 lg:order-1"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e3447c]/10 border border-[#e3447c]/20 mb-6">
              <span className="text-xs font-semibold text-[#e3447c] uppercase tracking-wider">Influencerlar İçin</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-[3rem] font-extrabold text-gray-900 dark:text-white mb-5 leading-tight">
              Daha görünür, daha organize{' '}
              <span className="bg-gradient-to-r from-[#e3447c] to-[#c93368] bg-clip-text text-transparent">
                iş birlikleri
              </span>
            </h2>

            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
              Markalarla daha kolay buluşun, iş birliklerini düzenli yönetin ve fırsatlara tek bir merkezden erişin.
            </p>

            <div className="space-y-4 mb-10">
              {features.map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#e3447c]/10 flex items-center justify-center shrink-0">
                    <f.icon size={16} className="text-[#e3447c]" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.text}</span>
                </motion.div>
              ))}
            </div>

            <Link
              to="/kayit/influencer"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full text-[#e3447c] font-semibold bg-white/20 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/10 hover:border-[#e3447c]/30 hover:gap-3 transition-all duration-300"
            >
              Influencer olarak başlayın
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Right - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative order-1 lg:order-2"
          >
            <div className="relative rounded-3xl bg-gradient-to-br from-[#e3447c]/[0.06] to-[#e3447c]/[0.02] border border-[#e3447c]/10 p-8 lg:p-10">
              {/* Mock influencer profile card */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/80 dark:bg-white/[0.05] backdrop-blur-lg border border-white/60 dark:border-white/5 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e3447c] to-[#08afd5] flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-white">IN</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 dark:text-white">Influencer Profili</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Doğrulanmış hesap</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold">Aktif</div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-white/80 dark:bg-white/[0.05] backdrop-blur-lg border border-white/60 dark:border-white/5 text-center">
                    <p className="text-xl font-bold text-[#e3447c]">48K</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Takipçi</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/80 dark:bg-white/[0.05] backdrop-blur-lg border border-white/60 dark:border-white/5 text-center">
                    <p className="text-xl font-bold text-[#08afd5]">4.8%</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Etkileşim</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/80 dark:bg-white/[0.05] backdrop-blur-lg border border-white/60 dark:border-white/5 text-center">
                    <p className="text-xl font-bold text-[#e3447c]">23</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Kampanya</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-white/[0.05] backdrop-blur-lg border border-white/60 dark:border-white/5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[#08afd5]/10 flex items-center justify-center shrink-0">
                    <Handshake size={18} className="text-[#08afd5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Yeni İş Birliği Teklifi</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Premium Marka - Giyim Kampanyası</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
