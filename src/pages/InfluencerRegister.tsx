import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { ParticleBackground } from "@/components/ui/ParticleBackground";
import { User, Check, ArrowLeft, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { registerInfluencer } from "@/services/firebaseAuthService";
import { uploadVerificationPhoto } from "@/services/firebaseStorageService";

const platforms = [
  { 
    id: "instagram", 
    name: "Instagram", 
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    )
  },
  { 
    id: "tiktok", 
    name: "TikTok", 
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
      </svg>
    )
  },
  { 
    id: "youtube", 
    name: "YouTube", 
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  },
  { 
    id: "twitter", 
    name: "Twitter/X", 
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  },
];

const categories = [
  "Moda",
  "Güzellik",
  "Teknoloji",
  "Oyun",
  "Yemek",
  "Seyahat",
  "Fitness",
  "Yaşam Tarzı",
  "Eğitim",
  "Eğlence",
];

const followerRanges = [
  "1K - 10K",
  "10K - 50K",
  "50K - 100K",
  "100K - 500K",
  "500K - 1M",
  "1M+",
];

const InfluencerRegister = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    platforms: [] as { id: string; username: string }[],
    followerRange: "",
    categories: [] as string[],
    verificationPhoto: null as File | null,
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showUsernameInput, setShowUsernameInput] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const togglePlatform = (platformId: string) => {
    const platformExists = formData.platforms.find(p => p.id === platformId);
    
    if (platformExists) {
      setFormData((prev) => ({
        ...prev,
        platforms: prev.platforms.filter((p) => p.id !== platformId),
      }));
      setShowUsernameInput(null);
    } else {
      setShowUsernameInput(platformId);
    }
  };

  const addPlatformWithUsername = (platformId: string, username: string) => {
    if (username.trim()) {
      setFormData((prev) => ({
        ...prev,
        platforms: [...prev.platforms, { id: platformId, username: username.trim() }],
      }));
      setShowUsernameInput(null);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır!');
        return;
      }
      
      setFormData({ ...formData, verificationPhoto: file });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData({ ...formData, verificationPhoto: null });
    setPhotoPreview(null);
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : prev.categories.length < 3
        ? [...prev.categories, category]
        : prev.categories,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasyon
    if (formData.platforms.length === 0) {
      alert('En az bir platform seçmelisiniz!');
      return;
    }
    
    if (!formData.verificationPhoto) {
      alert('Kimlik doğrulama fotoğrafı yüklemeniz gerekiyor!');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Önce kullanıcıyı kaydet
      const { user } = await registerInfluencer(formData.email, formData.password, {
        fullName: formData.fullName,
        platforms: formData.platforms,
        followerRange: formData.followerRange,
        categories: formData.categories,
      });

      // Sonra doğrulama fotoğrafını yükle
      if (formData.verificationPhoto) {
        const photoURL = await uploadVerificationPhoto(user.uid, formData.verificationPhoto);
        
        // Fotoğraf URL'ini kullanıcı verisine ekle
        const { ref, update } = await import('firebase/database');
        const { database } = await import('@/config/firebase');
        await update(ref(database, `influencers/${user.uid}`), {
          verificationPhotoURL: photoURL,
        });
      }

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
                        <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center">
                          <User className="w-7 h-7 text-accent" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold">Influencer Kaydı</h1>
                          <p className="text-muted-foreground text-sm">
                            Profilinizi oluşturun ve fırsatları keşfedin
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-6">
                        <FloatingInput
                          label="Ad Soyad"
                          value={formData.fullName}
                          onChange={(e) =>
                            setFormData({ ...formData, fullName: e.target.value })
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

                        {/* Platform Select */}
                        <div className="space-y-3">
                          <label className="text-sm text-muted-foreground">
                            Platformlar (Birden fazla seçebilirsiniz)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {platforms.map((platform) => {
                              const isSelected = formData.platforms.some(p => p.id === platform.id);
                              const selectedPlatform = formData.platforms.find(p => p.id === platform.id);
                              
                              return (
                                <div key={platform.id} className="space-y-2">
                                  <motion.button
                                    type="button"
                                    className={`w-full px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 ${
                                      isSelected
                                        ? "bg-accent/20 text-accent border-2 border-accent"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted border-2 border-transparent"
                                    }`}
                                    onClick={() => togglePlatform(platform.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <span className={isSelected ? "text-accent" : "text-muted-foreground"}>
                                      {platform.logo}
                                    </span>
                                    <span className="flex-1 text-left">{platform.name}</span>
                                  </motion.button>
                                  
                                  {showUsernameInput === platform.id && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="flex gap-2 min-w-0">
                                        <input
                                          type="text"
                                          placeholder="Kullanıcı adı"
                                          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              addPlatformWithUsername(platform.id, e.currentTarget.value);
                                            }
                                          }}
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            addPlatformWithUsername(platform.id, input.value);
                                          }}
                                          className="shrink-0 px-3 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors text-sm font-medium whitespace-nowrap"
                                        >
                                          Ekle
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                  
                                  {isSelected && selectedPlatform && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="text-xs text-muted-foreground px-2"
                                    >
                                      @{selectedPlatform.username}
                                    </motion.div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Follower Count */}
                        <div className="space-y-3">
                          <label className="text-sm text-muted-foreground">
                            Takipçi Sayısı
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {followerRanges.map((range) => (
                              <motion.button
                                key={range}
                                type="button"
                                className={`px-3 py-2 rounded-lg text-xs transition-all ${
                                  formData.followerRange === range
                                    ? "bg-secondary text-secondary-foreground"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                }`}
                                onClick={() =>
                                  setFormData({ ...formData, followerRange: range })
                                }
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {range}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {/* Content Categories */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-sm text-muted-foreground">
                              İçerik Kategorileri
                            </label>
                            <span className="text-xs text-muted-foreground">
                              {formData.categories.length}/3 seçildi
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {categories.map((category) => (
                              <motion.button
                                key={category}
                                type="button"
                                className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                                  formData.categories.includes(category)
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                } ${
                                  formData.categories.length >= 3 &&
                                  !formData.categories.includes(category)
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                onClick={() => toggleCategory(category)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={
                                  formData.categories.length >= 3 &&
                                  !formData.categories.includes(category)
                                }
                              >
                                {category}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {/* Verification Photo Upload */}
                        <div className="space-y-3">
                          <label className="text-sm text-muted-foreground">
                            Kimlik Doğrulama Fotoğrafı *
                          </label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Kimliğinizi ve hesabınızla birlikte çekilmiş bir fotoğraf yükleyin
                          </p>
                          
                          {!photoPreview ? (
                            <label className="block">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                              />
                              <motion.div
                                className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 cursor-pointer hover:border-accent transition-colors"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                              >
                                <div className="flex flex-col items-center gap-3">
                                  <Upload className="w-10 h-10 text-muted-foreground" />
                                  <div className="text-center">
                                    <p className="text-sm font-medium">Fotoğraf Yükle</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      JPG, PNG (Max. 5MB)
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            </label>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative rounded-xl overflow-hidden border-2 border-accent"
                            >
                              <img
                                src={photoPreview}
                                alt="Doğrulama Fotoğrafı"
                                className="w-full h-48 object-cover"
                              />
                              <button
                                type="button"
                                onClick={removePhoto}
                                className="absolute top-2 right-2 w-8 h-8 bg-destructive rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                              >
                                <X className="w-4 h-4 text-destructive-foreground" />
                              </button>
                            </motion.div>
                          )}
                        </div>

                        <GlowButton
                          type="submit"
                          variant="accent"
                          size="lg"
                          className="w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <motion.div
                              className="w-6 h-6 border-2 border-accent-foreground border-t-transparent rounded-full"
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
                        <a href="#" className="text-accent hover:underline">
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
                        Tebrikler! 🎉
                      </motion.h2>

                      <motion.p
                        className="text-muted-foreground mb-8"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        Profiliniz oluşturuldu! E-posta adresinize doğrulama linki gönderdik.
                      </motion.p>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                      >
                        <Link to="/">
                          <GlowButton variant="accent" size="lg">
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

export default InfluencerRegister;
