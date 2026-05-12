import React, { useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerBrand } from "@/services/firebaseAuthService";
import {
  registerCardShell,
  registerSubmitClass,
  registerSuccessBanner,
} from "@/lib/registerFormUi";
import { cn } from "@/lib/utils";
import { getPasswordLiveFeedback, isPasswordPolicySatisfied } from "@/lib/passwordPolicy";
import { RegisterLegalConsents } from "@/components/shared/RegisterLegalConsents";
import {
  areRegisterLegalConsentsComplete,
  initialRegisterLegalConsentState,
} from "@/constants/registerLegalContent";
import { BRAND_UNVAN_OPTIONS } from "@/constants/brandFormOptions";
import { RegisterCategoryFields } from "@/components/shared/RegisterCategoryFields";
import { trackEvent } from "@/utils/metaPixel";

const budgetLabels = ["₺5.000", "₺25.000", "₺50.000", "₺100.000", "₺250.000+"];

const unvanOptions = [...BRAND_UNVAN_OPTIONS];

type Step = 1 | 2;

const BrandRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [responsible, setResponsible] = useState({
    firstName: "",
    lastName: "",
    title: "",
    phone: "",
  });
  const [formData, setFormData] = useState({
    brandName: "",
    email: "",
    password: "",
    categories: [] as string[],
    subCategories: {} as Record<string, string[]>,
    budget: 2,
    website: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [legalConsents, setLegalConsents] = useState(initialRegisterLegalConsentState);

  const passwordFeedback = getPasswordLiveFeedback(formData.password);

  const handleResponsibleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsible.firstName.trim() || !responsible.lastName.trim()) {
      alert("Lütfen isim ve soyisim girin.");
      return;
    }
    if (!responsible.title) {
      alert("Lütfen unvan seçin.");
      return;
    }
    const phoneDigits = responsible.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      alert("Lütfen geçerli bir telefon numarası girin (en az 10 hane).");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areRegisterLegalConsentsComplete(legalConsents)) {
      alert("Kayıt için tüm yasal metinleri okuyup onaylamanız gerekir.");
      return;
    }
    if (formData.categories.length === 0) {
      alert("En az bir üst kategori seçmelisiniz (influencer kaydı ile aynı kategori listesi).");
      return;
    }
    if (!isPasswordPolicySatisfied(formData.password)) {
      return;
    }
    setIsLoading(true);

    try {
      const now = new Date().toISOString();
      const cats = formData.categories;
      const subs = formData.subCategories;
      await registerBrand(formData.email, formData.password, {
        brandName: formData.brandName,
        industry: cats[0] ?? "",
        categories: cats.length ? cats : undefined,
        subCategories: Object.keys(subs).length ? subs : undefined,
        budget: formData.budget,
        website: formData.website,
        sorumlular: {
          birincil: {
            firstName: responsible.firstName.trim(),
            lastName: responsible.lastName.trim(),
            title: responsible.title,
            phone: responsible.phone.trim(),
            createdAt: now,
          },
        },
      });
      trackEvent("CompleteRegistration");
      setSuccessMessage(
        "Kayıt başarılı. E-posta adresinize 6 haneli doğrulama kodu gönderildi. Kodu girip ardından giriş yapabilirsiniz."
      );
      navigate(`/email-dogrula?email=${encodeURIComponent(formData.email)}`);
    } catch (error: unknown) {
      console.error("Kayıt hatası:", error);
      const msg = error instanceof Error ? error.message : "Kayıt sırasında bir hata oluştu!";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-14">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/kayit-sec"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5"
        >
          <ArrowLeft size={16} />
          Kayıt türü seçimi
        </Link>

        <Card className={registerCardShell}>
          <div className="flex items-center gap-3 mb-6">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "bg-muted text-foreground",
                "dark:bg-slate-800/90 dark:text-[#6edff3] dark:ring-1 dark:ring-slate-500/70"
              )}
            >
              <Building2 size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Marka Kaydı</h1>
              <p className="text-sm text-muted-foreground">
                {step === 1
                  ? "Önce marka sorumlusu bilgilerini girin."
                  : "Marka bilgilerinizi ve hesabınızı tamamlayın."}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-6 text-xs text-muted-foreground">
            <span
              className={cn(
                "px-2 py-1 rounded-md border",
                step === 1 ? "border-primary text-foreground font-medium" : "border-border"
              )}
            >
              1 · Sorumlu
            </span>
            <span
              className={cn(
                "px-2 py-1 rounded-md border",
                step === 2 ? "border-primary text-foreground font-medium" : "border-border"
              )}
            >
              2 · Marka
            </span>
          </div>

          {successMessage && <div className={registerSuccessBanner}>{successMessage}</div>}

          {step === 1 ? (
            <form onSubmit={handleResponsibleContinue} className="space-y-5">
              <FloatingInput
                label="İsim"
                value={responsible.firstName}
                onChange={(e) => setResponsible({ ...responsible, firstName: e.target.value })}
                required
                autoComplete="given-name"
              />
              <FloatingInput
                label="Soyisim"
                value={responsible.lastName}
                onChange={(e) => setResponsible({ ...responsible, lastName: e.target.value })}
                required
                autoComplete="family-name"
              />
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Unvan</label>
                <Select
                  value={responsible.title || undefined}
                  onValueChange={(v) => setResponsible({ ...responsible, title: v })}
                >
                  <SelectTrigger className="h-12 rounded-lg border-2 border-border/90 dark:border-slate-500/50 bg-background">
                    <SelectValue placeholder="Unvan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {unvanOptions.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FloatingInput
                label="Telefon numarası"
                type="tel"
                value={responsible.phone}
                onChange={(e) => setResponsible({ ...responsible, phone: e.target.value })}
                placeholder="+90 5xx xxx xx xx"
                required
                autoComplete="tel"
              />
              <button
                type="submit"
                className={cn(
                  registerSubmitClass,
                  "rounded-lg disabled:opacity-50 disabled:pointer-events-none w-full"
                )}
              >
                Kaydet ve devam et
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Sorumlu bilgilerine dön
              </button>

              <FloatingInput
                label="Marka Adı"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                required
              />

              <FloatingInput
                label="E-posta Adresi"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <div className="space-y-1.5">
                <FloatingInput
                  label="Şifre"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="new-password"
                  showPasswordToggle
                />
                <p
                  className={cn(
                    "text-xs px-0.5",
                    passwordFeedback.variant === "neutral" && "text-muted-foreground",
                    passwordFeedback.variant === "warning" && "text-amber-700 dark:text-amber-400",
                    passwordFeedback.variant === "success" && "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {passwordFeedback.text}
                </p>
              </div>

              <RegisterCategoryFields
                value={{
                  categories: formData.categories,
                  subCategories: formData.subCategories,
                }}
                onChange={(next) =>
                  setFormData((prev) => ({
                    ...prev,
                    categories: next.categories,
                    subCategories: next.subCategories,
                  }))
                }
              />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-muted-foreground">Aylık Pazarlama Bütçesi</label>
                  <span className="text-sm font-medium">{budgetLabels[formData.budget]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      budget: parseInt(e.target.value, 10),
                    })
                  }
                  className="register-range-input"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₺5.000</span>
                  <span>₺250.000+</span>
                </div>
              </div>

              <FloatingInput
                label="Website (Opsiyonel)"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />

              <RegisterLegalConsents value={legalConsents} onChange={setLegalConsents} />

              <button
                type="submit"
                className={cn(
                  registerSubmitClass,
                  "rounded-lg disabled:opacity-50 disabled:pointer-events-none"
                )}
                disabled={
                  isLoading ||
                  !areRegisterLegalConsentsComplete(legalConsents) ||
                  !isPasswordPolicySatisfied(formData.password)
                }
              >
                {isLoading ? "Kayıt oluşturuluyor..." : "Kayıt ol ve doğrulama e-postası gönder"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Zaten hesabınız var mı?{" "}
            <Link to="/giris" className="font-medium text-foreground hover:underline">
              Giriş Yap
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default BrandRegister;
