import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  XCircle,
} from "lucide-react";
import { auth } from "@/config/firebase";
import { computeBrandOptimizationScore } from "@/lib/brandOptimizationScore";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface BrandDashboardOptimizationProps {
  brandProfile: Record<string, unknown> | null;
  isVerified: boolean;
  activeCampaigns: number;
  draftCampaigns: number;
  offerTotal: number;
  offerAccepted: number;
  walletLoadedTotal: number;
  totalClicks: number;
  className?: string;
  onNavigateToSection?: (section: string) => void;
}

export function BrandDashboardOptimization({
  brandProfile,
  isVerified,
  activeCampaigns,
  draftCampaigns,
  offerTotal,
  offerAccepted,
  walletLoadedTotal,
  totalClicks,
  className,
  onNavigateToSection,
}: BrandDashboardOptimizationProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(auth.currentUser?.emailVerified ?? false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setEmailVerified(u?.emailVerified ?? false);
    });
    return unsub;
  }, []);

  const result = useMemo(
    () =>
      computeBrandOptimizationScore({
        brandProfile,
        isVerified,
        activeCampaigns,
        draftCampaigns,
        offerTotal,
        offerAccepted,
        walletLoadedTotal,
        totalClicks,
        emailVerified,
      }),
    [
      brandProfile,
      isVerified,
      activeCampaigns,
      draftCampaigns,
      offerTotal,
      offerAccepted,
      walletLoadedTotal,
      totalClicks,
      emailVerified,
    ]
  );

  const handbookDone = result.handbook.filter((h) => h.done).length;
  const handbookTotal = result.handbook.length;
  const nextStep = result.handbook.find((h) => !h.done);
  const getHandbookTarget = (title: string) => {
    const normalized = title.toLocaleLowerCase("tr-TR");
    if (normalized.includes("kampanya")) return "campaigns";
    if (normalized.includes("cüzdan") || normalized.includes("bütçe")) return "budget";
    if (normalized.includes("teklif")) return "offers";
    if (normalized.includes("takip") || normalized.includes("performans")) return "tracking";
    if (
      normalized.includes("doğrulay") ||
      normalized.includes("logo") ||
      normalized.includes("şirket") ||
      normalized.includes("yetkili") ||
      normalized.includes("e-posta")
    ) {
      return "settings";
    }
    return "dashboard";
  };

  const handleHandbookClick = (title: string) => {
    setGuideOpen(false);
    onNavigateToSection?.(getHandbookTarget(title));
  };
  const handleMetricClick = (name: string) => {
    setDetailOpen(false);
    onNavigateToSection?.(getHandbookTarget(name));
  };

  return (
    <>
      <Card
        className={cn(
          "mac-surface flex h-full min-h-0 flex-col p-4 transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(8,175,213,0.14)]",
          className
        )}
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Optimizasyon & rehber</h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Skor ve puan dağılımı soldaki ikonla; adım adım rehber aşağıdaki düğmede.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Optimizasyon skoru ve puan detayı"
          >
            <BarChart3 size={14} />
          </button>
        </div>

        <div
          className="mb-3 shrink-0 cursor-pointer rounded-xl border border-gray-200/80 bg-gradient-to-r from-[#08afd5]/8 to-[#e3447c]/8 p-3 transition-colors hover:border-[#08afd5]/35 dark:border-gray-700/80 dark:from-[#08afd5]/12 dark:to-[#e3447c]/10 dark:hover:border-[#6edff3]/35"
          onClick={() => setDetailOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setDetailOpen(true);
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Optimizasyon skoru</p>
            <ChevronRight size={16} className="shrink-0 text-gray-400" aria-hidden />
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#08afd5] to-[#e3447c] transition-all duration-500"
              style={{ width: `${result.score}%` }}
            />
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
            %{result.score} — {result.message}
          </p>
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full flex-col gap-0.5 border-gray-200 py-2.5 text-xs font-medium sm:text-sm dark:border-gray-700"
            onClick={() => setGuideOpen(true)}
          >
            <span className="flex items-center justify-center gap-1.5">
              <BookOpen size={14} className="text-[#08afd5] dark:text-[#7ce7ff]" />
              Rehber özeti ve tüm adımlar
            </span>
            <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
              {handbookDone}/{handbookTotal} tamamlandı
              {result.suggestions.length > 0 ? ` · ${result.suggestions.length} öncelikli öneri` : ""}
            </span>
          </Button>
        </div>
      </Card>

      {/* Puan dağılımı */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.25rem)] max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white p-4 text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <BarChart3 className="text-[#08afd5]" size={24} />
              Optimizasyon skoru — detay
            </DialogTitle>
            <DialogDescription className="text-left">
              Marka paneli hesap sağlığı ve puan dağılımı
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(65dvh,520px)] space-y-4 overflow-y-auto py-2 pr-1 mac-scrollbar">
            <div className="rounded-xl border border-[#08afd5]/25 bg-[#08afd5]/10 p-4 dark:border-[#6edff3]/25 dark:bg-[#08afd5]/15">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Toplam skor</p>
                <p className="text-2xl font-bold text-[#08afd5] dark:text-[#7ce7ff]">%{result.score}</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-[#08afd5] to-[#e3447c] transition-all duration-500"
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{result.message}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Puan dağılımı</p>
              {result.metrics.map((metric, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleMetricClick(metric.name)}
                  className={`group w-full rounded-lg border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#08afd5]/55 hover:shadow-[0_10px_28px_rgba(8,175,213,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5]/55 ${
                    metric.completed
                      ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
                      : metric.points > 0
                        ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20"
                        : "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {metric.completed ? (
                          <CheckCircle2 size={18} className="shrink-0 text-green-600 dark:text-green-400" />
                        ) : metric.points > 0 ? (
                          <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <XCircle size={18} className="shrink-0 text-gray-400 dark:text-gray-500" />
                        )}
                        <p className="text-sm font-medium text-gray-900 transition-colors group-hover:text-[#08afd5] dark:text-gray-100 dark:group-hover:text-[#7ce7ff]">{metric.name}</p>
                      </div>
                      <p className="ml-6 text-xs text-gray-600 dark:text-gray-400">{metric.description}</p>
                      <p
                        className={`ml-6 mt-1 text-xs ${
                          metric.completed
                            ? "text-green-600 dark:text-green-400"
                            : metric.points > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {metric.status}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {metric.points}/{metric.maxPoints}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">puan</p>
                    </div>
                    <ChevronRight size={15} className="mt-0.5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#08afd5]" />
                  </div>
                </button>
              ))}
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Rehber özeti + tüm adımlar */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white p-4 text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <BookOpen className="text-[#08afd5]" size={22} />
              Rehber özeti ve adımlar
            </DialogTitle>
            <DialogDescription className="text-left">
              Panelde sırayla tamamlamanız gereken işlemler ve öncelikli öneriler
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(68dvh,560px)] space-y-4 overflow-y-auto py-1 pr-1 mac-scrollbar">
            <div className="rounded-xl border border-gray-200/80 bg-white/80 p-3 dark:border-gray-700/80 dark:bg-gray-900/50">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Rehber özeti
              </p>
              <p className="mt-1.5 text-sm text-gray-800 dark:text-gray-200">
                <span className="font-semibold text-[#08afd5] dark:text-[#7ce7ff]">
                  {handbookDone}/{handbookTotal}
                </span>{" "}
                adım tamamlandı
                {result.suggestions.length > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-medium text-amber-800 dark:text-amber-200">
                      {result.suggestions.length} öncelikli öneri
                    </span>
                  </>
                )}
              </p>
              {nextStep && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Sıradaki:</span> {nextStep.title}
                </p>
              )}
              {!nextStep && handbookTotal > 0 && (
                <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Tüm rehber adımları tamam.
                </p>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Yapılacaklar rehberi
              </p>
              <ul className="mt-2 space-y-2">
                {result.handbook.map((item, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleHandbookClick(item.title)}
                      className={`group flex w-full gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all hover:-translate-y-0.5 hover:border-[#08afd5]/55 hover:shadow-[0_10px_28px_rgba(8,175,213,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5]/55 ${
                        item.done
                          ? "border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/25"
                          : "border-gray-200/80 bg-white/70 dark:border-gray-700/80 dark:bg-gray-900/50"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {item.done ? (
                          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full border border-gray-300 text-[10px] font-medium text-gray-400 dark:border-gray-600">
                            {idx + 1}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold text-gray-900 transition-colors group-hover:text-[#08afd5] dark:text-gray-100 dark:group-hover:text-[#7ce7ff]">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-gray-600 dark:text-gray-400">
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight size={14} className="mt-0.5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#08afd5]" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {result.suggestions.length > 0 && (
              <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-900 dark:text-amber-100">
                  <Lightbulb size={12} />
                  Öncelikli öneriler
                </p>
                <ul className="space-y-1.5">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-amber-900/90 dark:text-amber-100/90">
                      <span className="text-[#08afd5] dark:text-[#7ce7ff]">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}
