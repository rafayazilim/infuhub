import React from "react";
import { motion } from "framer-motion";
import {
  Brain,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Server,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Akıllı Eşleşme",
    description: "Yapay zeka destekli algoritmamız ile marka ve influencer arasında en uygun eşleşmeyi kurun.",
    color: "#08afd5",
  },
  {
    icon: LayoutDashboard,
    title: "Merkezi Panel Yönetimi",
    description: "Tüm kampanyalar, teklifler ve süreçleri tek bir panel üzerinden verimli şekilde yönetin.",
    color: "#e3447c",
  },
  {
    icon: TrendingUp,
    title: "Kampanya Takibi",
    description: "Kampanyalarınızın her aşamasını gerçek zamanlı olarak takip edin ve optimize edin.",
    color: "#08afd5",
  },
  {
    icon: BarChart3,
    title: "Veri Odaklı Görünüm",
    description: "Detaylı analitikler ve görsel raporlarla bilinçli kararlar verin.",
    color: "#e3447c",
  },
  {
    icon: MessageCircle,
    title: "Hızlı İletişim",
    description: "Platform içi mesajlaşma ile marka ve influencer arasında kesintisiz iletişim sağlayın.",
    color: "#08afd5",
  },
  {
    icon: Server,
    title: "Ölçeklenebilir Altyapı",
    description: "Büyüyen ekibinize ve kampanyalarınıza uyum sağlayan güçlü bir teknolojik altyapı.",
    color: "#e3447c",
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#e3447c]/[0.03] blur-[100px]" />
        <div className="absolute bottom-[10%] -left-[10%] w-[35%] h-[35%] rounded-full bg-[#08afd5]/[0.04] blur-[100px]" />
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
            Öne Çıkan{' '}
            <span className="bg-gradient-to-r from-[#08afd5] to-[#e3447c] bg-clip-text text-transparent">
              Özellikler
            </span>
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Platformumuzu güçlü kılan temel özellikler
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative p-6 rounded-2xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/60 dark:border-white/[0.06] hover:border-[#08afd5]/20 dark:hover:border-[#08afd5]/15 shadow-sm hover:shadow-[0_16px_48px_rgba(8,175,213,0.1)] transition-all duration-400"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                style={{
                  backgroundColor: `${feature.color}12`,
                }}
              >
                <feature.icon size={24} style={{ color: feature.color }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{feature.description}</p>

              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-bl-[40px] opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-400"
                style={{ backgroundColor: feature.color }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
