import React, { useEffect, useMemo, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { ref, update } from "firebase/database";
import { Eye, EyeOff } from "lucide-react";
import { auth, database } from "@/config/firebase";
import { useToast } from "@/hooks/use-toast";
import type { BrandSorumlu } from "@/services/firebaseAuthService";
import { isUserVerified } from "@/services/firebaseAuthService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BRAND_UNVAN_OPTIONS } from "@/constants/brandFormOptions";
import { TOP_CATEGORY_KEYS } from "@/constants/sectorCategoryTree";
import { RegisterCategoryFields } from "@/components/shared/RegisterCategoryFields";

const BUDGET_LIMITS = [5000, 25000, 50000, 100000, 250000] as const;
const BUDGET_LABELS = ["₺5.000", "₺25.000", "₺50.000", "₺100.000", "₺250.000+"];

function optionsWithLegacy(base: readonly string[], current: string): string[] {
  const out = [...base];
  if (current && !out.includes(current)) out.push(current);
  return out;
}

function pickPrimarySorumlu(sorumlular: unknown): BrandSorumlu | null {
  if (!sorumlular || typeof sorumlular !== "object") return null;
  const o = sorumlular as Record<string, BrandSorumlu>;
  if (o.birincil && typeof o.birincil === "object") return o.birincil;
  const vals = Object.values(o).filter((v) => v && typeof v === "object" && "firstName" in v);
  return (vals[0] as BrandSorumlu) || null;
}

function fmtTrDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("tr-TR");
}

function statusLabel(status: unknown): string {
  const s = String(status || "");
  if (s === "onaylandı") return "Onaylandı";
  if (s === "beklemede") return "Beklemede";
  if (s === "reddedildi") return "Reddedildi";
  return "Doğrulanmadı";
}

function verificationLabel(v: unknown): string {
  const s = String(v || "yok");
  if (s === "beklemede") return "İnceleniyor";
  if (s === "onaylandı") return "Onaylı";
  if (s === "reddedildi") return "Reddedildi";
  return "Yok";
}

export interface BrandProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandProfile: Record<string, unknown> | null;
  onSaved: () => void | Promise<void>;
}

