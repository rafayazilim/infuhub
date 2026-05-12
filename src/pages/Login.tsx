import React, { useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isUserVerified, loginUser, resendVerificationEmail } from "@/services/firebaseAuthService";
import { trackEvent } from "@/utils/metaPixel";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showResend, setShowResend] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("verification") === "sent") {
      setInfo("Doğrulama kodu e-posta adresinize gönderildi. Lütfen gelen kutunuzu ve spam klasörünü kontrol edin.");
    }
    if (params.get("verified") === "1") {
      setInfo("E-posta doğrulandı. Giriş yapabilirsiniz.");
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setShowResend(false);
    setIsLoading(true);

    try {
      const { user, userData } = await loginUser(formData.email, formData.password);
      const isApproved = isUserVerified((userData as any)?.status);

      trackEvent("Login");

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", user.uid);
      localStorage.setItem("isVerified", String(isApproved));

      if (userData.userType === "brand") {
        navigate("/marka/dashboard");
      } else if (userData.userType === "influencer") {
        navigate("/influencer/dashboard");
      }
    } catch (error: any) {
      console.error("Giriş hatası:", error);
      if (error?.message === "EMAIL_NOT_VERIFIED") {
        setError(
          "E-posta adresiniz henüz doğrulanmamış. Gelen kutunuza 6 haneli kodu girin veya aşağıdan kodu tekrar isteyin."
        );
        setShowResend(true);
      } else {
        setError(error.message || "Giriş sırasında bir hata oluştu!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsLoading(true);
      await resendVerificationEmail(formData.email, formData.password);
      setInfo("Doğrulama kodu tekrar gönderildi.");
    } catch (err: any) {
      setError(err.message || "Doğrulama e-postası gönderilemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-background px-4 py-8 md:py-14",
        "dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-[#0b1120]"
      )}
    >
      <div className="max-w-md mx-auto">
        <Link
          to="/"
          className={cn(
            "inline-flex items-center gap-2 text-sm mb-5 transition-colors",
            "text-muted-foreground hover:text-foreground",
            "dark:text-slate-400 dark:hover:text-[#6edff3]"
          )}
        >
          <ArrowLeft size={16} />
          Ana sayfa
        </Link>

        <Card
          className={cn(
            "p-6 md:p-7 rounded-2xl border shadow-sm",
            "border-border/70 bg-card",
            "dark:border-slate-500/55 dark:bg-slate-900/92",
            "dark:shadow-xl dark:shadow-black/45 dark:ring-1 dark:ring-white/[0.07]"
          )}
        >
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Giriş Yap</h1>
          <p className="text-sm text-muted-foreground dark:text-slate-400 mt-1 mb-6">
            Hesabınıza giriş yapın.
          </p>

          {info && (
            <div
              className={cn(
                "mb-5 p-3 rounded-xl border flex items-start gap-2",
                "border-emerald-200 bg-emerald-50",
                "dark:border-emerald-500/35 dark:bg-emerald-950/45"
              )}
            >
              <p className="text-sm text-emerald-800 dark:text-emerald-200">{info}</p>
            </div>
          )}

          {error && (
            <div
              className={cn(
                "mb-5 p-3 rounded-xl border flex items-start gap-2",
                "border-destructive/30 bg-destructive/10",
                "dark:border-red-500/40 dark:bg-red-950/40"
              )}
            >
              <AlertCircle className="w-4 h-4 text-destructive dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-destructive dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <FloatingInput
              label="E-posta Adresi"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <FloatingInput
              label="Şifre"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              autoComplete="current-password"
              showPasswordToggle
            />

            <div className="flex justify-end -mt-2">
              <Link
                to="/sifremi-unuttum"
                className={cn(
                  "text-sm font-medium text-[#08afd5] hover:underline",
                  "dark:text-[#6edff3]"
                )}
              >
                Şifremi unuttum
              </Link>
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full h-11 text-white brand-btn-primary",
                "ring-1 ring-[#08afd5]/35 ring-offset-2 ring-offset-background",
                "dark:ring-[#6edff3]/30 dark:ring-offset-slate-950"
              )}
              disabled={isLoading}
            >
              {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
            {showResend && (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-11 w-full",
                    "dark:border-slate-500/70 dark:bg-slate-900/50 dark:text-slate-100",
                    "dark:hover:bg-slate-800 dark:hover:text-white"
                  )}
                  onClick={handleResend}
                  disabled={isLoading}
                >
                  Kodu tekrar gönder
                </Button>
                <Link
                  to={`/email-dogrula?email=${encodeURIComponent(formData.email)}`}
                  className={cn(
                    "text-center text-sm font-medium text-[#08afd5] hover:underline",
                    "dark:text-[#6edff3]"
                  )}
                >
                  6 haneli kodu girmek için tıklayın
                </Link>
              </div>
            )}
          </form>

          <p className="text-sm text-muted-foreground dark:text-slate-400 text-center mt-6">
            Henüz hesabınız yok mu?{" "}
            <Link
              to="/kayit-sec"
              className={cn(
                "font-semibold text-foreground hover:underline",
                "dark:text-white dark:hover:text-[#6edff3]"
              )}
            >
              Kayıt Ol
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
