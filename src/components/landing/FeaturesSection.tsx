import React from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Brain, BarChart3, Shield, Eye } from "lucide-react";
import ScrollStack, { ScrollStackItem } from "@/components/ui/ScrollStack";
import Particles from "@/components/ui/Particles";

const features = [
  {
    icon: Brain,
    title: "Yapay Zeka Destekli Eşleşme",
    description: "Yapay zeka destekli algoritmamız, marka ve influencer'ları en doğru şekilde eşleştirir.",
    gradient: "from-primary to-secondary",
  },
  {
    icon: BarChart3,
    title: "Performans Analizi",
    description: "Detaylı metrikler ve raporlarla kampanyalarınızın performansını takip edin.",
    gradient: "from-secondary to-accent",
  },
  {
    icon: Shield,
    title: "Güvenli İş Birlikleri",
    description: "Doğrulanmış profiller ve güvenli ödeme sistemleriyle huzurla çalışın.",
    gradient: "from-accent to-primary",
  },
  {
    icon: Eye,
    title: "Şeffaf Başarı Oranları",
    description: "Tüm influencer'ların geçmiş performanslarını ve başarı oranlarını görün.",
    gradient: "from-primary to-accent",
  },
];

export const FeaturesSection: React.FC = () => {
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
            Neden <span className="gradient-text">İNFUHUB?</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Influencer marketing'in geleceğini şekillendiren özellikler
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <ScrollStack
            useWindowScroll={true}
            itemDistance={150}
            itemScale={0.05}
            itemStackDistance={40}
            stackPosition="30%"
            scaleEndPosition="15%"
            baseScale={0.9}
            rotationAmount={2}
            blurAmount={2}
          >
            {features.map((feature, index) => (
              <ScrollStackItem key={feature.title}>
                <GlassCard glow="primary" className="h-full">
                  <div className="flex items-start gap-4">
                    <motion.div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0`}
                      whileHover={{ scale: 1.1, rotate: -5 }}
                    >
                      <feature.icon className="w-7 h-7 text-foreground" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </div>
      </div>
    </section>
  );
};
