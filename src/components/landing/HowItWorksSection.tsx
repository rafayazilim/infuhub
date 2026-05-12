import React from "react";
import { motion } from "framer-motion";
import { UserPlus, Compass, Settings, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Profilini Oluştur",
    description: "Marka veya influencer olarak hızlıca kayıt olun ve profilinizi tamamlayın.",
    color: "#08afd5",
  },
  {
    icon: Compass,
    title: "Doğru Eşleşmeleri Keşfet",
    description: "Akıllı filtreleme ve öneri sistemiyle en uygun iş birliklerini bulun.",
    color: "#e3447c",
  },
  {
    icon: Settings,
    title: "İş Birliğini Yönet",
    description: "Teklifler, mesajlaşmalar ve kampanya süreçlerini tek panelden yönetiniz.",
    color: "#08afd5",
  },
  {
    icon: BarChart3,
    title: "Sonuçları Takip Et",
    description: "Detaylı analitikler ve raporlarla kampanyalarınızın başarısını ölçün.",
    color: "#e3447c",
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden" id="nasil-calisir">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-[#08afd5]/[0.03] blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-[3rem] font-extrabold text-gray-900 dark:text-white mb-4">
            Nasıl{' '}
            <span className="bg-gradient-to-r from-[#08afd5] to-[#e3447c] bg-clip-text text-transparent">
              Çalışır?
            </span>
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Dört basit adımda influencer marketing yolculuğunuza başlayın
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative group"
            >
              <div className="relative p-6 rounded-2xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/60 dark:border-white/[0.06] hover:border-transparent hover:shadow-[0_12px_40px_rgba(8,175,213,0.1)] transition-all duration-400 text-center">
                {/* Step number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-white/10 flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{i + 1}</span>
                </div>

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${step.color}12` }}
                >
                  <step.icon size={26} style={{ color: step.color }} />
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.description}</p>
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-gray-300 dark:from-gray-700 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
