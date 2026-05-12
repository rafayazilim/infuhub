import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { registerInfluencer } from "@/services/firebaseAuthService";
import {
  registerCardShell,
  registerInlineInput,
  registerSelectChip,
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
import { RegisterCategoryFields } from "@/components/shared/RegisterCategoryFields";
import { REGISTRATION_PLATFORM_DEFS } from "@/constants/registrationPlatforms";
import { RegistrationPlatformIcon } from "@/components/shared/RegistrationPlatformIcon";
import { trackEvent } from "@/utils/metaPixel";

const platforms = REGISTRATION_PLATFORM_DEFS.map((def) => ({
  id: def.id,
  name: def.label,
  logo: <RegistrationPlatformIcon platformId={def.id} size={20} className="shrink-0" />,
}));

const followerRanges = ["1K - 10K", "10K - 50K", "50K - 100K", "100K - 500K", "500K - 1M", "1M+"];

/** Tüm platformlardaki takipçi toplamına göre `followerRanges` içinden etiket */
function followerTotalToRangeLabel(total: number): string {
  if (total <= 0) return "";
  if (total < 10_000) return "1K - 10K";
  if (total < 50_000) return "10K - 50K";
  if (total < 100_000) return "50K - 100K";
  if (total < 500_000) return "100K - 500K";
  if (total < 1_000_000) return "500K - 1M";
  return "1M+";
}

const InfluencerRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    platforms: [] as { id: string; username: string; followers: number }[],
    followerRange: "",
    categories: [] as string[],
    subCategories: {} as Record<string, string[]>,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showUsernameInput, setShowUsernameInput] = useState<string | null>(null);
  const [platformAddDraft, setPlatformAddDraft] = useState({ username: "", followers: "" });
  const [successMessage, setSuccessMessage] = useState("");
  const [legalConsents, setLegalConsents] = useState(initialRegisterLegalConsentState);

  const passwordFeedback = getPasswordLiveFeedback(formData.password);

  const totalPlatformFollowers = useMemo(
    () => formData.platforms.reduce((sum, p) => sum + (Number(p.followers) || 0), 0),
    [formData.platforms]
  );

  useEffect(() => {
    const nextRange = followerTotalToRangeLabel(totalPlatformFollowers);
    setFormData((prev) =>
      prev.followerRange === nextRange ? prev : { ...prev, followerRange: nextRange }
    );
  }, [totalPlatformFollowers]);

  useEffect(() => {
    if (showUsernameInput) {
      setPlatformAddDraft({ username: "", followers: "" });
    }
  }, [showUsernameInput]);

  const togglePlatform = (platformId: string) => {
    const platformExists = formData.platforms.find((p) => p.id === platformId);

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

  const parseFollowersInput = (raw: string): number => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return NaN;
    const n = parseInt(digits, 10);
    return Number.isNaN(n) ? NaN : n;
  };

  const addPlatformWithDetails = (platformId: string) => {
    const username = platformAddDraft.username.trim();
    const followers = parseFollowersInput(platformAddDraft.followers);
    if (!username) {
      alert("Kullanıcı adı girin.");
      return;
    }
    if (Number.isNaN(followers) || followers < 0) {
      alert("Geçerli bir takipçi sayısı girin.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      platforms: [...prev.platforms, { id: platformId, username, followers }],
    }));
    setShowUsernameInput(null);
    setPlatformAddDraft({ username: "", followers: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.platforms.length === 0) {
      alert("En az bir platform seçmelisiniz!");
      return;
    }

    const phoneTrim = formData.phone.trim();
    if (!phoneTrim) {
      alert("Telefon numarası girin.");
      return;
    }

    if (!areRegisterLegalConsentsComplete(legalConsents)) {
      alert("Kayıt için tüm yasal metinleri okuyup onaylamanız gerekir.");
      return;
    }
    if (!isPasswordPolicySatisfied(formData.password)) {
      return;
    }

    setIsLoading(true);

    try {
      await registerInfluencer(formData.email, formData.password, {
        fullName: formData.fullName,
        phone: phoneTrim,
        platforms: formData.platforms.map((p) => ({
          id: p.id,
          username: p.username,
          followers: Math.max(0, Number(p.followers) || 0),
        })),
        followerRange: formData.followerRange,
        categories: formData.categories,
        subCategories: formData.subCategories,
      });
      trackEvent("CompleteRegistration");
      setSuccessMessage(
        "Kayıt başarılı. E-posta adresinize 6 haneli doğrulama kodu gönderildi. Kodu girip ardından giriş yapabilirsiniz."
      );
      navigate(`/email-dogrula?email=${encodeURIComponent(formData.email)}`);
    } catch (error: any) {
      console.error("Kayıt hatası:", error);
      alert(error.message || "Kayıt sırasında bir hata oluştu!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-14">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/kayit-sec"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5"
        >
          <ArrowLeft size={16} />
          Kayıt türü seçimi
        </Link>

        <Card className={registerCardShell}>
            <h1 className="text-2xl font-semibold mb-1 text-foreground">Influencer Kaydı</h1>
            <p className="text-sm text-muted-foreground mb-6">Profilinizi oluşturmak için formu doldurun.</p>

            {successMessage && <div className={registerSuccessBanner}>{successMessage}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <FloatingInput
                label="Ad Soyad"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />

              <FloatingInput
                label="E-posta Adresi"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <FloatingInput
                label="Telefon Numarası"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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

              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">Platformlar (birden fazla seçilebilir)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {platforms.map((platform) => {
                    const isSelected = formData.platforms.some((p) => p.id === platform.id);
                    const selectedPlatform = formData.platforms.find((p) => p.id === platform.id);

                    return (
                      <div key={platform.id} className="space-y-2">
                        <button
                          type="button"
                          className={registerSelectChip(isSelected, { variant: "platform" })}
                          onClick={() => togglePlatform(platform.id)}
                        >
                          <span>{platform.logo}</span>
                          <span className="flex-1 text-left">{platform.name}</span>
                        </button>

                        {showUsernameInput === platform.id && (
                          <div className="space-y-2 min-w-0">
                            <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                              <input
                                type="text"
                                placeholder="Kullanıcı adı"
                                className={registerInlineInput}
                                value={platformAddDraft.username}
                                onChange={(e) =>
                                  setPlatformAddDraft((d) => ({ ...d, username: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addPlatformWithDetails(platform.id);
                                  }
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Takipçi sayısı"
                                className={registerInlineInput}
                                value={platformAddDraft.followers}
                                onChange={(e) =>
                                  setPlatformAddDraft((d) => ({
                                    ...d,
                                    followers: e.target.value.replace(/\D/g, ""),
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addPlatformWithDetails(platform.id);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                className="brand-btn-primary text-white border-2 border-[#08afd5]/40 dark:border-[#6edff3]/30 shrink-0"
                                onClick={() => addPlatformWithDetails(platform.id)}
                              >
                                Ekle
                              </Button>
                            </div>
                            {platform.id === "instagram" &&
                              platformAddDraft.followers !== "" &&
                              !Number.isNaN(parseFollowersInput(platformAddDraft.followers)) &&
                              parseFollowersInput(platformAddDraft.followers) < 1000 && (
                                <p className="text-xs text-amber-700 dark:text-amber-400 px-0.5">
                                  Instagram hesabında 1.000&apos;in altında takipçi görünüyor. Başvurunuz
                                  değerlendirilirken bu dikkate alınabilir.
                                </p>
                              )}
                          </div>
                        )}

                        {isSelected && selectedPlatform && (
                          <p className="text-xs text-muted-foreground px-1">
                            @{selectedPlatform.username} ·{" "}
                            {(selectedPlatform.followers ?? 0).toLocaleString("tr-TR")} takipçi
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Takipçi Sayısı</label>
                  <p className="text-xs text-muted-foreground/90 mt-1 leading-relaxed">
                    Aşağıdaki aralık, platform satırlarına girdiğiniz takipçi sayılarının toplamına göre
                    otomatik belirlenir
                    {totalPlatformFollowers > 0 ? (
                      <>
                        {" "}
                        (toplam{" "}
                        <span className="font-medium text-foreground/90">
                          {totalPlatformFollowers.toLocaleString("tr-TR")}
                        </span>
                        )
                      </>
                    ) : null}
                    .
                  </p>
                </div>
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                  role="status"
                  aria-live="polite"
                  aria-label="Otomatik takipçi aralığı"
                >
                  {followerRanges.map((range) => (
                    <div
                      key={range}
                      className={cn(
                        registerSelectChip(formData.followerRange === range, {
                          className: "text-xs py-2",
                        }),
                        "pointer-events-none select-none cursor-default"
                      )}
                    >
                      {range}
                    </div>
                  ))}
                </div>
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

              <RegisterLegalConsents value={legalConsents} onChange={setLegalConsents} />

              <button
                type="submit"
                className={cn(registerSubmitClass, "rounded-lg disabled:opacity-50 disabled:pointer-events-none")}
                disabled={
                  isLoading ||
                  !areRegisterLegalConsentsComplete(legalConsents) ||
                  !isPasswordPolicySatisfied(formData.password)
                }
              >
                {isLoading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
              </button>
            </form>

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

export default InfluencerRegister;

