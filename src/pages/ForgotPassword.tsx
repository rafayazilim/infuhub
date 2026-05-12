import React, { useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPasswordLiveFeedback, isPasswordPolicySatisfied, validatePasswordPolicy } from "@/lib/passwordPolicy";
import {
  completePasswordReset,
  requestPasswordResetCode,
  verifyPasswordResetCode,
} from "@/services/passwordResetApi";

type Step = "email" | "code" | "password" | "done";

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const newPasswordFeedback = getPasswordLiveFeedback(newPassword);

  const clearMessages = () => {
    setError("");
    setInfo("");
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim()) {
      setError("E-posta adresinizi girin.");
      return;
    }
    setLoading(true);
    try {
      const { ok, message } = await requestPasswordResetCode(email);
      if (ok) {
        setInfo(message);
        setStep("code");
        setCode("");
      } else {
        setError(message);
      }
    } catch {
      setError("Sunucuya bağlanılamadı. Ağınızı ve API adresini kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const digits = code.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) {
      setError("6 haneli kodu girin.");
      return;
    }
    setLoading(true);
    try {
      const { ok, message, resetToken: token } = await verifyPasswordResetCode(email, digits);
      if (ok && token) {
        setResetToken(token);
        setInfo(message);
        setStep("password");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(message);
      }
    } catch {
      setError("Doğrulama sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!resetToken) {
      setError("Oturum geçersiz. Baştan başlayın.");
      setStep("email");
      return;
    }
    const pwCheck = validatePasswordPolicy(newPassword);
    if (!pwCheck.ok) {
      setError(pwCheck.message);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      const { ok, message } = await completePasswordReset(resetToken, newPassword);
      if (ok) {
        setInfo(message);
        setStep("done");
        setResetToken(null);
      } else {
        setError(message);
      }
    } catch {
      setError("Şifre güncellenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    clearMessages();
    setLoading(true);
    try {
      const { ok, message } = await requestPasswordResetCode(email);
      if (ok) {
        setInfo(message);
      } else {
        setError(message);
      }
    } catch {
      setError("Kod gönderilemedi.");
    } finally {
      setLoading(false);
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
          to="/giris"
          className={cn(
            "inline-flex items-center gap-2 text-sm mb-5 transition-colors",
            "text-muted-foreground hover:text-foreground",
            "dark:text-slate-400 dark:hover:text-[#6edff3]"
          )}
        >
          <ArrowLeft size={16} />
          Girişe dön
        </Link>

        <Card
          className={cn(
            "p-6 md:p-7 rounded-2xl border shadow-sm",
            "border-border/70 bg-card",
            "dark:border-slate-500/55 dark:bg-slate-900/92",
            "dark:shadow-xl dark:shadow-black/45 dark:ring-1 dark:ring-white/[0.07]"
          )}
        >
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Şifremi unuttum</h1>
          <p className="text-sm text-muted-foreground dark:text-slate-400 mt-1 mb-6">
            {step === "email" && "Hesabınıza kayıtlı e-posta adresini girin; size doğrulama kodu gönderelim."}
            {step === "code" && "E-postanıza gelen 6 haneli kodu girin."}
            {step === "password" && "Yeni şifrenizi belirleyin."}
            {step === "done" && "İşlem tamamlandı."}
          </p>

          {info && step !== "done" && (
            <div
              className={cn(
                "mb-5 p-3 rounded-xl border",
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

          {step === "email" && (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <FloatingInput
                label="E-posta Adresi"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <Button
                type="submit"
                className={cn(
                  "w-full h-11 text-white brand-btn-primary",
                  "ring-1 ring-[#08afd5]/35 ring-offset-2 ring-offset-background",
                  "dark:ring-[#6edff3]/30 dark:ring-offset-slate-950"
                )}
                disabled={loading}
              >
                {loading ? "Gönderiliyor..." : "Doğrulama kodu gönder"}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <FloatingInput
                label="6 haneli kod"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                required
              />
              <Button
                type="submit"
                className={cn(
                  "w-full h-11 text-white brand-btn-primary",
                  "ring-1 ring-[#08afd5]/35 ring-offset-2 ring-offset-background",
                  "dark:ring-[#6edff3]/30 dark:ring-offset-slate-950"
                )}
                disabled={loading || code.replace(/\D/g, "").length !== 6}
              >
                {loading ? "Kontrol ediliyor..." : "Kodu doğrula"}
              </Button>
              <Button type="button" variant="outline" className="w-full h-11" disabled={loading} onClick={handleResend}>
                Kodu tekrar gönder
              </Button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleSetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <FloatingInput
                  label="Yeni şifre"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  showPasswordToggle
                />
                <p
                  className={cn(
                    "text-xs px-0.5",
                    newPasswordFeedback.variant === "neutral" && "text-muted-foreground",
                    newPasswordFeedback.variant === "warning" && "text-amber-700 dark:text-amber-400",
                    newPasswordFeedback.variant === "success" && "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {newPasswordFeedback.text}
                </p>
              </div>
              <FloatingInput
                label="Yeni şifre (tekrar)"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                showPasswordToggle
              />
              <Button
                type="submit"
                className={cn(
                  "w-full h-11 text-white brand-btn-primary",
                  "ring-1 ring-[#08afd5]/35 ring-offset-2 ring-offset-background",
                  "dark:ring-[#6edff3]/30 dark:ring-offset-slate-950"
                )}
                disabled={loading || !isPasswordPolicySatisfied(newPassword)}
              >
                {loading ? "Kaydediliyor..." : "Şifreyi güncelle"}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-4">
              <div
                className={cn(
                  "p-3 rounded-xl border",
                  "border-emerald-200 bg-emerald-50",
                  "dark:border-emerald-500/35 dark:bg-emerald-950/45"
                )}
              >
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  Şifreniz güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.
                </p>
              </div>
              <Button asChild className="w-full h-11 brand-btn-primary text-white">
                <Link to="/giris">Giriş sayfasına git</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
