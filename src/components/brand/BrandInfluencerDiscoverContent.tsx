import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  LayoutGrid,
  Loader2,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserSearch,
  Wallet,
} from "lucide-react";

import type { FirebaseCampaign } from "@/services/firebaseCampaignService";
import { getEffectiveCampaignStatus } from "@/services/firebaseCampaignService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RegistrationPlatformIcon } from "@/components/shared/RegistrationPlatformIcon";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getOffersByInfluencer } from "@/services/firebaseOfferService";
import {
  type DiscoverInfluencer,
  collectCategoriesForFilter,
} from "@/lib/veritabaniInfluencers";
import { subscribeDiscoverInfluencerCatalog } from "@/services/firebaseDiscoverInfluencerService";
import {
  migrateDiscoverSavedFromLegacyLocalStorage,
  setDiscoverSavedInfluencer,
  subscribeDiscoverSavedInfluencers,
} from "@/services/firebaseDiscoverSavedService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function nf(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} B` : `${n}`;
}

type DiscoverRail = "search" | "saved";
type SortMode = "recommended" | "followers_desc" | "followers_asc" | "name_asc";
type DetailStats = {
  avgPrice: number;
  acceptedCount: number;
  completedCount: number;
  activeCount: number;
};

export interface BrandInfluencerDiscoverContentProps {
  brandId: string;
  campaigns: FirebaseCampaign[];
  /** Influencer Teklifleri modalıyla aynı `createOffer` akışını açar */
  onOpenInfluencerOfferModal?: (campaign: FirebaseCampaign, influencerId: string) => void;
  canOperate?: boolean;
}