export function BrandProfileEditDialog({
  open,
  onOpenChange,
  brandId,
  brandProfile,
  onSaved,
}: BrandProfileEditDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<Record<string, string[]>>({});
  const [website, setWebsite] = useState("");
  const [budgetIdx, setBudgetIdx] = useState(2);
  const [sorumluFirst, setSorumluFirst] = useState("");
  const [sorumluLast, setSorumluLast] = useState("");
  const [sorumluTitle, setSorumluTitle] = useState("");
  const [sorumluPhone, setSorumluPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (!open || !brandProfile) return;
    setBrandName(String(brandProfile.brandName || ""));
    const rawCats = brandProfile.categories;
    const rawSubs = brandProfile.subCategories;
    if (Array.isArray(rawCats) && rawCats.length > 0) {
      setCategories(rawCats.map((x) => String(x)));
      setSubCategories(
        rawSubs && typeof rawSubs === "object" && !Array.isArray(rawSubs)
          ? (rawSubs as Record<string, string[]>)
          : {}
      );
    } else {
      const ind = String(brandProfile.industry || "").trim();
      const legacySubs = Array.isArray(brandProfile.industrySubCategories)
        ? brandProfile.industrySubCategories.map((x) => String(x))
        : [];
      if (ind && TOP_CATEGORY_KEYS.includes(ind)) {
        setCategories([ind]);
        setSubCategories(legacySubs.length ? { [ind]: legacySubs } : {});
      } else {
        setCategories([]);
        setSubCategories({});
      }
    }
    setWebsite(String(brandProfile.website || ""));
    const b = typeof brandProfile.budget === "number" ? brandProfile.budget : 2;
    setBudgetIdx(Math.min(Math.max(b, 0), BUDGET_LIMITS.length - 1));
    const s = pickPrimarySorumlu(brandProfile.sorumlular);
    setSorumluFirst(s?.firstName || "");
    setSorumluLast(s?.lastName || "");
    setSorumluTitle(s?.title || "");
    setSorumluPhone(s?.phone || "");
    setCurrentPassword("");
    setNewPassword("");
    setShowCurrentPw(false);
    setShowNewPw(false);
  }, [open, brandProfile]);

  const email = String(brandProfile?.email || auth.currentUser?.email || "");
  const verified = brandProfile ? isUserVerified(brandProfile.status as string) : false;

  const unvanItems = useMemo(() => optionsWithLegacy(BRAND_UNVAN_OPTIONS, sorumluTitle), [sorumluTitle]);

  const handleSave = async () => {
    if (!brandId) return;
    const primary = categories[0]?.trim() || "";
    if (!primary) {
      toast({
        title: "Kategori gerekli",
        description: "Influencer kaydı ile aynı şekilde en az bir üst kategori seçin.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const existing = brandProfile?.sorumlular as Record<string, BrandSorumlu> | undefined;
      const birincilCreated = existing?.birincil?.createdAt || new Date().toISOString();

      await update(ref(database, `brands/${brandId}`), {
        brandName: brandName.trim(),
        industry: primary,
        categories,
        subCategories: Object.keys(subCategories).length ? subCategories : undefined,
        industrySubCategories: null,
        budget: budgetIdx,
        website: website.trim() || "",
        sorumlular: {
          ...(existing || {}),
          birincil: {
            firstName: sorumluFirst.trim(),
            lastName: sorumluLast.trim(),
            title: sorumluTitle.trim(),
            phone: sorumluPhone.trim(),
            createdAt: birincilCreated,
          },
        },
        updatedAt: new Date().toISOString(),
      });

      const newPw = newPassword.trim();
      if (newPw) {
        if (newPw.length < 6) {
          throw new Error("Yeni şifre en az 6 karakter olmalıdır.");
        }
        if (!currentPassword) {
          throw new Error("Şifre değişikliği için mevcut şifrenizi girin.");
        }
        const user = auth.currentUser;
        const userEmail = user?.email || email;
        if (!user || !userEmail) {
          throw new Error("Oturum veya e-posta bulunamadı.");
        }
        const credential = EmailAuthProvider.credential(userEmail, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPw);
      }

      toast({
        title: "Kaydedildi",
        description:
          newPw.length > 0
            ? "Profil bilgileri ve şifre güncellendi."
            : "Profil bilgileri güncellendi.",
      });
      onOpenChange(false);
      await onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kayıt sırasında hata oluştu.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-2xl overflow-hidden border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 md:w-full">
        <DialogHeader>
          <DialogTitle>Genel profili düzenle</DialogTitle>
          <DialogDescription>
            Şirket ve yetkili bilgilerinizi güncelleyin. E-posta değiştirilemez; şifre için önce mevcut
            şifrenizi girin.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-11rem)] space-y-6 overflow-y-auto pr-1 mac-scrollbar">
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Salt okunur — hesap özeti
            </p>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">E-posta</p>
                <p className="mt-0.5 font-medium break-all">{email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Profil durumu</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className={
                      verified
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    }
                  >
                    {statusLabel(brandProfile?.status)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Doğrulama: {verificationLabel(brandProfile?.verificationRequestStatus)}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kayıt tarihi</p>
                <p className="mt-0.5">{fmtTrDate(brandProfile?.createdAt as string | undefined)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Son güncelleme</p>
                <p className="mt-0.5">{fmtTrDate(brandProfile?.updatedAt as string | undefined)}</p>
              </div>
              {typeof brandProfile?.profilePhotoURL === "string" && brandProfile.profilePhotoURL ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Marka logosu (URL)</p>
                  <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">
                    {brandProfile.profilePhotoURL}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Logoyu değiştirmek için ana sayfadaki hesap menüsünü kullanın.
                  </p>
                </div>
              ) : null}
              {(typeof brandProfile?.walletBalance === "number" ||
                typeof brandProfile?.walletLoadedTotal === "number") && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cüzdan (özet)</p>
                  <p className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                    Bakiye:{" "}
                    {typeof brandProfile.walletBalance === "number"
                      ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(
                          brandProfile.walletBalance
                        )
                      : "—"}
                    {" · "}
                    Toplam yüklenen:{" "}
                    {typeof brandProfile.walletLoadedTotal === "number"
                      ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(
                          brandProfile.walletLoadedTotal
                        )
                      : "—"}
                    {" · "}
                    Harcama:{" "}
                    {typeof brandProfile.walletSpentTotal === "number"
                      ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(
                          brandProfile.walletSpentTotal
                        )
                      : "—"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Şirket bilgileri</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="brand-email-ro">E-posta</Label>
                <Input id="brand-email-ro" value={email} readOnly disabled className="cursor-not-allowed bg-gray-100 dark:bg-gray-800" />
                <p className="text-[11px] text-gray-500 dark:text-gray-400">E-posta güvenlik nedeniyle değiştirilemez.</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="brand-name">Şirket / marka adı</Label>
                <Input
                  id="brand-name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Marka adı"
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <RegisterCategoryFields
                  value={{ categories, subCategories }}
                  onChange={(next) => {
                    setCategories(next.categories);
                    setSubCategories(next.subCategories);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-website">Web sitesi</Label>
                <Input
                  id="brand-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                  inputMode="url"
                  autoComplete="url"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Planlanan aylık kampanya bütçesi (referans)</Label>
                <Select value={String(budgetIdx)} onValueChange={(v) => setBudgetIdx(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_LABELS.map((label, i) => (
                      <SelectItem key={label} value={String(i)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Yetkili kişi</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sorumlu-first">Ad</Label>
                <Input id="sorumlu-first" value={sorumluFirst} onChange={(e) => setSorumluFirst(e.target.value)} autoComplete="given-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorumlu-last">Soyad</Label>
                <Input id="sorumlu-last" value={sorumluLast} onChange={(e) => setSorumluLast(e.target.value)} autoComplete="family-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorumlu-title">Ünvan</Label>
                <Select value={sorumluTitle || undefined} onValueChange={setSorumluTitle}>
                  <SelectTrigger id="sorumlu-title">
                    <SelectValue placeholder="Ünvan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {unvanItems.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorumlu-phone">Telefon</Label>
                <Input id="sorumlu-phone" value={sorumluPhone} onChange={(e) => setSorumluPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Şifre</p>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Yeni şifre belirlemek için önce mevcut şifrenizi girin. Sadece şifreyi değiştirmeyecekseniz bu alanları boş
              bırakın.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-pw">Mevcut şifre</Label>
                <div className="relative">
                  <Input
                    id="current-pw"
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10"
                    autoComplete="current-password"
                    placeholder="Şifre değişimi için gerekli"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowCurrentPw((p) => !p)}
                    aria-label={showCurrentPw ? "Gizle" : "Göster"}
                  >
                    {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pw">Yeni şifre</Label>
                <div className="relative">
                  <Input
                    id="new-pw"
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowNewPw((p) => !p)}
                    aria-label={showNewPw ? "Gizle" : "Göster"}
                  >
                    {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            İptal
          </Button>
          <Button type="button" className="brand-btn-primary text-white" onClick={handleSave} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
