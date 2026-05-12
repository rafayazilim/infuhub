import React from "react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import Particles from "@/components/ui/Particles";

const stats = [
  {
    value: 87,
    suffix: "%",
    label: "Daha Yüksek Kampanya Başarısı",
    description: "Geleneksel yöntemlere kıyasla",
  },
  {
    value: 2500,
    suffix: "+",
    label: "Aktif Influencer",
    description: "Doğrulanmış ve güvenilir",
  },
  {
    value: 850,
    suffix: "+",
    label: "Marka Ortağı",
    description: "Farklı sektörlerden",
  },
  {
    value: 15000,
    suffix: "+",
    label: "Başarılı Kampanya",
    description: "Tamamlanmış iş birliği",
  },
];

export const StatsSection: React.FC = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0">
        <Particles
          particleColors={['#ffffff', '#ffffff']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Rakamlarla <span className="gradient-text">İNFUHUB</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Güven veren sonuçlar, büyüyen bir topluluk
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="glass-card rounded-2xl p-6 h-full">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold gradient-text mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <h3 className="text-sm md:text-base font-semibold mb-1">{stat.label}</h3>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
