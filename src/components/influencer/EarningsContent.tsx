import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownLeft,
  Banknote,
  Coins,
  FileCheck2,
  Landmark,
  Scale,
  ShieldAlert,
  TrendingUp,
  Upload,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { InfluencerProfile } from '@/services/firebaseInfluencerService';
import type { FirebaseOffer } from '@/services/firebaseOfferService';
import {
  PAYOUT_MIN_WITHDRAWAL_GROSS,
  PAYOUT_PLATFORM_COMMISSION_RATE,
} from '@/constants/payout';
import {
  computeAvailableGross,
  createWithdrawalRequest,
  grossEscrowPendingFromOffers,
  grossEarningsFromOffers,
  grossWithdrawableFromOffers,
  listWithdrawals,
  maskIban,
  monthlyEarningsSeries,
  splitWithdrawalAmounts,
  normalizePayoutAccountFullName,
  submitPayoutVerification,
  type WithdrawalRecord,
} from '@/services/firebaseInfluencerPayoutService';

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

const chartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{row.label}</p>
      <p className="text-[#08afd5]">{fmtMoney(row.brut)}</p>
    </div>
  );
};

export interface EarningsContentProps {
  influencerId: string;
  profile: InfluencerProfile | null;
  offers: FirebaseOffer[];
  canOperate: boolean;
  onRefresh: () => void;
}

