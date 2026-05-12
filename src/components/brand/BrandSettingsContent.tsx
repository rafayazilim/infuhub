import React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  ExternalLink,
  HelpCircle,
  Lock,
  LogOut,
  Palette,
  Shield,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isUserVerified } from "@/services/firebaseAuthService";

export interface BrandSettingsContentProps {
  brandId: string;
  brandProfile: Record<string, unknown> | null;
  onEditProfile: () => void;
  onEditSorumlu: () => void;
  onLogout: () => void;
  logoutBusy: boolean;
}

export function BrandSettingsContent({
  brandId,
  brandProfile,
  onEditProfile,
  onEditSorumlu,
  onLogout,
  logoutBusy,
}: BrandSettingsContentProps) {
  const verified = isUserVerified(brandProfile?.status as string | undefined);
  const email = (brandProfile?.email as string) || "—";
  const brandName = (brandProfile?.brandName as string) || "Marka";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto w-full max-w-4xl space-y-6"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/25 dark:text-[#6edff3]">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">Ayarlar</h1>
            <p className="mt-0.5 max-w-xl text-sm text-gray-600 dark:text-gray-400">
              Marka profili, yetkili kişiler, güvenlik ve hesap bilgilerinizi buradan yönetin.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="mac-surface border border-gray-200/80 p-5 shadow-sm dark:border-gray-800/80">
          <div className="mb-3 flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3]">
            <Building2 className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Marka profili</h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Logo, marka adı, sektör, bütçe aralığı ve kategori seçimlerini güncelleyin.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-[#08afd5]/40 text-[#08afd5] hover:bg-[#08afd5]/10 dark:border-[#08afd5]/35 dark:text-[#6edff3]"
            onClick={onEditProfile}
          >
            Profili düzenle
          </Button>
        </Card>

        <Card className="mac-surface border border-gray-200/80 p-5 shadow-sm dark:border-gray-800/80">
          <div className="mb-3 flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3]">
            <UserPlus className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Yetkili kişi</h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Sorumlu iletişim bilgilerini ekleyin veya güncelleyin; teklif süreçleri için kullanılır.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-[#08afd5]/40 text-[#08afd5] hover:bg-[#08afd5]/10 dark:border-[#08afd5]/35 dark:text-[#6edff3]"
            onClick={onEditSorumlu}
          >
            Yetkili düzenle
          </Button>
        </Card>

        <Card className="mac-surface border border-gray-200/80 p-5 shadow-sm dark:border-gray-800/80">
          <div className="mb-3 flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3]">
            <Palette className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Görünüm</h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Marka paneli koyu temada sunulur; açık tema şu an kullanılamıyor.
          </p>
        </Card>

        <Card className="mac-surface border border-gray-200/80 p-5 shadow-sm dark:border-gray-800/80">
          <div className="mb-3 flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3]">
            <Shield className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Hesap</h2>
          </div>
          <div className="grid gap-3">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Marka</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{brandName}</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">E-posta</p>
              <p className="break-all text-sm font-medium text-gray-900 dark:text-gray-100">{email}</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Kullanıcı kimliği</p>
              <p className="break-all font-mono text-xs text-gray-700 dark:text-gray-300">{brandId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Profil doğrulama</span>
              {verified ? (
                <Badge className="rounded-md border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200">
                  Onaylı
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-md">
                  Doğrulanmadı
                </Badge>
              )}
            </div>
          </div>
        </Card>

        <Card className="mac-surface border border-gray-200/80 p-5 shadow-sm dark:border-gray-800/80 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3]">
            <Lock className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Güvenlik</h2>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Şifre değişikliği için <strong className="text-gray-800 dark:text-gray-200">Profili düzenle</strong> penceresindeki
            şifre alanlarını kullanın.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-auto rounded-xl px-2 py-1.5 text-[#08afd5] hover:bg-[#08afd5]/10 dark:text-[#6edff3]"
            onClick={onEditProfile}
          >
            Profil ve şifre düzenle
          </Button>
        </Card>

        <Card className="mac-surface border border-gray-200/80 p-5 shadow-sm dark:border-gray-800/80 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3]">
            <HelpCircle className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Yardım</h2>
          </div>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Sorularınız için iletişim sayfamızı ziyaret edebilirsiniz.</p>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" asChild>
            <Link to="/iletisim">
              İletişim sayfası
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>

        <Card className="mac-surface border border-red-200/60 bg-red-50/40 p-5 dark:border-red-900/40 dark:bg-red-950/20 sm:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Oturumu kapat</h2>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                Güvenli çıkış yapılır ve markalar sayfasına yönlendirilirsiniz.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={logoutBusy}
              className="shrink-0 rounded-xl border-red-300/80 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
              onClick={onLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutBusy ? "Çıkılıyor…" : "Güvenli çıkış"}
            </Button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
