import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Building2, User, ArrowRight } from "lucide-react";
import { ParticleBackground } from "@/components/ui/ParticleBackground";

const RegistrationSelect = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center relative overflow-hidden pt-20">
        <ParticleBackground particleCount={30} />
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Nasıl <span className="gradient-text">Katılmak</span> İstersiniz?
            </h1>
            <p className="text-muted-foreground">
              Size en uygun profil türünü seçin ve hemen başlayın
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Brand Card */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link to="/kayit/marka">
                <motion.div
                  className="glass-card rounded-3xl p-8 h-full cursor-pointer group relative overflow-hidden"
                  whileHover={{ 
                    scale: 1.02, 
                    boxShadow: "0 0 40px hsl(210 100% 55% / 0.3)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Glow effect on hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: "radial-gradient(circle at center, hsl(210 100% 55% / 0.1) 0%, transparent 70%)",
                    }}
                  />
                  
                  <div className="relative z-10">
                    <motion.div
                      className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 mx-auto"
                      whileHover={{ rotate: 5, scale: 1.1 }}
                    >
                      <Building2 className="w-10 h-10 text-primary" />
                    </motion.div>

                    <h2 className="text-2xl font-bold text-center mb-4">Marka</h2>
                    
                    <p className="text-muted-foreground text-center mb-8">
                      Markanızı büyütmek için doğru influencer'ları bulun. Kampanyalarınızı 
                      yönetin ve performansınızı takip edin.
                    </p>

                    <div className="flex items-center justify-center gap-2 text-primary font-semibold group-hover:gap-4 transition-all">
                      <span>Devam Et</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Border glow */}
                  <motion.div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      border: "2px solid hsl(210 100% 55% / 0.5)",
                    }}
                  />
                </motion.div>
              </Link>
            </motion.div>

            {/* Influencer Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link to="/kayit/influencer">
                <motion.div
                  className="glass-card rounded-3xl p-8 h-full cursor-pointer group relative overflow-hidden"
                  whileHover={{ 
                    scale: 1.02, 
                    boxShadow: "0 0 40px hsl(195 85% 55% / 0.3)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Glow effect on hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: "radial-gradient(circle at center, hsl(195 85% 55% / 0.1) 0%, transparent 70%)",
                    }}
                  />
                  
                  <div className="relative z-10">
                    <motion.div
                      className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center mb-6 mx-auto"
                      whileHover={{ rotate: -5, scale: 1.1 }}
                    >
                      <User className="w-10 h-10 text-accent" />
                    </motion.div>

                    <h2 className="text-2xl font-bold text-center mb-4">Influencer</h2>
                    
                    <p className="text-muted-foreground text-center mb-8">
                      İçeriklerinizi markalarla buluşturun. Yeni iş birlikleri keşfedin 
                      ve gelirlerinizi artırın.
                    </p>

                    <div className="flex items-center justify-center gap-2 text-accent font-semibold group-hover:gap-4 transition-all">
                      <span>Devam Et</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Border glow */}
                  <motion.div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      border: "2px solid hsl(195 85% 55% / 0.5)",
                    }}
                  />
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RegistrationSelect;
