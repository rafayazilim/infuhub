import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { ParticleBackground } from "@/components/ui/ParticleBackground";
import { Building2, Check, Globe, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { registerBrand } from "@/services/firebaseAuthService";

const industries = [
  "Teknoloji",
  "Moda & Güzellik",
  "Yiyecek & İçecek",
  "Sağlık & Fitness",
  "Seyahat",
  "Eğitim",
  "Finans",
  "Otomotiv",
  "Eğlence",
  "Diğer",
];

const budgetLabels = ["₺5.000", "₺25.000", "₺50.000", "₺100.000", "₺250.000+"];

const BrandRegister = () => {
  const [formData, setFormData] = useState({
    brandName: "",
    email: "",
    password: "",
    industry: "",
    budget: 2,
    website: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await registerBrand(formData.email, formData.password, {
        brandName: formData.brandName,
        industry: formData.industry,
        budget: formData.budget,
        website: formData.website,
      });

      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Kayıt hatası:', error);
      alert(error.message || 'Kayıt sırasında bir hata oluştu!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center relative overflow-hidden pt-24 pb-12">
        <ParticleBackground particleCount={25} />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-lg mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link
                to="/kayit-sec"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Geri</span>
              </Link>

              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <GlassCard hover={false} className="p-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                          <Building2 className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold">Marka Kaydı</h1>
                          <p className="text-muted-foreground text-sm">
                            Bilgilerinizi doldurun ve başlayın
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-6">
                        <FloatingInput
                          label="Marka Adı"
                          value={formData.brandName}
                          onChange={(e) =>
                            setFormData({ ...formData, brandName: e.target.value })
                          }
                          required
                        />

                        <FloatingInput
                          label="E-posta Adresi"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          required
                        />

                        <FloatingInput
                          label="Şifre"
                          type="password"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          required
                        />

                        {/* Industry Select */}
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Sektör</label>
                          <div className="grid grid-cols-2 gap-2">
                            {industries.map((industry) => (
                              <motion.button
                                key={industry}
                                type="button"
                                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                                  formData.industry === industry
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                }`}
                                onClick={() =>
                                  setFormData({ ...formData, industry })
                                }
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {industry}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {/* Budget Slider */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-sm text-muted-foreground">
                              Aylık Pazarlama Bütçesi
                            </label>
                            <span className="text-primary font-semibold">
                              {budgetLabels[formData.budget]}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="4"
                            value={formData.budget}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                budget: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>₺5.000</span>
                            <span>₺250.000+</span>
                          </div>
                        </div>

                        <div className="relative">
                          <FloatingInput
                            label="Website (Opsiyonel)"
                            value={formData.website}
                            onChange={(e) =>
                              setFormData({ ...formData, website: e.target.value })
                            }
                          />
                          <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        </div>

                        <GlowButton
                          type="submit"
                          variant="primary"
                          size="lg"
                          className="w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <motion.div
                              className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                          ) : (
                            "Kayıt Ol"
                          )}
                        </GlowButton>
                      </form>

                      <p className="text-center text-sm text-muted-foreground mt-6">
                        Zaten hesabınız var mı?{" "}
                        <a href="#" className="text-primary hover:underline">
                          Giriş Yapın
                        </a>
                      </p>
                    </GlassCard>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <GlassCard hover={false} className="p-12">
                      <motion.div
                        className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 15,
                          delay: 0.2,
                        }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          <Check className="w-12 h-12 text-accent" />
                        </motion.div>
                      </motion.div>

                      <motion.h2
                        className="text-2xl font-bold mb-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        Kayıt Başarılı!
                      </motion.h2>

                      <motion.p
                        className="text-muted-foreground mb-8"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        Hoş geldiniz! E-posta adresinize doğrulama linki gönderdik.
                      </motion.p>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                      >
                        <Link to="/">
                          <GlowButton variant="primary" size="lg">
                            Ana Sayfaya Dön
                          </GlowButton>
                        </Link>
                      </motion.div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BrandRegister;
