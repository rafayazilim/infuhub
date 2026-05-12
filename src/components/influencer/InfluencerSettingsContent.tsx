import React from 'react';
import { motion } from 'framer-motion';
import {
  Banknote,
  ExternalLink,
  HelpCircle,
  ListChecks,
  Lock,
  LogOut,
  Palette,
  Shield,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { InfluencerProfile } from '@/services/firebaseInfluencerService';
import { isUserVerified } from '@/services/firebaseAuthService';

export interface InfluencerSettingsContentProps {
  influencerId: string;
  profile: InfluencerProfile | null;
  /** Marka panelindeki gibi profil düzenleme diyaloğunu açar */
  onOpenProfileEdit: () => void;
  /** Hedef kitle / eşleşme anketi diyaloğu */
  onOpenAudienceMatch: () => void;
  onGoToEarnings: () => void;
  onLogout: () => void;
  logoutBusy: boolean;
}

export function InfluencerSettingsContent({
  influencerId,
  profile,
  onOpenProfileEdit,
  onOpenAudienceMatch,
  onGoToEarnings,
  onLogout,
  logoutBusy,
}: InfluencerSettingsContentProps) {
  const verified = isUserVerified(profile?.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#08afd5]/15 dark:bg-[#08afd5]/25 text-[#08afd5] dark:text-[#6edff3]">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              Ayarlar
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 max-w-xl">
              Hesap, görünüm ve güvenlik tercihlerinizi buradan yönetin.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="mac-surface p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
          <div className="flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3] mb-3">
            <User className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Profil</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            Ad, fotoğraf, kategoriler ve sosyal hesaplarınızı buradan açılan profil düzenleme penceresinde
            güncelleyebilirsiniz.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-[#08afd5]/40 text-[#08afd5] hover:bg-[#08afd5]/10 dark:border-[#08afd5]/35 dark:text-[#6edff3]"
            onClick={onOpenProfileEdit}
          >
            Profili düzenle
          </Button>
        </Card>

        <Card className="mac-surface p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
          <div className="flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3] mb-3">
            <ListChecks className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Hedef kitle anketi</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            İzleyici kitleniz ve kampanyalara uyum bilgilerinizi buradan yeniden düzenleyebilirsiniz.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-[#08afd5]/40 text-[#08afd5] hover:bg-[#08afd5]/10 dark:border-[#08afd5]/35 dark:text-[#6edff3]"
            onClick={onOpenAudienceMatch}
          >
            Anketi aç veya güncelle
          </Button>
        </Card>

        <Card className="mac-surface p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
          <div className="flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3] mb-3">
            <Palette className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Görünüm</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Arayüz koyu temada sabitlenmiştir; açık tema artık sunulmamaktadır.
          </p>
        </Card>

        <Card className="mac-surface p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-sm sm:col-span-2">
          <div className="flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3] mb-3">
            <Shield className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Hesap</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500 mb-1">
                E-posta
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                {profile?.email || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500 mb-1">
                Kullanıcı kimliği
              </p>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                {influencerId}
              </p>
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">
                Doğrulama
              </span>
              {verified ? (
                <Badge className="rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                  Onaylı hesap
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-md">
                  Doğrulama gerekli
                </Badge>
              )}
            </div>
          </div>
        </Card>

        <Card className="mac-surface p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
          <div className="flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3] mb-3">
            <Lock className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Güvenlik</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Şifre değişikliği için <strong className="text-gray-800 dark:text-gray-200">Profili düzenle</strong>{' '}
            penceresindeki şifre alanlarını kullanın.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-[#08afd5] hover:bg-[#08afd5]/10 dark:text-[#6edff3] h-auto py-1.5 px-2 -ml-2"
            onClick={onOpenProfileEdit}
          >
            Profil düzenlemeyi aç
          </Button>
        </Card>

        <Card className="mac-surface p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
          <div className="flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3] mb-3">
            <Banknote className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Ödeme & kazanç</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            IBAN, çekim talepleri ve kazanç özetiniz Kazançlar bölümündedir.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-[#08afd5]/40 text-[#08afd5] hover:bg-[#08afd5]/10 dark:border-[#08afd5]/35 dark:text-[#6edff3]"
            onClick={onGoToEarnings}
          >
            Kazançlara git
          </Button>
        </Card>

        <Card className="mac-surface p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-sm sm:col-span-2">
          <div className="flex items-center gap-2 text-[#08afd5] dark:text-[#6edff3] mb-3">
            <HelpCircle className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Yardım</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Sorularınız için iletişim sayfamızı ziyaret edebilirsiniz.
          </p>
          <Button variant="outline" size="sm" className="rounded-xl gap-2" asChild>
            <Link to="/iletisim">
              İletişim sayfası
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>

        <Card className="mac-surface p-5 border border-red-200/60 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 sm:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Oturumu kapat</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Güvenli çıkış yapılır ve tanıtım sitesine yönlendirilirsiniz.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={logoutBusy}
              className="rounded-xl border-red-300/80 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40 shrink-0"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {logoutBusy ? 'Çıkılıyor…' : 'Güvenli çıkış'}
            </Button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
