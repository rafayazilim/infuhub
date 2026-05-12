import React from "react";
import { Layers, Sparkles, CheckCircle2, FileText, MessageCircle, CreditCard, Megaphone, CalendarDays, BarChart3, ShieldCheck, Users2, ClipboardList, Handshake, Wallet } from "lucide-react";

const fragmentedItems = [
  { label: "Influencer anlaşmaları", icon: Handshake },
  { label: "Teklif & revizyonlar", icon: FileText },
  { label: "Faturalandırma", icon: Wallet },
  { label: "Kampanya operasyonları", icon: Megaphone },
  { label: "Creator iletişimi", icon: MessageCircle },
  { label: "İçerik onayları", icon: ShieldCheck },
  { label: "Ödeme takibi", icon: CreditCard },
  { label: "Raporlama & analiz", icon: BarChart3 },
  { label: "Görev takibi", icon: ClipboardList },
  { label: "Marka iş birliği", icon: Users2 },
  { label: "Müşteri / partner", icon: Users2 },
  { label: "Kampanya planlama", icon: CalendarDays },
];

const unifiedItems = [
  { label: "Tek platformda tüm operasyonlar", icon: Layers },
  { label: "Tek giriş, tek iş akışı", icon: CheckCircle2 },
  { label: "Sözleşme + teklif + fatura", icon: FileText },
  { label: "Kampanya planlama ve yürütme", icon: CalendarDays },
  { label: "İçerik üretimi ve onayı", icon: ShieldCheck },
  { label: "Ödeme ve bütçe görünürlüğü", icon: Wallet },
  { label: "Gerçek zamanlı raporlama", icon: BarChart3 },
  { label: "Ekip, ajans, marka koordinasyonu", icon: Users2 },
];

export const ComparisonSection: React.FC = () => {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white/45" />
        <div className="absolute -top-24 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[#08afd5]/18 blur-[120px]" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[420px] w-[420px] rounded-full bg-[#e3447c]/18 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/20 px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur">
            <Sparkles size={14} />
            Tek platform yaklaşımı
          </div>
          <h2 className="mt-6 text-4xl sm:text-5xl lg:text-[3rem] font-extrabold text-slate-900">
            Parçalı araçlardan çıkın, tüm influencer operasyonlarını INFUHUB’da toplayın.
          </h2>
          <p className="mt-4 max-w-2xl text-sm sm:text-base text-slate-600">
            INFUHUB; anlaşmalar, teklif yönetimi, faturalandırma, kampanya planlama, ödeme takibi,
            içerik onayları ve raporlamayı tek bir sistemde birleştirir.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Fragmented */}
          <div className="relative rounded-3xl border border-slate-200/70 bg-white/80 backdrop-blur-xl p-6 lg:p-8 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <div className="flex items-center gap-3 text-slate-700">
              <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <Layers size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Parçalı Akış</p>
                <p className="text-lg font-semibold text-slate-900">Dağınık araçlar, çoklu süreç</p>
              </div>
            </div>

            <div className="mt-6 relative">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fragmentedItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                  <div
                    key={`${item.label}-${idx}`}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-xs text-slate-600 shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
                    style={{ transform: `translateY(${(idx % 3) * 4}px)` }}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <Icon size={12} />
                    </span>
                    <span>{item.label}</span>
                  </div>
                  );
                })}
              </div>
              <div className="absolute -bottom-4 left-4 right-4 h-12 rounded-[22px] bg-white/40 blur-[18px]" />
            </div>
          </div>

          {/* Unified */}
          <div className="relative rounded-3xl border border-[#08afd5]/50 bg-white/95 backdrop-blur-2xl p-6 lg:p-8 shadow-[0_22px_70px_rgba(8,175,213,0.25)]">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#08afd5]/10 via-transparent to-[#e3447c]/10 opacity-70" />
            <div className="relative">
              <div className="flex items-center gap-3 text-slate-900">
                <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <img src="/pics/infulogo.png" alt="INFUHUB" className="h-4 w-auto opacity-80" />
                    INFUHUB
                  </div>
                  <p className="text-lg font-semibold text-slate-900">Tek sistem, bütün iş akışı</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-[#f7fbff] p-5 shadow-[0_16px_40px_rgba(8,175,213,0.12)]">
                <p className="text-sm font-semibold text-slate-900 mb-4">Bir panelde hepsi</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unifiedItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={`${item.label}-${idx}`}
                        className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-xs text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#08afd5]/10 text-[#08afd5]">
                          <Icon size={12} />
                        </span>
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-xl bg-gradient-to-r from-[#08afd5] to-[#0b96b8] px-4 py-3 text-sm font-semibold text-white text-center shadow-[0_10px_24px_rgba(8,175,213,0.35)]">
                  Tek platform, tek görünüm, tek kontrol
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
