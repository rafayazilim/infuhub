import React, { useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  FileStack,
  Link2,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Shield,
  UserCircle2,
  UserPlus,
  Users,
} from "lucide-react";
import { auth } from "@/config/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BRAND_DASHBOARD_CENTERED_CLASS,
  BRAND_HERO_CONTENT_INSET,
  BRAND_MAIN_END_PADDING,
} from "@/constants/brandDashboardLayout";
import type { BrandSorumlu } from "@/services/firebaseAuthService";
import type { AppNotification } from "@/services/firebaseNotificationService";

export interface BrandDashboardHeroSnapshot {
  activeCampaigns: number;
  draftCampaigns: number;
  pendingOffers: number;
  acceptedOffers: number;
  totalClicks: number;
}

export interface BrandDashboardHeroProps {
  brandProfile: Record<string, unknown> | null;
  profileLoading: boolean;
  photoUploading: boolean;
  isVerified: boolean;
  isVerificationPending: boolean;
  /** Profil doğrulama talebi reddedildi; yeniden belge yüklenebilir */
  isVerificationRejected?: boolean;
  verificationUploading: boolean;
  offerPendingCount: number;
  notifications?: AppNotification[];
  onNotificationClick?: (notification: AppNotification) => void;
  onMarkAllNotificationsRead?: () => void;
  walletBalance: number;
  formatTry: (n: number) => string;
  onLogoClick: () => void;
  onVerificationClick: () => void;
  onOpenProfileEdit: () => void;
  /** Yetkili / sorumlu kişi ekleme veya güncelleme */
  onOpenSorumluEdit: () => void;
  /** Firebase oturumunu kapat ve yönlendir */
  onSecureLogout: () => void;
  logoutBusy?: boolean;
  onNavigate: (tab: string) => void;
  /** Tam genişlik şeridi: köşe yuvarlaklığı yok, üste yapışık şerit */
  fullBleed?: boolean;
  className?: string;
  snapshot?: BrandDashboardHeroSnapshot | null;
}

function pickPrimarySorumlu(sorumlular: unknown): BrandSorumlu | null {
  if (!sorumlular || typeof sorumlular !== "object") return null;
  const o = sorumlular as Record<string, BrandSorumlu>;
  if (o.birincil && typeof o.birincil === "object") return o.birincil;
  const vals = Object.values(o).filter((v) => v && typeof v === "object" && "firstName" in v);
  return (vals[0] as BrandSorumlu) || null;
}

