import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  addBudgetToBrandWallet,
  BrandWalletTransaction,
  ensureBrandWallet,
  getBrandWalletTransactions,
  processPendingBrandWalletDebitsForBrand,
} from '@/services/firebaseBrandWalletService';
import { getOffersByBrand } from '@/services/firebaseOfferService';
import { processStaleEscrowRefundsForBrandOffers } from '@/services/firebaseOfferEscrowService';

interface BudgetSpendingContentProps {
  brandId: string;
  canOperate?: boolean;
}

const formatTry = (value: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(value || 0);

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

export function BudgetSpendingContent({ brandId, canOperate = true }: BudgetSpendingContentProps) {
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [wallet, setWallet] = useState({
    balance: 0,
    loadedTotal: 0,
    spentTotal: 0,
  });
  const [transactions, setTransactions] = useState<BrandWalletTransaction[]>([]);
  const [acceptedOfferCount, setAcceptedOfferCount] = useState(0);
  const [pendingOfferCount, setPendingOfferCount] = useState(0);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const quickAmounts = [1000, 3000, 5000, 10000, 25000];

  const normalizedAmount = Math.round(Number(amount) || 0);
  const canSubmitPayment =
    normalizedAmount > 0 &&
    cardHolder.trim().length >= 3 &&
    cardNumber.replace(/\s/g, '').length >= 16 &&
    cardExpiry.length === 5 &&
    cardCvv.length >= 3;

  const usagePercent = useMemo(() => {
    if (wallet.loadedTotal <= 0) return 0;
    return Math.min(100, Math.round((wallet.spentTotal / wallet.loadedTotal) * 100));
  }, [wallet.loadedTotal, wallet.spentTotal]);

  const loadData = async () => {
    try {
      setLoading(true);
      await processPendingBrandWalletDebitsForBrand(brandId);
      await processStaleEscrowRefundsForBrandOffers(await getOffersByBrand(brandId));
      const [walletData, txData, offers] = await Promise.all([
        ensureBrandWallet(brandId),
        getBrandWalletTransactions(brandId, 100),
        getOffersByBrand(brandId),
      ]);

      setWallet(walletData);
      setTransactions(txData);
      setAcceptedOfferCount(offers.filter((offer) => offer.status === 'kabul').length);
      setPendingOfferCount(offers.filter((offer) => offer.status === 'beklemede').length);
    } catch (error) {
      console.error('Butce verileri yuklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!brandId) return;
    loadData();
  }, [brandId]);

  const performBudgetAdd = async () => {
    if (!canOperate) return false;
    if (normalizedAmount <= 0) return false;

    try {
      setAdding(true);
      const result = await addBudgetToBrandWallet(brandId, normalizedAmount, note || undefined);
      setWallet(result);
      setAmount('');
      setNote('');
      await loadData();
      return true;
    } catch (error: any) {
      window.alert(error.message || 'Butce yuklenemedi');
      return false;
    } finally {
      setAdding(false);
    }
  };

  const openPaymentModal = () => {
    if (!canOperate) return;
    if (normalizedAmount <= 0) {
      window.alert('Lutfen gecerli bir butce tutari girin.');
      return;
    }
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    const ok = await performBudgetAdd();
    if (!ok) return;

    setPaymentModalOpen(false);
    setCardHolder('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  };

  return (
    <div className="w-full max-w-none min-w-0 space-y-4">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Bütçe & Harcamalar</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Bütçe yükleme ve anlaşma ödemeleri bu ekrandan takip edilir.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-[#08afd5]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/70">
              <p className="text-xs text-gray-500 dark:text-gray-400">Güncel Bakiye</p>
              <p className="text-2xl font-bold text-[#08afd5] dark:text-[#6edff3] mt-1">{formatTry(wallet.balance)}</p>
            </Card>
            <Card className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/70">
              <p className="text-xs text-gray-500 dark:text-gray-400">Toplam Yüklenen</p>
              <p className="text-2xl font-bold text-[#08afd5] dark:text-[#6edff3] mt-1">{formatTry(wallet.loadedTotal)}</p>
            </Card>
            <Card className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/70">
              <p className="text-xs text-gray-500 dark:text-gray-400">Toplam Ödeme</p>
              <p className="text-2xl font-bold text-[#e3447c] dark:text-[#ef77a1] mt-1">{formatTry(wallet.spentTotal)}</p>
            </Card>
            <Card className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/70">
              <p className="text-xs text-gray-500 dark:text-gray-400">Aktif Anlaşmalar</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{acceptedOfferCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bekleyen teklif: {pendingOfferCount}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
            <Card className="p-5 mac-surface">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={17} className="text-[#08afd5] dark:text-[#6edff3]" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bütçe Yükle</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                {quickAmounts.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setAmount(String(quick))}
                    className="h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/70 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-[#08afd5]/70"
                  >
                    {formatTry(quick)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] gap-2">
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Yüklenecek tutar (₺)"
                  className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Açıklama (opsiyonel)"
                  className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                />
                <Button
                  className="h-10 rounded-xl brand-btn-primary text-white"
                  onClick={openPaymentModal}
                  disabled={adding || !canOperate}
                >
                  <CreditCard size={14} className="mr-1.5" />
                  Ödeme Ekranını Aç
                </Button>
              </div>

              {!canOperate && (
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-2">
                  Hesap doğrulanmadan bütçe yükleme ve ödeme işlemi yapılamaz.
                </p>
              )}
            </Card>

            <Card className="p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-gradient-to-br from-white/95 to-slate-100/60 dark:from-gray-900/80 dark:to-slate-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Wallet size={17} className="text-gray-600 dark:text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bütçe Özeti</h3>
              </div>
              <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white/80 dark:bg-gray-900/70">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Kullanım Oranı</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">%{usagePercent}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className="h-2.5 rounded-full bg-[#08afd5] transition-all" style={{ width: `${usagePercent}%` }} />
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Kullanılabilir Bakiye</span>
                    <span className="font-semibold text-[#08afd5] dark:text-[#6edff3]">{formatTry(wallet.balance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Toplam Yükleme</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatTry(wallet.loadedTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Toplam Ödeme</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatTry(wallet.spentTotal)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/70">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">İşlem Geçmişi</h3>
            {transactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                Henüz bütçe işlemi yok.
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isTopup = tx.type === 'topup' || tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 px-3 py-2.5 bg-white dark:bg-gray-900 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                    >
                      <div className={`w-9 h-9 rounded-lg inline-flex items-center justify-center ${isTopup ? 'bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3]' : 'bg-[#e3447c]/15 text-[#e3447c] dark:bg-[#e3447c]/20 dark:text-[#ef77a1]'}`}>
                        {isTopup ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {tx.note || (isTopup ? 'Bütçe yüklendi' : 'Ödeme yapıldı')}
                          </p>
                          {isTopup ? (
                            <Badge className="bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3]">Yükleme</Badge>
                          ) : (
                            <Badge className="bg-[#e3447c]/15 text-[#e3447c] dark:bg-[#e3447c]/20 dark:text-[#ef77a1]">Ödeme</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(tx.createdAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="text-right ml-auto">
                        <p className={`text-sm font-semibold ${isTopup ? 'text-[#08afd5] dark:text-[#6edff3]' : 'text-[#e3447c] dark:text-[#ef77a1]'}`}>
                          {isTopup ? '+' : ''}
                          {formatTry(tx.amount)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Bakiye: {formatTry(tx.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/70">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#08afd5] dark:text-[#6edff3]" />
                <p className="text-sm text-gray-700 dark:text-gray-300">Otomatik Bütçe Kesintisi</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Teklif kabul edildiğinde marka bakiyesinden ödeme tutarı otomatik düşülür.
              </p>
            </Card>
            <Card className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/70">
              <div className="flex items-center gap-2">
                <Clock3 size={15} className="text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-gray-700 dark:text-gray-300">Bekleyen Akış</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Fake ödeme ekranı aktif. Şimdilik girilen tutar doğrudan bakiyeye eklenir.
              </p>
            </Card>
            <Card className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/70">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-[#08afd5] dark:text-[#6edff3]" />
                <p className="text-sm text-gray-700 dark:text-gray-300">Bütçe Kuralı</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Bakiye yetersizse teklif kabul işlemi tamamlanmaz.
              </p>
            </Card>
          </div>
        </>
      )}

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800/70">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr]">
            <div className="p-6 bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-white">
              <div className="mb-6">
                <p className="text-sm font-medium text-white/90">INFUHUB Secure Pay</p>
              </div>

              <div className="rounded-2xl border border-white/25 bg-black/20 backdrop-blur-sm p-5 min-h-[210px] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <CreditCard size={20} className="text-white/95" />
                  <p className="text-xs uppercase tracking-wide text-white/80">
                    {cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'Card'}
                  </p>
                </div>
                <p className="text-2xl md:text-3xl font-semibold tracking-[0.16em]">
                  {cardNumber || '•••• •••• •••• ••••'}
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-white/75 uppercase">Kart Sahibi</p>
                    <p className="text-sm font-medium">{cardHolder || 'AD SOYAD'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-white/75 uppercase">Son Kullanım</p>
                    <p className="text-sm font-medium">{cardExpiry || 'MM/YY'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-white/90">
                  <ShieldCheck size={16} />
                  <span>3D Secure simülasyonu (test modu)</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <Lock size={16} />
                  <span>Kart bilgileri backend'e gönderilmez, sadece UI gösterimidir.</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Bütçe Yükleme Ödemesi
                </DialogTitle>
                <DialogDescription>
                  Bu ekran demo amaçlıdır. Onaylandığında tutar doğrudan bakiyeye eklenir.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">Kart Üzerindeki Ad Soyad</label>
                    <input
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.slice(0, 40))}
                      placeholder="Ramazan Nasuhbeyoğlu"
                      className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">Kart Numarası</label>
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm tracking-[0.1em] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">Son Kullanım</label>
                    <input
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">CVV</label>
                    <input
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-gray-50/80 dark:bg-gray-900/70 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Yüklenecek Tutar</span>
                    <span className="font-semibold text-[#08afd5] dark:text-[#6edff3]">{formatTry(normalizedAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-gray-500 dark:text-gray-400">Açıklama</span>
                    <span className="text-gray-700 dark:text-gray-200 truncate max-w-[70%] text-right">{note || 'Belirtilmedi'}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setPaymentModalOpen(false)} disabled={adding}>
                  Vazgeç
                </Button>
                <Button
                  className="brand-btn-primary text-white min-w-[180px]"
                  onClick={handleConfirmPayment}
                  disabled={adding || !canSubmitPayment}
                >
                  {adding ? 'İşleniyor...' : 'Ödemeyi Tamamla'}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
