import React, { useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { resendVerificationEmail, verifyRegistrationEmail } from "@/services/firebaseAuthService";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [resendPassword, setResendPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const digits = code.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) {
      setError("Lütfen e-postadaki 6 haneli kodu girin.");
      return;
    }
    setIsLoading(true);
    try {
      await verifyRegistrationEmail(email.trim(), digits);
      setInfo("E-posta doğrulandı. Giriş sayfasına yönlendiriliyorsunuz.");
      setTimeout(() => navigate("/giris?verified=1"), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Doğrulama başarısız.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setInfo("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Yeni kod için e-posta adresini girin.");
      return;
    }
    if (!resendPassword) {
      setError("Yeni kod göndermek için kayıt şifrenizi girin.");
      return;
    }
    setIsResending(true);
    try {
      await resendVerificationEmail(trimmedEmail, resendPassword);
      setCode("");
      setInfo(
        "Yeni doğrulama kodu e-posta adresinize gönderildi. Önceki kod artık geçerli değildir. Gelen kutunuzu ve spam klasörünü kontrol edin."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kod gönderilemedi.";
      setError(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-background px-4 py-8 md:py-14",
        "dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-[#0b1120]"
      )}
    >
      <div className="mx-auto max-w-md">
        <Link
          to="/giris"
          className={cn(
            "mb-5 inline-flex items-center gap-2 text-sm transition-colors",
            "text-muted-foreground hover:text-foreground",
            "dark:text-slate-400 dark:hover:text-[#6edff3]"
          )}
        >
          <ArrowLeft size={16} />
          Giriş
        </Link>

        <Card
          className={cn(
            "rounded-2xl border p-6 shadow-sm md:p-7",
            "border-border/70 bg-card",
            "dark:border-slate-500/55 dark:bg-slate-900/92",
            "dark:shadow-xl dark:shadow-black/45 dark:ring-1 dark:ring-white/[0.07]"
          )}
        >
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">E-posta doğrulama</h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-slate-400">
            Kayıtta kullandığınız adrese gönderilen 6 haneli kodu girin.
          </p>

          {info && (
            <div
              className={cn(
                "mb-5 mt-4 rounded-xl border p-3",
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
                "mb-5 mt-4 flex items-start gap-2 rounded-xl border p-3",
                "border-destructive/30 bg-destructive/10",
                "dark:border-red-500/40 dark:bg-red-950/40"
              )}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive dark:text-red-400" />
              <p className="text-sm text-destructive dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <FloatingInput
              label="E-posta"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <FloatingInput
              label="6 haneli kod"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              placeholder="000000"
            />
            <Button
              type="submit"
              className={cn(
                "h-11 w-full text-white brand-btn-primary",
                "ring-1 ring-[#08afd5]/35 ring-offset-2 ring-offset-background",
                "dark:ring-[#6edff3]/30 dark:ring-offset-slate-950"
              )}
              disabled={isLoading || isResending}
            >
              {isLoading ? "Doğrulanıyor..." : "Doğrula"}
            </Button>
          </form>

          <div
            className={cn(
              "mt-8 border-t pt-6",
              "border-border/60 dark:border-slate-600/50"
            )}
          >
            <p className="text-sm font-medium text-foreground dark:text-slate-200">Kodu tekrar gönder</p>
            <p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">
              Yeni kod istendiğinde sunucudaki doğrulama kaydı yenilenir; önceki kod kullanılamaz.
            </p>
            <div className="mt-4 space-y-3">
              <FloatingInput
                label="Kayıt şifreniz"
                type="password"
                value={resendPassword}
                onChange={(e) => setResendPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isResending}
              />
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-11 w-full border-[#08afd5]/50 text-[#08afd5] hover:bg-[#08afd5]/10",
                  "dark:border-[#6edff3]/40 dark:text-[#6edff3] dark:hover:bg-[#6edff3]/10"
                )}
                disabled={isLoading || isResending}
                onClick={() => void handleResendCode()}
              >
                {isResending ? "Gönderiliyor..." : "Kodu tekrar gönder"}
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground dark:text-slate-400">
            Alternatif: Giriş sayfasından da aynı işlemi yapabilirsiniz.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
