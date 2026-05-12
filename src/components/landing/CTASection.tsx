import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";

export const CTASection: React.FC = () => {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden" id="iletisim">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-[#08afd5]/[0.06] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-[#e3447c]/[0.04] blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative max-w-3xl mx-auto"
        >
          <div className="relative p-10 sm:p-14 rounded-3xl bg-white/50 dark:bg-white/[0.03] backdrop-blur-2xl border border-white/50 dark:border-white/[0.08] shadow-[0_20px_60px_rgba(8,175,213,0.08)] text-center">
            {/* Decorative glow */}
            <div className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#08afd5]/40 to-transparent" />
            <div className="absolute -bottom-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#e3447c]/30 to-transparent" />

            <h2 className="text-4xl sm:text-5xl lg:text-[3rem] font-extrabold text-gray-900 dark:text-white mb-5 leading-tight">
              Influencer marketing operasyonlarınızı{' '}
              <span className="bg-gradient-to-r from-[#08afd5] to-[#e3447c] bg-clip-text text-transparent">
                tek platformda
              </span>{' '}
              toplayın.
            </h2>

            <p className="text-base text-gray-600 dark:text-gray-400 mb-10 max-w-lg mx-auto">
              Hemen başlayarak platformumuzun tüm özelliklerini keşfedin.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/kayit-sec"
                className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-base font-semibold text-white bg-gradient-to-r from-[#08afd5]/90 to-[#0b96b8]/90 backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_rgba(8,175,213,0.35)] hover:shadow-[0_12px_40px_rgba(8,175,213,0.5)] transition-all duration-300 hover:-translate-y-0.5 overflow-hidden before:absolute before:inset-0 before:bg-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
              >
                Demo Talep Et
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="mailto:hi@infuhub.com"
                className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-base font-semibold text-gray-700 dark:text-gray-200 bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/15 hover:border-[#e3447c]/50 hover:text-[#e3447c] hover:bg-white/40 dark:hover:bg-white/10 shadow-sm hover:shadow-[0_8px_24px_rgba(227,68,124,0.15)] transition-all duration-300"
              >
                <Mail size={18} />
                İletişime Geç
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