export function EarningsContent({
  influencerId,
  profile,
  offers,
  canOperate,
  onRefresh,
}: EarningsContentProps) {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loadingW, setLoadingW] = useState(true);
  const [ibanInput, setIbanInput] = useState('');
  const [payoutAccountNameInput, setPayoutAccountNameInput] = useState('');
  const [taxFile, setTaxFile] = useState<File | null>(null);
  const [submittingV, setSubmittingV] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const payout = profile?.payoutProfile;
  const vStatus = payout?.verificationStatus || 'none';

  const grossTotal = useMemo(() => grossEarningsFromOffers(offers), [offers]);
  const grossEscrowPending = useMemo(() => grossEscrowPendingFromOffers(offers), [offers]);
  const grossWithdrawable = useMemo(() => grossWithdrawableFromOffers(offers), [offers]);
  const chartData = useMemo(() => monthlyEarningsSeries(offers, 6), [offers]);
  const chartMax = useMemo(() => Math.max(1, ...chartData.map((d) => d.brut)), [chartData]);

  const loadWithdrawals = useCallback(async () => {
    setLoadingW(true);
    try {
      const list = await listWithdrawals(influencerId);
      setWithdrawals(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingW(false);
    }
  }, [influencerId]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  useEffect(() => {
    if (vStatus !== 'none' && vStatus !== 'rejected') return;
    const initial =
      (payout?.payoutAccountFullName && String(payout.payoutAccountFullName).trim()) ||
      (profile?.fullName && String(profile.fullName).trim()) ||
      '';
    setPayoutAccountNameInput(initial);
  }, [influencerId, vStatus, payout?.payoutAccountFullName, profile?.fullName]);

  const availableGross = useMemo(
    () => computeAvailableGross(grossWithdrawable, withdrawals),
    [grossWithdrawable, withdrawals]
  );

  const fullWithdrawNet = useMemo(() => {
    if (availableGross <= 0) return 0;
    return splitWithdrawalAmounts(availableGross).net;
  }, [availableGross]);

  const pendingWithdrawSum = useMemo(
    () =>
      withdrawals
        .filter((w) => w.status === 'beklemede')
        .reduce((s, w) => s + (Number(w.amountGross) || 0), 0),
    [withdrawals]
  );

  const parseWithdraw = () => {
    const n = Number(String(withdrawAmount).replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  };

  const previewWithdraw = () => {
    const g = parseWithdraw();
    if (!Number.isFinite(g) || g <= 0) return null;
    return splitWithdrawalAmounts(g);
  };

  const handleSubmitVerification = async () => {
    if (!taxFile) {
      toast({ title: 'Belge gerekli', description: 'Vergi istisna belgesi yükleyin.', variant: 'destructive' });
      return;
    }
    if (!profile?.email) {
      toast({ title: 'Profil eksik', description: 'E-posta bulunamadı.', variant: 'destructive' });
      return;
    }
    if (!profile?.fullName?.trim()) {
      toast({ title: 'Profil eksik', description: 'Görünen ad (profil) gerekir.', variant: 'destructive' });
      return;
    }
    if (!normalizePayoutAccountFullName(payoutAccountNameInput)) {
      toast({
        title: 'Alıcı adı gerekli',
        description: 'Havale/EFT alıcı adını bankadaki gibi, tam ad olarak yazın.',
        variant: 'destructive',
      });
      return;
    }
    setSubmittingV(true);
    try {
      await submitPayoutVerification({
        influencerId,
        fullName: profile.fullName.trim(),
        email: profile.email,
        file: taxFile,
        iban: ibanInput,
        payoutAccountFullName: payoutAccountNameInput,
      });
      toast({
        title: 'Talep gönderildi',
        description: 'Belgeleriniz incelemeye alındı. Onay sonrası çekim yapabilirsiniz.',
      });
      setTaxFile(null);
      setIbanInput('');
      setPayoutAccountNameInput((profile?.fullName && profile.fullName.trim()) || '');
      onRefresh();
    } catch (e: any) {
      toast({
        title: 'Gönderilemedi',
        description: e?.message || 'Bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingV(false);
    }
  };

  const handleWithdraw = async () => {
    const gross = parseWithdraw();
    if (!Number.isFinite(gross) || gross < PAYOUT_MIN_WITHDRAWAL_GROSS) {
      toast({
        title: 'Geçersiz tutar',
        description: `Minimum çekim ₺${PAYOUT_MIN_WITHDRAWAL_GROSS} brüttür.`,
        variant: 'destructive',
      });
      return;
    }
    setSubmittingWithdraw(true);
    try {
      await createWithdrawalRequest(influencerId, gross, offers);
      toast({
        title: 'Talep oluşturuldu',
        description: 'Ödemeniz sıraya alındı. Havale sürecinde e-posta ile bilgilendirileceksiniz.',
      });
      setWithdrawOpen(false);
      setWithdrawAmount('');
      await loadWithdrawals();
      onRefresh();
    } catch (e: any) {
      toast({
        title: 'İşlem başarısız',
        description: e?.message || 'Çekim talebi oluşturulamadı.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const verificationProgress =
    vStatus === 'approved' ? 100 : vStatus === 'pending' ? 66 : vStatus === 'rejected' ? 33 : 10;

  const canWithdraw =
    canOperate && vStatus === 'approved' && availableGross >= PAYOUT_MIN_WITHDRAWAL_GROSS;

  return (
    <div className="w-full max-w-none min-w-0 space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#08afd5] dark:text-[#7ce7ff] font-medium">
            Finans
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Kazançlar
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
            Kampanya tekliflerinden oluşan hakedişinizi takip edin, ödeme doğrulaması yapın ve çekim talebi
            oluşturun.
          </p>
        </div>
        <Badge className="w-fit rounded-full bg-[#e3447c]/15 text-[#e3447c] dark:bg-[#e3447c]/25 dark:text-[#ff8eb3] border-0 px-3 py-1">
          Platform komisyonu %{Math.round(PAYOUT_PLATFORM_COMMISSION_RATE * 100)}
        </Badge>
      </div>

      {!canOperate && (
        <Alert className="border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/50">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Profil doğrulaması</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
            Hesabınız onaylanana kadar çekim talebi oluşturamazsınız. Ödeme doğrulama belgenizi yine de
            gönderebilirsiniz; böylece profil onayınız sonrası beklemeden çekim yaparsınız.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-fr">
        <motion.div
          className="h-full min-h-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="h-full min-h-[168px] sm:min-h-[180px] flex flex-col p-4 md:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-br from-white to-[#08afd5]/8 dark:from-gray-900 dark:to-[#08afd5]/10 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3 flex-shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight pr-1">
                Toplam brüt hakediş
              </span>
              <div className="p-2 rounded-xl bg-[#08afd5]/15 text-[#08afd5] dark:text-[#7ce7ff] shrink-0">
                <Coins size={18} strokeWidth={2} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex-shrink-0">
              {fmtMoney(grossTotal)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-auto pt-3 min-h-[2.75rem] leading-snug">
              İade edilmiş anlaşmalar hariç. Askıda (içerik onayı bekleyen){' '}
              <span className="font-medium text-[#e3447c]/90 dark:text-[#ff8eb3]">
                {fmtMoney(grossEscrowPending)}
              </span>
            </p>
          </Card>
        </motion.div>

        <motion.div
          className="h-full min-h-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="h-full min-h-[168px] sm:min-h-[180px] flex flex-col p-4 md:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3 flex-shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight pr-1">
                Çekilebilir brüt
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Wallet size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex-shrink-0">
              {fmtMoney(availableGross)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-auto pt-3 min-h-[2.75rem] leading-snug line-clamp-3">
              İçeriği marka onayladıktan sonra çekime açılan brüt, çekim talepleri düşülmüş
            </p>
          </Card>
        </motion.div>

        <motion.div
          className="h-full min-h-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full min-h-[168px] sm:min-h-[180px] flex flex-col p-4 md:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3 flex-shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight pr-1">
                Tahmini net (tam çekim)
              </span>
              <div className="p-2 rounded-xl bg-[#e3447c]/15 text-[#e3447c] dark:text-[#ff8eb3] shrink-0">
                <Banknote size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex-shrink-0">
              {fmtMoney(fullWithdrawNet)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-auto pt-3 min-h-[2.75rem] leading-snug line-clamp-3">
              %{Math.round(PAYOUT_PLATFORM_COMMISSION_RATE * 100)} komisyon sonrası (tüm bakiye)
            </p>
          </Card>
        </motion.div>

        <motion.div
          className="h-full min-h-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="h-full min-h-[168px] sm:min-h-[180px] flex flex-col p-4 md:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3 flex-shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight pr-1">
                İşlemdeki çekim
              </span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 shrink-0">
                <ArrowDownLeft size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex-shrink-0">
              {fmtMoney(pendingWithdrawSum)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-auto pt-3 min-h-[2.75rem] leading-snug line-clamp-3">
              Onay bekleyen talepler (brüt)
            </p>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <Card className="lg:col-span-3 p-4 md:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-[#08afd5] dark:text-[#7ce7ff]" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aylık kazanç</h2>
            </div>
            <span className="text-xs text-gray-500">Son 6 ay — brüt</span>
          </div>
          <div className="h-[220px] sm:h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#08afd5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#08afd5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  domain={[0, chartMax * 1.1]}
                  tickFormatter={(v) =>
                    v >= 1000 ? `₺${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `₺${Math.round(v)}`
                  }
                />
                <Tooltip content={chartTooltip} />
                <Area
                  type="monotone"
                  dataKey="brut"
                  stroke="#08afd5"
                  strokeWidth={2.5}
                  fill="url(#earnFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-4 md:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-950/80 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <FileCheck2 className="text-[#08afd5] dark:text-[#7ce7ff]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ödeme doğrulaması</h2>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Para çekmek için TR IBAN, bankadaki tam alıcı adı (havale/EFT ile aynı), vergi istisna belgesi ve yönetici
            onayı gerekir. Onaylandıktan sonra çekim talebi açabilirsiniz.
          </p>
          <Progress value={verificationProgress} className="h-2 mb-4 bg-gray-200 dark:bg-gray-800" />

          {vStatus === 'approved' && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-sm font-medium">
                <Landmark size={16} />
                Onaylı ödeme bilgisi
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">IBAN: {maskIban(payout?.iban)}</p>
              {payout?.payoutAccountFullName && (
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Havale/EFT alıcı adı: <span className="font-medium">{payout.payoutAccountFullName}</span>
                </p>
              )}
              {payout?.taxDocumentURL && (
                <a
                  href={payout.taxDocumentURL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#08afd5] underline"
                >
                  Yüklenen belgeyi aç
                </a>
              )}
            </div>
          )}

          {vStatus === 'pending' && (
            <Alert className="border-[#08afd5]/30 bg-[#08afd5]/5">
              <AlertTitle className="text-sm">İncelemede</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <p>Başvurunuz admin ekibi tarafından değerlendiriliyor. Sonuç için bildirimleri takip edin.</p>
                {payout?.payoutAccountFullName && (
                  <p>
                    Başvurudaki alıcı adı:{' '}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {payout.payoutAccountFullName}
                    </span>
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {vStatus === 'rejected' && payout?.rejectionReason && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle className="text-sm">Başvuru reddedildi</AlertTitle>
              <AlertDescription className="text-xs">{payout.rejectionReason}</AlertDescription>
            </Alert>
          )}

          {(vStatus === 'none' || vStatus === 'rejected') && (
            <div className="space-y-3 mt-auto">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">TR IBAN</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm"
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  value={ibanInput}
                  onChange={(e) => setIbanInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Havale / EFT alıcı adı (bankadaki tam ad)
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm"
                  placeholder="Örn. Ahmet Yılmaz (hesapta geçen adla aynı)"
                  value={payoutAccountNameInput}
                  onChange={(e) => setPayoutAccountNameInput(e.target.value)}
                  autoComplete="name"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Profildeki görünen isim farklı olsa da ödemenin yönlendirileceği hesabın bankadaki unvanıyla aynı
                  olmalıdır.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Vergi istisna belgesi (PDF veya görsel)
                </label>
                <label className="mt-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 py-6 cursor-pointer hover:border-[#08afd5]/50 transition-colors">
                  <Upload className="text-gray-400" size={22} />
                  <span className="text-xs text-gray-500">{taxFile ? taxFile.name : 'Dosya seç'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => setTaxFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <Button
                className="w-full rounded-full brand-btn-primary text-white"
                disabled={submittingV}
                onClick={handleSubmitVerification}
              >
                {submittingV ? 'Gönderiliyor...' : 'Doğrulama başvurusunu gönder'}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4 md:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Scale className="text-[#e3447c] dark:text-[#ff8eb3]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Çekim talepleri</h2>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-[#08afd5]/40 text-[#08afd5] hover:bg-[#08afd5]/10"
            disabled={!canWithdraw}
            onClick={() => {
              setWithdrawAmount(String(Math.max(0, availableGross)));
              setWithdrawOpen(true);
            }}
          >
            Para çek
          </Button>
        </div>
        {!canWithdraw && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {vStatus !== 'approved' && 'Ödeme doğrulaması onaylandığında çekim yapabilirsiniz. '}
            {vStatus === 'approved' &&
              !canOperate &&
              'Hesap doğrulaması ve hedef kitle kurulumu (Kurulumu tamamla) tamamlanmalı. '}
            {vStatus === 'approved' &&
              canOperate &&
              availableGross < PAYOUT_MIN_WITHDRAWAL_GROSS &&
              `Minimum çekilebilir bakiye ₺${PAYOUT_MIN_WITHDRAWAL_GROSS} brüttür. `}
          </p>
        )}
        {loadingW ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : withdrawals.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz çekim talebi yok.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="pb-2 pr-2">Tarih</th>
                  <th className="pb-2 pr-2">Brüt</th>
                  <th className="pb-2 pr-2">Komisyon</th>
                  <th className="pb-2 pr-2">Net</th>
                  <th className="pb-2 pr-2">Durum</th>
                  <th className="pb-2">Ödeme</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-gray-100 dark:border-gray-800/80 text-gray-800 dark:text-gray-200"
                  >
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {w.createdAt ? new Date(w.createdAt).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="py-2 pr-2">{fmtMoney(w.amountGross)}</td>
                    <td className="py-2 pr-2 text-amber-600 dark:text-amber-400">-{fmtMoney(w.platformFee)}</td>
                    <td className="py-2 pr-2 font-medium">{fmtMoney(w.amountNet)}</td>
                    <td className="py-2">
                      <Badge
                        variant="secondary"
                        className={`rounded-full text-[10px] ${
                          w.status === 'tamamlandı'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : w.status === 'iptal'
                              ? 'bg-gray-500/15'
                              : 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
                        }`}
                      >
                        {w.status === 'tamamlandı'
                          ? 'Tamamlandı'
                          : w.status === 'iptal'
                            ? 'İptal'
                            : 'İşlemde'}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {w.status === 'tamamlandı' && w.paidAt
                        ? new Date(w.paidAt).toLocaleString('tr-TR')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle>Çekim talebi</DialogTitle>
            <DialogDescription>
              Brüt tutar girin; %{Math.round(PAYOUT_PLATFORM_COMMISSION_RATE * 100)} platform komisyonu düşülür,
              kalan net tutar hesabınıza aktarılır. Mevcut çekilebilir: {fmtMoney(availableGross)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Brüt tutar (₺)</label>
              <input
                type="text"
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setWithdrawAmount(String(availableGross))}
                >
                  Tümünü çek
                </Button>
              </div>
            </div>
            {previewWithdraw() && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Komisyon</span>
                  <span>-{fmtMoney(previewWithdraw()!.fee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                  <span>Net ödeme</span>
                  <span>{fmtMoney(previewWithdraw()!.net)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-full" onClick={() => setWithdrawOpen(false)}>
              Vazgeç
            </Button>
            <Button
              className="rounded-full brand-btn-primary text-white"
              disabled={submittingWithdraw}
              onClick={handleWithdraw}
            >
              {submittingWithdraw ? 'Gönderiliyor...' : 'Talebi oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