export function BrandInfluencerDiscoverContent({
  brandId,
  campaigns,
  onOpenInfluencerOfferModal,
  canOperate = true,
}: BrandInfluencerDiscoverContentProps) {
  const { toast } = useToast();
  const [rail, setRail] = useState<DiscoverRail>("search");

  const [catalog, setCatalog] = useState<DiscoverInfluencer[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => collectCategoriesForFilter(catalog), [catalog]);

  useEffect(() => {
    setCatalogLoading(true);
    const unsub = subscribeDiscoverInfluencerCatalog(
      (rows) => {
        setCatalog(rows);
        setCatalogError(null);
        setCatalogLoading(false);
      },
      (err) => {
        console.error("[discover]", err);
        setCatalog([]);
        const msg =
          err && typeof err === "object" && "message" in err && typeof (err as Error).message === "string"
            ? (err as Error).message
            : "Veriler şu anda yüklenemiyor. Oturumu ve bağlantınızı kontrol edin.";
        setCatalogError(msg);
        setCatalogLoading(false);
      }
    );
    return unsub;
  }, []);

  const [query, setQuery] = useState("");
  const [followers, setFollowers] = useState("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortMode>("recommended");
  const [pageSize, setPageSize] = useState<20 | 40>(20);
  const [page, setPage] = useState(1);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailInfl, setDetailInfl] = useState<DiscoverInfluencer | null>(null);
  const [detailStats, setDetailStats] = useState<DetailStats | null>(null);
  const [detailStatsLoading, setDetailStatsLoading] = useState(false);
  const visibleSavedCount = useMemo(
    () => catalog.reduce((sum, p) => sum + (savedIds.has(p.id) ? 1 : 0), 0),
    [catalog, savedIds]
  );

  useEffect(() => {
    if (!brandId.trim()) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await migrateDiscoverSavedFromLegacyLocalStorage(brandId);
      } catch (e) {
        console.error("[discoverSaved migrate]", e);
      }
      if (cancelled) return;
      unsub = subscribeDiscoverSavedInfluencers(brandId, setSavedIds, (e) => {
        console.error("[discoverSaved]", e);
      });
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [brandId]);

  const campaignsForCollaboration = useMemo(() => {
    return campaigns.filter((c) => {
      const st = getEffectiveCampaignStatus(c);
      return st !== "tamamlandı" && st !== "iptal";
    });
  }, [campaigns]);

  const toggleSave = useCallback(
    async (id: string, infl?: DiscoverInfluencer) => {
      const wasSaved = savedIds.has(id);
      const nextSaved = !wasSaved;
      const prev = new Set(savedIds);
      const next = new Set(savedIds);
      if (nextSaved) next.add(id);
      else next.delete(id);
      setSavedIds(next);
      try {
        await setDiscoverSavedInfluencer(brandId, id, nextSaved);
        toast({
          title: nextSaved ? "Listeye kaydedildi" : "Listeden kaldırıldı",
          description: infl?.name ?? id,
        });
      } catch (e: unknown) {
        setSavedIds(prev);
        const msg =
          e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
            ? (e as Error).message
            : "Kayıt güncellenemedi.";
        toast({
          variant: "destructive",
          title: "Kayıt hatası",
          description: msg,
        });
      }
    },
    [brandId, savedIds, toast]
  );

  const openCollaborationOffer = useCallback(
    (campaign: FirebaseCampaign | null, inf: DiscoverInfluencer) => {
      if (!canOperate) {
        toast({
          variant: "destructive",
          title: "İşlem kapalı",
          description: "Hesabınız doğrulanana kadar teklif gönderemezsiniz.",
        });
        return;
      }
      if (!campaign) {
        toast({
          variant: "destructive",
          title: "Uygun kampanya yok",
          description: "Tamamlanmamış bir kampanya oluşturun veya süresi devam eden bir kampanyayı seçin.",
        });
        return;
      }
      onOpenInfluencerOfferModal?.(campaign, inf.id);
    },
    [canOperate, onOpenInfluencerOfferModal, toast]
  );

  const filteredBase = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const list = rail === "search" ? catalog : catalog.filter((p) => savedIds.has(p.id));
    return list.filter((p) => {
      if (q) {
        const hay = `${p.name} ${p.handle} ${p.categories.join(" ")} ${p.bio || ""}`
          .toLocaleLowerCase("tr");
        if (!hay.includes(q)) return false;
      }
      if (followers === "nano" && !(p.followersTotal < 10_000)) return false;
      if (followers === "micro" && !(p.followersTotal >= 10_000 && p.followersTotal < 100_000))
        return false;
      if (
        followers === "mid" &&
        !(p.followersTotal >= 100_000 && p.followersTotal < 1_000_000)
      )
        return false;
      if (followers === "mega" && !(p.followersTotal >= 1_000_000)) return false;

      if (platformFilter !== "all" && p.platformKey !== platformFilter) return false;

      if (categoryFilter !== "all") {
        if (!p.categories.some((c) => c === categoryFilter)) return false;
      }

      return true;
    });
  }, [
    rail,
    catalog,
    savedIds,
    query,
    followers,
    platformFilter,
    categoryFilter,
  ]);

  const sortedFiltered = useMemo(() => {
    const arr = [...filteredBase];
    const cmpName = (a: DiscoverInfluencer, b: DiscoverInfluencer) =>
      a.name.localeCompare(b.name, "tr");

    switch (sortBy) {
      case "followers_desc":
        arr.sort((a, b) => b.followersTotal - a.followersTotal || cmpName(a, b));
        break;
      case "followers_asc":
        arr.sort((a, b) => a.followersTotal - b.followersTotal || cmpName(a, b));
        break;
      case "name_asc":
        arr.sort(cmpName);
        break;
      default: {
        arr.sort((a, b) => {
          const score = (x: DiscoverInfluencer) =>
            (x.accountStatus === "onaylandı" ? 1_000_000_000 : 0) + x.followersTotal;
          return score(b) - score(a) || cmpName(a, b);
        });
      }
    }
    return arr;
  }, [filteredBase, sortBy]);

  const totalCount = sortedFiltered.length;
  const totalPages =
    totalCount === 0 ? 1 : Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    setPage(1);
  }, [
    rail,
    query,
    followers,
    platformFilter,
    categoryFilter,
    sortBy,
    pageSize,
  ]);

  useEffect(() => {
    const tp = totalCount === 0 ? 1 : Math.max(1, Math.ceil(totalCount / pageSize));
    setPage((prev) => Math.min(prev, tp));
  }, [totalCount, pageSize]);

  const effectivePage = totalCount === 0 ? 1 : Math.min(Math.max(1, page), totalPages);

  const paginated = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, effectivePage, pageSize]);

  const resetFilters = useCallback(() => {
    setQuery("");
    setFollowers("all");
    setPlatformFilter("all");
    setCategoryFilter("all");
    setSortBy("recommended");
    setPage(1);
  }, []);

  const formatTry = useCallback((value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "Veri yok";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
    }).format(value);
  }, []);

  const estimateFeeRange = useCallback((p: DiscoverInfluencer) => {
    const base = Math.max(1000, Math.round((p.followersTotal || 0) * 0.035));
    const low = Math.round(base / 250) * 250;
    const high = Math.max(low + 1000, Math.round(base * 1.8 / 250) * 250);
    return `${formatTry(low)} - ${formatTry(high)}`;
  }, [formatTry]);

  const openProfile = useCallback((p: DiscoverInfluencer) => {
    setDetailInfl(p);
    setDetailStats(null);
    setDetailOpen(true);
    setDetailStatsLoading(true);
    void getOffersByInfluencer(p.id)
      .then((offers) => {
        const accepted = offers.filter((o) => o.status === "kabul");
        const completed = accepted.filter((o) => o.contentApproved === true);
        const totalAcceptedPrice = accepted.reduce((sum, offer) => sum + (Number(offer.price) || 0), 0);
        setDetailStats({
          acceptedCount: accepted.length,
          completedCount: completed.length,
          activeCount: accepted.length - completed.length,
          avgPrice: accepted.length > 0 ? Math.round(totalAcceptedPrice / accepted.length) : 0,
        });
      })
      .catch((error) => {
        console.error("Influencer teklif özeti yüklenemedi:", error);
        setDetailStats({ acceptedCount: 0, completedCount: 0, activeCount: 0, avgPrice: 0 });
      })
      .finally(() => setDetailStatsLoading(false));
  }, []);

  const renderCard = (p: DiscoverInfluencer) => {
    const saved = savedIds.has(p.id);
    return (
      <ContextMenu key={p.id}>
        <ContextMenuTrigger asChild>
          <article
            role="button"
            tabIndex={0}
            onClick={() => openProfile(p)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openProfile(p);
            }}
            className="group flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#08afd5]/45 hover:shadow-xl hover:shadow-[#08afd5]/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0 border border-slate-200 ring-4 ring-[#08afd5]/10">
                  <AvatarImage src={p.photoUrl} alt="" loading="lazy" />
                  <AvatarFallback>{p.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-bold text-slate-950">{p.name}</p>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#1877f2]" aria-hidden />
                  </div>
                  <p className="truncate text-xs font-medium text-slate-500">{p.handle}</p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {p.countryLabel}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="max-w-[7rem] shrink-0 truncate rounded-full border-[#08afd5]/25 bg-[#08afd5]/10 text-[10px] text-[#067a92]">
                {p.tag}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 px-3 py-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Takipçi</p>
                <p className="text-sm font-black text-slate-950">{nf(p.followersTotal)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Erişim</p>
                <p className="text-sm font-black text-slate-950">{p.reachLabel}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Etkileşim</p>
                <p className="text-sm font-black text-[#e3447c]">{p.engagementPct}%</p>
              </div>
            </div>

            <div className="mt-3 flex min-h-[3.25rem] flex-wrap gap-1.5">
              {p.categories.slice(0, 3).map((cat) => (
                <span key={cat} className="h-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {cat}
                </span>
              ))}
              {p.categories.length === 0 && (
                <span className="h-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Kategori yok</span>
              )}
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700">
                <RegistrationPlatformIcon platformId={p.platformKey} size={18} />
                <span className="capitalize">{p.platformKey}</span>
              </div>
              <div className="flex flex-1 items-center justify-end gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn("h-8 w-8 rounded-full bg-white", saved && "border-amber-300/70 bg-amber-50")}
                      aria-label={saved ? "Kaydı kaldır" : "Kaydet"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(p.id, p);
                      }}
                    >
                      <Bookmark className={cn("h-4 w-4", saved ? "fill-amber-400 text-amber-700" : "")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Kaydedilenlere ekle</TooltipContent>
                </Tooltip>

                {campaignsForCollaboration.length === 0 ? (
                  <Button type="button" variant="outline" size="sm" className="h-8 cursor-not-allowed rounded-full border-[#08afd5]/40 px-3 text-xs font-semibold text-[#0899b8] opacity-60" disabled onClick={(e) => e.stopPropagation()}>
                    İşbirliği
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canOperate}
                        className="h-8 rounded-full border-[#08afd5]/40 bg-white px-3 text-xs font-semibold text-[#0899b8] hover:bg-[#08afd5] hover:text-white"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        İşbirliği
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))] max-h-[min(280px,calc(100vh-8rem))] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Kampanya seç</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {campaignsForCollaboration.map((c) => (
                        <DropdownMenuItem key={c.id} className="cursor-pointer text-xs leading-snug" onClick={() => openCollaborationOffer(c, p)}>
                          <span className="line-clamp-2">{c.title}</span>
                          <span className="text-muted-foreground">{` · #${c.id.slice(-4)}`}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </article>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel className="text-xs">{p.name}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => openProfile(p)}>Profili görüntüle</ContextMenuItem>
          <ContextMenuItem onSelect={() => toggleSave(p.id, p)}>
            {saved ? "Listeden çıkar" : "Kaydedilen listesine ekle"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const rangeLabel =
    totalCount === 0
      ? "0 kayıt"
      : `${(effectivePage - 1) * pageSize + 1}-${Math.min(effectivePage * pageSize, totalCount)} / ${totalCount}`;

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] w-full flex-1 flex-col overflow-hidden md:min-h-[100dvh]">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="border-b border-slate-200/80 bg-white px-4 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black leading-snug tracking-tight text-slate-950 md:text-2xl">
                {rail === "search"
                  ? "Kampanyanıza uygun üreticiyi keşfedin"
                  : "Kayıtlı içerik üreticileriniz"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Doğrulanmış influencerları takipçi, platform ve kategoriye göre hızlıca karşılaştırın.
              </p>
              {catalogError ? (
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90 md:text-[13px]">{catalogError}</p>
              ) : null}
            </div>
            <div
	              className="flex w-full shrink-0 gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-1 sm:mt-0 sm:w-auto sm:self-start sm:justify-end"
              role="tablist"
              aria-label="Liste görünümü"
            >
              <button
                type="button"
                role="tab"
                aria-selected={rail === "search"}
                onClick={() => setRail("search")}
                className={cn(
                  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-left text-[13px] font-medium transition-colors sm:min-h-0 sm:flex-initial sm:justify-start sm:py-1.5",
                  rail === "search"
	                    ? "bg-white text-[#067a92] shadow-sm ring-1 ring-[#08afd5]/45"
	                    : "text-slate-600 hover:bg-white"
                )}
              >
                <Search className="h-[17px] w-[17px] shrink-0 text-[#08afd5]" />
                <span className="truncate max-sm:hidden">İçerik üreticisi ara</span>
                <span className="truncate sm:hidden">Keşfet</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rail === "saved"}
                onClick={() => setRail("saved")}
                className={cn(
                  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-left text-[13px] font-medium transition-colors sm:min-h-0 sm:flex-initial sm:justify-start sm:py-1.5",
                  rail === "saved"
	                    ? "bg-white text-[#067a92] shadow-sm ring-1 ring-[#08afd5]/45"
	                    : "text-slate-600 hover:bg-white"
                )}
              >
                <Bookmark className="h-[17px] w-[17px] shrink-0 text-amber-400" />
                <span className="truncate">
                  Kaydedilenler
                  {visibleSavedCount > 0 ? ` (${visibleSavedCount})` : ""}
                </span>
              </button>
            </div>
          </div>

          {rail === "search" && !catalogLoading && (
            <div className="mt-4 space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="İsim, kullanıcı adı, kategori veya anahtar kelime"
	                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-[#08afd5]" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Filtreler
                  </span>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={resetFilters}>
                  Sıfırla
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Takipçi bandı</Label>
                  <Select value={followers} onValueChange={setFollowers}>
                    <SelectTrigger className="h-9 rounded-full text-xs">
                      <SelectValue placeholder="Takipçiler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm düzeyler</SelectItem>
                      <SelectItem value="nano">&lt; 10 B</SelectItem>
                      <SelectItem value="micro">10 B – 100 B</SelectItem>
                      <SelectItem value="mid">100 B – 1 Mn</SelectItem>
                      <SelectItem value="mega">1 Mn+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Platform</Label>
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="h-9 rounded-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm platformlar</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Kategori</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-9 rounded-full text-xs">
                      <SelectValue placeholder="İlgi alanı" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      <SelectItem value="all">Tüm ilgi alanları</SelectItem>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat} className="truncate">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sıralama</Label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
                    <SelectTrigger className="h-9 rounded-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommended">Önerilen (onaylı önce)</SelectItem>
                      <SelectItem value="followers_desc">Takipçi çok → az</SelectItem>
                      <SelectItem value="followers_asc">Takipçi az → çok</SelectItem>
                      <SelectItem value="name_asc">İsim A → Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-6 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-[#08afd5]" aria-hidden />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {rail === "search" ? "Influencer kataloğu" : "Kayıtlı profiller"}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {rangeLabel}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Sayfa başına</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v) === 40 ? 40 : 20)}
              >
                <SelectTrigger className="h-8 w-[88px] rounded-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {catalogLoading ? (
            <Card className="flex min-h-[280px] flex-col items-center justify-center border-dashed px-8 py-16 text-center">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-[#08afd5]" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Influencerlar yükleniyor</p>
              <p className="mt-2 max-w-sm text-xs text-gray-500">Liste hazırlanıyor…</p>
            </Card>
          ) : rail === "saved" && totalCount === 0 ? (
            <Card className="flex flex-col items-center justify-center border-dashed px-8 py-12 text-center">
              <Bookmark className="mb-3 h-10 w-10 text-[#08afd5]/40" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Kayıtlı içerik üreticisi yok
              </p>
              <p className="mt-2 max-w-sm text-xs text-gray-500">
                Kartlardaki işaretle düğmesi veya sağ tık menüsündeki “Kaydet” ile listeye ekleyebilirsiniz.
              </p>
              <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => setRail("search")}>
                Keşfete dön
              </Button>
            </Card>
          ) : paginated.length === 0 ? (
            <Card className="flex flex-col items-center justify-center border-dashed px-8 py-12 text-center">
              <UserSearch className="mb-3 h-10 w-10 text-[#08afd5]/40" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Sonuç bulunamadı</p>
              <p className="mt-2 max-w-sm text-xs text-gray-500">Filtreleri gevşetmeyi veya sıfırlamayı deneyin.</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginated.map((p) => renderCard(p))}
              </div>

              <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  Sayfa <span className="font-medium text-foreground">{effectivePage}</span> / {totalPages}{" "}
                  — toplam <span className="font-medium text-foreground">{totalCount}</span> kayıt
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full"
                    disabled={effectivePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Önceki
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full"
                    disabled={effectivePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Sonraki
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-slate-50 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-slate-200 bg-white px-5 py-5 text-left">
            <SheetTitle className="text-xl font-black text-slate-950">{detailInfl?.name}</SheetTitle>
            <SheetDescription>{detailInfl?.handle}</SheetDescription>
          </SheetHeader>
          {detailInfl && (
            <div className="space-y-5 p-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-20 w-20 border border-slate-200 ring-4 ring-[#08afd5]/10">
                  <AvatarImage src={detailInfl.photoUrl} alt="" />
                  <AvatarFallback>{detailInfl.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700">
                    {detailInfl.categories.join(" · ") || "Kategori atanmamış"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {nf(detailInfl.followersTotal)} takipçi · {detailInfl.engagementPct}% etkileşim
                  </p>
                </div>
              </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <BarChart3 className="mb-2 h-4 w-4 text-[#08afd5]" />
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Toplam takipçi</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{nf(detailInfl.followersTotal)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <Sparkles className="mb-2 h-4 w-4 text-[#e3447c]" />
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Etkileşim</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{detailInfl.engagementPct}%</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <Wallet className="mb-2 h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ortalama ücret</p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {detailStatsLoading ? "..." : detailStats?.avgPrice ? formatTry(detailStats.avgPrice) : estimateFeeRange(detailInfl)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tamamlanan</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{detailStatsLoading ? "..." : detailStats?.completedCount ?? 0}</p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h4 className="text-sm font-black text-slate-950">Performans özeti</h4>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold text-slate-400">Anlaşma</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{detailStatsLoading ? "..." : detailStats?.acceptedCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold text-slate-400">Aktif iş</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{detailStatsLoading ? "..." : detailStats?.activeCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold text-slate-400">Erişim</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{detailInfl.reachLabel}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h4 className="text-sm font-black text-slate-950">Platformlar ve kategoriler</h4>
                <div className="mt-3 space-y-2">
                  {detailInfl.platforms.map((platform) => (
                    <div key={`${platform.id}-${platform.username}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                        <RegistrationPlatformIcon platformId={platform.id} size={18} />
                        <span className="truncate">{platform.username ? `@${platform.username}` : platform.id}</span>
                      </span>
                      <span className="text-xs font-black text-slate-500">{nf(Number(platform.followers) || 0)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {detailInfl.categories.map((cat) => (
                    <span key={cat} className="rounded-full bg-[#08afd5]/10 px-2.5 py-1 text-xs font-bold text-[#067a92]">{cat}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {detailInfl.accountStatus && (
                  <Badge variant="outline" className="text-[10px]">
                    Hesap: {detailInfl.accountStatus}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">
                  Doğrulama talebi: {detailInfl.verificationRequestStatus ?? "yok"}
                </Badge>
              </div>
              <p className="rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
                {detailInfl.bio?.trim() ||
                  "Profilde biyografi yok — gelişmiş profil yakında bağlanacaktır."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="rounded-full bg-[#08afd5] text-white hover:bg-[#0798ba]"
                  onClick={() => {
                    toggleSave(detailInfl.id, detailInfl);
                  }}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  {savedIds.has(detailInfl.id) ? "Listeden çıkar" : "Kaydet"}
                </Button>
                {campaignsForCollaboration.length === 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button type="button" variant="outline" className="rounded-full opacity-60" disabled>
                          <Send className="mr-2 h-4 w-4" />
                          İşbirliği
                          <ChevronDown className="ml-2 h-3 w-3" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Teklif için tamamlanmamış bir kampanya gerekir.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" className="rounded-full border-[#08afd5]/40 bg-white text-[#0788a7]" disabled={!canOperate}>
                        <Send className="mr-2 h-4 w-4" />
                        İşbirliği
                        <ChevronDown className="ml-2 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-[min(20rem,calc(100vw-2rem))] max-h-[min(260px,calc(100vh-8rem))] overflow-y-auto"
                    >
                      <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                        Kampanya seç — teklif gönder
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {campaignsForCollaboration.map((c) => (
                        <DropdownMenuItem
                          key={c.id}
                          className="cursor-pointer text-xs leading-snug"
                          onClick={() => {
                            openCollaborationOffer(c, detailInfl);
                            setDetailOpen(false);
                          }}
                        >
                          <span className="line-clamp-2">{c.title}</span>
                          <span className="text-muted-foreground">{` · #${c.id.slice(-4)}`}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
