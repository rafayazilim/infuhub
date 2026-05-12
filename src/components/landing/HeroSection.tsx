import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GlowButton } from "@/components/ui/GlowButton";
import { ParticleBackground } from "@/components/ui/ParticleBackground";

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <ParticleBackground particleCount={40} />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Markalar & Influencer'lar için{" "}
            <span className="gradient-text">Akıllı Eşleşme</span> Platformu
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            İNFUHUB ile doğru marka, doğru influencer, maksimum etki. Kampanya 
            başarı oranınızı artırın, marka bilinirliğinizi güçlendirin.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link to="/kayit/marka">
              <GlowButton variant="primary" size="xl" className="group min-w-[220px]">
                <span className="flex items-center gap-2">
                  Marka Olarak Katıl
                </span>
              </GlowButton>
            </Link>
            <Link to="/kayit/influencer">
              <GlowButton variant="outline" size="xl" className="group min-w-[220px]">
                <span className="flex items-center gap-2">
                  Influencer Olarak Katıl
                </span>
              </GlowButton>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
