import React from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { UserPlus, Users, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Kayıt Ol",
    description: "Marka veya influencer olarak hızlıca kayıt olun ve profilinizi oluşturun.",
    color: "primary",
  },
  {
    icon: Users,
    title: "Eşleş",
    description: "Akıllı algoritmamız sizin için en uygun iş birliği ortaklarını bulur.",
    color: "secondary",
  },
  {
    icon: TrendingUp,
    title: "Performansını Artır",
    description: "Detaylı analizler ve önerilerle kampanya performansınızı maksimize edin.",
    color: "accent",
  },
];

const iconColors = {
  primary: "text-primary bg-primary/10",
  secondary: "text-secondary bg-secondary/10",
  accent: "text-accent bg-accent/10",
};

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Nasıl <span className="gradient-text">Çalışır?</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Sadece üç basit adımda influencer marketing yolculuğunuza başlayın
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <GlassCard
                glow={step.color as "primary" | "secondary" | "accent"}
                className="text-center h-full"
              >
                <div className="relative mb-6">
                  <motion.div
                    className={`w-16 h-16 rounded-2xl ${iconColors[step.color as keyof typeof iconColors]} flex items-center justify-center mx-auto`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <step.icon className="w-8 h-8" />
                  </motion.div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
