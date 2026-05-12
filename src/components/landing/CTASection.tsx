import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GlowButton } from "@/components/ui/GlowButton";
import { ArrowRight, Sparkles } from "lucide-react";
import Particles from "@/components/ui/Particles";

export const CTASection: React.FC = () => {
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
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 mb-6"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Influencer Marketing'in Geleceği</span>
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Hemen <span className="gradient-text">Katılın</span> ve Farkı Yaşayın
          </h2>

          <p className="text-lg text-muted-foreground mb-10">
            Binlerce marka ve influencer'ın tercih ettiği platformda yerinizi alın. 
            İlk kampanyanızı dakikalar içinde başlatın.
          </p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/kayit-sec">
              <GlowButton variant="primary" size="xl" className="group">
                Hemen Kayıt Ol
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </GlowButton>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