export function BrandDashboardHero({
  brandProfile,
  profileLoading,
  photoUploading,
  isVerified,
  isVerificationPending,
  isVerificationRejected = false,
  verificationUploading,
  offerPendingCount,
  notifications = [],
  onNotificationClick,
  onMarkAllNotificationsRead,
  walletBalance,
  formatTry,
  onLogoClick,
  onVerificationClick,
  onOpenProfileEdit,
  onOpenSorumluEdit,
  onSecureLogout,
  logoutBusy = false,
  onNavigate,
  fullBleed = false,
  className,
  snapshot = null,
}: BrandDashboardHeroProps) {
  const sorumlu = useMemo(() => pickPrimarySorumlu(brandProfile?.sorumlular), [brandProfile]);
  const brandName = (brandProfile?.brandName as string) || "Marka";
  const email = (brandProfile?.email as string) || "";
  const photoURL = brandProfile?.profilePhotoURL as string | undefined;
  const emailVerified = auth.currentUser?.emailVerified ?? false;
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;
  const notificationBadgeCount = unreadNotificationCount || offerPendingCount;
  const formatNotificationTime = (value: string) => {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return "";
    const diffMinutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    if (diffMinutes < 1) return "şimdi";
    if (diffMinutes < 60) return `${diffMinutes} dk`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} sa`;
    return new Date(value).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden border-[#08afd5]/20 bg-gradient-to-br from-white via-[#f0fafc] to-[#fdf4f8] dark:border-[#6edff3]/15 dark:from-slate-950 dark:via-slate-900/95 dark:to-[#0f1729]",
        fullBleed
          ? "rounded-none border-x-0 border-t-0 border-b shadow-[0_8px_32px_-16px_rgba(8,175,213,0.18)] dark:shadow-[0_12px_40px_-18px_rgba(0,0,0,0.4)]"
          : "rounded-2xl border shadow-[0_20px_50px_-12px_rgba(8,175,213,0.22)] dark:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.55)] md:rounded-3xl",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#08afd5]/25 blur-3xl dark:bg-[#08afd5]/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[#e3447c]/15 blur-3xl dark:bg-[#e3447c]/10"
        aria-hidden
      />

      {/* Üst satır: hero arka planı sidebar’a kadar; metin/aksiyonlar ortalanmış sütunda */}
      <div className="relative pt-4 sm:pt-5 md:pt-6">
        <div className={cn(BRAND_DASHBOARD_CENTERED_CLASS, BRAND_HERO_CONTENT_INSET)}>
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl md:text-4xl">
                Merhaba{profileLoading ? "" : `, ${brandName}`}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-slate-600 dark:text-slate-400 md:text-base">
                Kampanyalarınızı, teklifleri ve bütçeyi tek ekrandan yönetin.
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto lg:flex-col lg:items-end xl:flex-row xl:items-center">
            <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="relative h-11 w-11 rounded-xl border-slate-200/90 bg-white/90 shadow-sm hover:bg-white dark:border-slate-600 dark:bg-slate-900/80"
                    aria-label="Bildirimler"
                  >
                    <Bell size={18} className="text-slate-700 dark:text-slate-200" />
                    {notificationBadgeCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e3447c] px-1 text-[10px] font-bold text-white">
                        {notificationBadgeCount > 9 ? "9+" : notificationBadgeCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[min(calc(100vw-1.5rem),26rem)] overflow-hidden rounded-2xl border-slate-200/90 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
                    <div>
                      <DropdownMenuLabel className="p-0 text-sm font-bold text-slate-900 dark:text-white">
                        Bildirimler
                      </DropdownMenuLabel>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {unreadNotificationCount > 0 ? `${unreadNotificationCount} okunmamış bildirim` : "Yeni bildirim yok"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onMarkAllNotificationsRead}
                      disabled={unreadNotificationCount === 0}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-[#08afd5]/50 hover:text-[#0788a7] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:text-[#6edff3]"
                    >
                      <CheckCheck size={14} />
                      Okundu
                    </button>
                  </div>
                  <div className="max-h-[min(70vh,28rem)] overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                          <Bell size={18} />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Bildirim yok</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Teklif ve içerik hareketleri burada listelenecek.
                        </p>
                      </div>
                    ) : (
                      notifications.slice(0, 12).map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => onNotificationClick?.(notification)}
                          className="group flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-900"
                        >
                          <span
                            className={cn(
                              "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                              notification.read ? "bg-slate-300 dark:bg-slate-700" : "bg-[#08afd5]"
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">
                                {notification.title}
                              </span>
                              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                            </span>
                            <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                              {notification.message}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  {notifications.length > 12 && (
                    <div className="border-t border-slate-200/80 px-4 py-2 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      Son 12 bildirim gösteriliyor.
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="outline"
                className="h-11 gap-2 rounded-xl border-slate-200/90 bg-white/90 px-3 shadow-sm hover:bg-white dark:border-slate-600 dark:bg-slate-900/80"
                onClick={() => onNavigate("budget")}
              >
                <CreditCard size={18} className="text-[#08afd5] dark:text-[#6edff3]" />
                <span className="hidden text-sm font-semibold text-slate-800 dark:text-slate-100 sm:inline">
                  Bütçe
                </span>
                <Badge variant="secondary" className="rounded-lg bg-[#08afd5]/12 text-[#0790b3] dark:bg-[#08afd5]/20 dark:text-[#7ce7ff]">
                  {formatTry(walletBalance)}
                </Badge>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-11 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 pl-1.5 pr-3 shadow-sm transition hover:border-[#08afd5]/40 hover:shadow-md",
                      "dark:border-slate-600 dark:bg-slate-900/90 dark:hover:border-[#6edff3]/35"
                    )}
                  >
                    <span className="relative h-9 w-9 overflow-hidden rounded-lg border border-slate-200/80 dark:border-slate-600">
                      {photoURL ? (
                        <img src={photoURL} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-sm font-bold text-white">
                          {brandName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {photoUploading && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        </span>
                      )}
                    </span>
                    <span className="hidden max-w-[120px] truncate text-left text-sm font-semibold text-slate-800 dark:text-slate-100 sm:block">
                      Hesap
                    </span>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Hesap</DropdownMenuLabel>
                  <div className="px-2 pb-2">
                    <p className="truncate text-sm font-medium text-foreground">{brandName}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Mail size={12} />
                      {email || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          emailVerified
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                        )}
                      >
                        E-posta {emailVerified ? "doğrulandı" : "doğrulanmadı"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          isVerified
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-slate-300 dark:border-slate-600"
                        )}
                      >
                        Profil {isVerified ? "onaylı" : "doğrulanmadı"}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogoClick}>Marka logosunu değiştir</DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenProfileEdit}>Genel profili düzenle</DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenSorumluEdit}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sorumlu ekle
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onVerificationClick}
                    disabled={verificationUploading || isVerificationPending || isVerified}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {isVerified
                      ? "Profil doğrulanmış"
                      : isVerificationPending
                        ? "Doğrulama beklemede"
                        : verificationUploading
                          ? "Yükleniyor..."
                          : isVerificationRejected
                            ? "Yeniden doğrulama gönder"
                            : "Vergi levhası ile doğrula"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onSecureLogout}
                    disabled={logoutBusy}
                    className="text-red-600 focus:text-red-600 dark:text-red-400"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {logoutBusy ? "Çıkılıyor…" : "Güvenli çıkış"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Yetkili + özet kartları: ana gövde ile aynı max-width hizası */}
      {(sorumlu || snapshot) && (
        <div className="mt-5 border-t border-slate-200/60 pb-5 pt-5 dark:border-slate-700/50 md:mt-6 md:pb-7 md:pt-6">
            <div className={cn(BRAND_MAIN_END_PADDING, "min-w-0")}>
            <div className={cn(BRAND_DASHBOARD_CENTERED_CLASS, "min-w-0", BRAND_HERO_CONTENT_INSET)}>
            <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-stretch md:gap-4 lg:gap-4">
            {sorumlu && (
              <div className="flex w-full shrink-0 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2.5 dark:border-slate-700/60 dark:bg-slate-900/55 md:max-w-[16.5rem]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#08afd5]/20 to-[#e3447c]/15 text-[#08afd5] dark:from-[#08afd5]/25 dark:to-[#e3447c]/20 dark:text-[#6edff3]">
                  <UserCircle2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Yetkili kişi
                  </p>
                  <p className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-white">
                    {sorumlu.firstName} {sorumlu.lastName}
                  </p>
                  <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">{sorumlu.title}</p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-500">{sorumlu.phone}</p>
                </div>
              </div>
            )}

            {!sorumlu && snapshot && (
              <div className="flex w-full min-w-0 flex-1 flex-col justify-center gap-2 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/50 px-3 py-2.5 dark:border-amber-700/50 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between md:max-w-md">
                <div className="flex min-w-0 items-start gap-2">
                  <UserPlus size={18} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                      Yetkili kişi
                    </p>
                    <p className="text-sm text-amber-950/90 dark:text-amber-100/90">
                      Henüz sorumlu bilgisi eklenmedi. Teklif ve iletişim için eklemenizi öneririz.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                  onClick={onOpenSorumluEdit}
                >
                  Sorumlu ekle
                </Button>
              </div>
            )}

            {snapshot && (
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
                <button
                  type="button"
                  onClick={() => onNavigate("campaigns")}
                  className="flex min-h-[4.25rem] flex-col items-start gap-0.5 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 text-left transition hover:border-[#08afd5]/40 hover:bg-white/90 dark:border-slate-700/60 dark:bg-slate-900/45 dark:hover:border-[#6edff3]/35 dark:hover:bg-slate-900/70"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <Megaphone size={12} className="text-[#08afd5] dark:text-[#6edff3]" />
                    Aktif kampanya
                  </span>
                  <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{snapshot.activeCampaigns}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("campaigns")}
                  className="flex min-h-[4.25rem] flex-col items-start gap-0.5 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 text-left transition hover:border-[#08afd5]/40 hover:bg-white/90 dark:border-slate-700/60 dark:bg-slate-900/45 dark:hover:border-[#6edff3]/35 dark:hover:bg-slate-900/70"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <FileStack size={12} className="text-[#e3447c] dark:text-[#f59ab8]" />
                    Taslak
                  </span>
                  <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{snapshot.draftCampaigns}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("offers")}
                  className="flex min-h-[4.25rem] flex-col items-start gap-0.5 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 text-left transition hover:border-[#08afd5]/40 hover:bg-white/90 dark:border-slate-700/60 dark:bg-slate-900/45 dark:hover:border-[#6edff3]/35 dark:hover:bg-slate-900/70"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                    Bekleyen teklif
                  </span>
                  <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{snapshot.pendingOffers}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("offers")}
                  className="flex min-h-[4.25rem] flex-col items-start gap-0.5 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 text-left transition hover:border-[#08afd5]/40 hover:bg-white/90 dark:border-slate-700/60 dark:bg-slate-900/45 dark:hover:border-[#6edff3]/35 dark:hover:bg-slate-900/70"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                    Kabul edilen
                  </span>
                  <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{snapshot.acceptedOffers}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("tracking")}
                  className="col-span-2 flex min-h-[4.25rem] flex-col items-start gap-0.5 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 text-left transition hover:border-[#08afd5]/40 hover:bg-white/90 dark:border-slate-700/60 dark:bg-slate-900/45 dark:hover:border-[#6edff3]/35 dark:hover:bg-slate-900/70 sm:col-span-1 lg:col-span-1"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <MousePointerClick size={12} className="text-cyan-600 dark:text-cyan-400" />
                    Tıklama (linkler)
                  </span>
                  <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {snapshot.totalClicks.toLocaleString("tr-TR")}
                  </span>
                </button>
              </div>
            )}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const quickItems = [
  { id: "create-campaign", label: "Kampanya oluştur", icon: Megaphone, accent: "from-[#08afd5] to-[#0698b8]" },
  { id: "campaigns", label: "Kampanyalar", icon: Briefcase, accent: "from-[#e3447c]/90 to-[#c7386a]" },
  { id: "offers", label: "Influencer teklifleri", icon: Users, accent: "from-[#08afd5]/80 to-[#e3447c]/70" },
  { id: "budget", label: "Bütçe & harcama", icon: CreditCard, accent: "from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800" },
  { id: "messages", label: "Mesajlar", icon: MessageSquare, accent: "from-violet-600 to-indigo-600" },
  { id: "tracking", label: "Takip linkleri", icon: Link2, accent: "from-teal-600 to-cyan-600" },
] as const;

export type BrandDashboardQuickActionId = (typeof quickItems)[number]["id"];

export function BrandDashboardQuickActions({
  onAction,
}: {
  onAction: (id: BrandDashboardQuickActionId) => void;
}) {
  return (
    <div className="mt-5 md:mt-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Hızlı erişim
      </p>
      <div className="grid grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {quickItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAction(item.id)}
              className={cn(
                "group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-left shadow-sm transition-all",
                "hover:-translate-y-0.5 hover:border-[#08afd5]/35 hover:shadow-lg hover:shadow-[#08afd5]/10",
                "dark:border-slate-700/80 dark:bg-slate-900/70 dark:hover:border-[#6edff3]/30"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-inner",
                  item.accent
                )}
              >
                <Icon size={20} strokeWidth={2} />
              </span>
              <span className="text-xs font-semibold leading-snug text-slate-800 dark:text-slate-100 sm:text-sm">{item.label}</span>
              <span
                className="pointer-events-none absolute bottom-0 right-0 h-16 w-16 translate-x-1/4 translate-y-1/4 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity group-hover:opacity-40"
                style={{ background: "linear-gradient(135deg, #08afd5, #e3447c)" }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
