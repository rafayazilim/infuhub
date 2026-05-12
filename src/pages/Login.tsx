import React, { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { LogIn, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "@/services/firebaseAuthService";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { user, userData } = await loginUser(formData.email, formData.password);

      // Kullanıcı onaylanmış mı kontrol et
      if (userData.status !== 'onaylandı') {
        setError('Hesabınız henüz onaylanmamış. Lütfen admin onayını bekleyin.');
        setIsLoading(false);
        return;
      }

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", user.uid);

      // Redirect based on user type
      if (userData.userType === "brand") {
        navigate("/marka/dashboard");
      } else if (userData.userType === "influencer") {
        navigate("/influencer/dashboard");
      }
    } catch (error: any) {
      console.error("Giriş hatası:", error);
      setError(error.message || "Giriş sırasında bir hata oluştu!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center relative overflow-hidden pt-24 pb-12">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <GlassCard hover={false} className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <LogIn className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Giriş Yap</h1>
                    <p className="text-muted-foreground text-sm">
                      Hesabınıza erişin
                    </p>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
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
                      "Giriş Yap"
                    )}
                  </GlowButton>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Henüz hesabınız yok mu?{" "}
                    <Link
                      to="/kayit-sec"
                      className="text-primary hover:underline font-semibold"
                    >
                      Kayıt Ol
                    </Link>
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;

