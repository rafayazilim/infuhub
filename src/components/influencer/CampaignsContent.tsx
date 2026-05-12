import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Calendar,
  Banknote,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Search,
  Tags,
  Users,
  X,
  Upload,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ActiveCampaign,
  canInfluencerSubmitOfferOnCampaign,
  getAllActiveCampaigns,
} from '@/services/firebaseCampaignService';
import { getContentLines, formatContentLinesSummary, hasContentLines } from '@/lib/campaignContentLines';
import { getCampaignModelLabel } from '@/lib/campaignModelLabels';
import {
  FirebaseOffer,
  collapseIncomingParticipationThreadsForDisplay,
  createIncomingCampaignOffer,
  getOffersByInfluencer,
} from '@/services/firebaseOfferService';
import { useToast } from '@/hooks/use-toast';
import { InfluencerCampaignDetailDialog } from '@/components/influencer/InfluencerCampaignDetailDialog';

type CampaignModelFilter =
  | 'all'
  | 'ugc_video'
  | 'collaboration'
  | 'social_post'
  | 'shared_link'
  | 'unknown';
type SortOption = 'date_desc' | 'date_asc' | 'budget_desc' | 'budget_asc';
type ViewMode = 'card' | 'list';

interface CampaignsContentProps {
  influencerId?: string | null;
  canOperate?: boolean;
}

const modelLabelMap: Record<CampaignModelFilter, string> = {
  all: 'Tümü',
  ugc_video: 'UGC Video',
  collaboration: 'İşbirliği',
  social_post: 'Sosyal Medya Postu',
  shared_link: 'Paylaşımlı Link',
  unknown: 'Belirtilmemiş',
};

const getCampaignModel = (campaign: ActiveCampaign): CampaignModelFilter => {
  const m = campaign.campaignModel;
  if (m === 'ugc_video') return 'ugc_video';
  if (m === 'collaboration') return 'collaboration';
  if (m === 'social_post') return 'social_post';
  if (m === 'shared_link') return 'shared_link';
  return 'unknown';
};

const getPrimaryBudget = (campaign: ActiveCampaign): number => {
  const perInfluencer = Number(campaign.budget?.perInfluencer || 0);
  if (perInfluencer > 0) return perInfluencer;
  return Number(campaign.budget?.total || 0);
};

const getArrayValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
};

const formatDate = (date?: string) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const formatAudience = (value: unknown) => {
  const values = getArrayValue(value);
  return values.length > 0 ? values.join(', ') : '-';
};

const UGC_PLATFORM_FILTER = 'UGC (video)';

const getCampaignContentSummaryLine = (c: ActiveCampaign): string => {
  if (hasContentLines(c)) {
    return formatContentLinesSummary(c) || '—';
  }
  if ((c.platforms || []).length > 0) {
    return (c.platforms || []).join(', ');
  }
  return '—';
};

const getBrandOfferBlockBadge = (offer?: FirebaseOffer) => {
  if (!offer) return null;
  if (offer.status === 'kabul') {
    return (
      <Badge className="bg-[#08afd5]/20 text-[#0a8fb0] dark:bg-[#08afd5]/25 dark:text-[#7ce7ff] whitespace-nowrap">
        Marka teklifi kabul edildi
      </Badge>
    );
  }
  if (offer.status === 'red') return null;
  return (
    <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/35 dark:text-sky-200 whitespace-nowrap">
      Markadan teklif var
    </Badge>
  );
};

const getOfferStatusBadge = (offer?: FirebaseOffer) => {
  if (!offer) return null;

  if (offer.status === 'kabul') {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 whitespace-nowrap">
        Teklifin kabul edildi
      </Badge>
    );
  }

  if (offer.status === 'red') {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 whitespace-nowrap">
        Teklifin reddedildi
      </Badge>
    );
  }

  return (
    <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 whitespace-nowrap">
      Teklifin beklemede
    </Badge>
  );
};

export const CampaignsContent: React.FC<CampaignsContentProps> = ({ influencerId, canOperate = true }) => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState<CampaignModelFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [incomingOffersByCampaign, setIncomingOffersByCampaign] = useState<Record<string, FirebaseOffer>>({});
  const [brandOutgoingOfferByCampaign, setBrandOutgoingOfferByCampaign] = useState<
    Record<string, FirebaseOffer>
  >({});
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ActiveCampaign | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<ActiveCampaign | null>(null);

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        const activeCampaigns = await getAllActiveCampaigns();
        setCampaigns(activeCampaigns);
      } catch (error) {
        console.error('Aktif kampanyalar yüklenemedi:', error);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  useEffect(() => {
    const loadIncomingOffers = async () => {
      if (!influencerId) {
        setIncomingOffersByCampaign({});
        setBrandOutgoingOfferByCampaign({});
        return;
      }

      try {
        const offers = await getOffersByInfluencer(influencerId);
        const incomingFiltered = offers.filter(
          (o) => o.offerKind === 'incoming_campaign' || o.sourceType === 'influencer'
        );
        const collapsed = collapseIncomingParticipationThreadsForDisplay(incomingFiltered);
        const incomingMap: Record<string, FirebaseOffer> = {};
        collapsed.forEach((offer) => {
          incomingMap[offer.campaignId] = offer;
        });
        setIncomingOffersByCampaign(incomingMap);

        const brandMap: Record<string, FirebaseOffer> = {};
        offers.forEach((o) => {
          if (
            o.sourceType === 'brand' &&
            o.destinationType === 'influencer' &&
            o.status !== 'red'
          ) {
            brandMap[o.campaignId] = o;
          }
        });
        setBrandOutgoingOfferByCampaign(brandMap);
      } catch (error) {
        console.error('Influencer teklifleri yüklenemedi:', error);
      }
    };

    loadIncomingOffers();
  }, [influencerId]);

  const platformOptions = useMemo(() => {
    const values = new Set<string>();
    let anyUgcWithoutPlatforms = false;
    campaigns.forEach((campaign) => {
      (campaign.platforms || []).forEach((platform) => {
        if (platform) values.add(platform);
      });
      getContentLines(campaign).forEach((row) => {
        if (row.kind === 'collab' && row.platform) values.add(row.platform);
      });
      if (getCampaignModel(campaign) === 'ugc_video' && (!campaign.platforms || campaign.platforms.length === 0)) {
        anyUgcWithoutPlatforms = true;
      }
    });
    if (anyUgcWithoutPlatforms) values.add(UGC_PLATFORM_FILTER);
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('tr-TR');
    const values = campaigns.filter((campaign) => {
      const matchesSearch =
        !term ||
        campaign.title?.toLocaleLowerCase('tr-TR').includes(term) ||
        campaign.brandName?.toLocaleLowerCase('tr-TR').includes(term) ||
        campaign.productInfo?.toLocaleLowerCase('tr-TR').includes(term);

      const matchesPlatform =
        platformFilter === 'all' ||
        (campaign.platforms || []).includes(platformFilter) ||
        getContentLines(campaign).some(
          (row) => row.kind === 'collab' && row.platform === platformFilter
        ) ||
        (platformFilter === UGC_PLATFORM_FILTER && getCampaignModel(campaign) === 'ugc_video');

      const campaignModel = getCampaignModel(campaign);
      const matchesModel = modelFilter === 'all' || campaignModel === modelFilter;

      return matchesSearch && matchesPlatform && matchesModel;
    });

    values.sort((a, b) => {
      if (sortBy === 'budget_desc') return getPrimaryBudget(b) - getPrimaryBudget(a);
      if (sortBy === 'budget_asc') return getPrimaryBudget(a) - getPrimaryBudget(b);

      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return sortBy === 'date_asc' ? aTime - bTime : bTime - aTime;
    });

    return values;
  }, [campaigns, searchTerm, platformFilter, modelFilter, sortBy]);

  const stats = useMemo(() => {
    const total = campaigns.length;
    const ugcVideo = campaigns.filter((c) => getCampaignModel(c) === 'ugc_video').length;
    const collaboration = campaigns.filter((c) => getCampaignModel(c) === 'collaboration').length;
    const legacyModel = campaigns.filter((c) => {
      const m = c.campaignModel;
      return m === 'social_post' || m === 'shared_link';
    }).length;
    const avgBudget =
      total > 0
        ? Math.round(campaigns.reduce((sum, campaign) => sum + getPrimaryBudget(campaign), 0) / total)
        : 0;

    return { total, ugcVideo, collaboration, legacyModel, avgBudget };
  }, [campaigns]);

  const openOfferModal = (campaign: ActiveCampaign) => {
    if (!canOperate) {
      toast({
        title: 'İşlem Kısıtlı',
        description: 'Profilin doğrulanmadan teklif veremezsin.',
        variant: 'destructive',
      });
      return;
    }
    if (!influencerId) {
      toast({
        title: 'Giriş gerekli',
        description: 'Teklif verebilmek için önce giriş yapmalısın.',
        variant: 'destructive',
      });
      return;
    }
    if (!canInfluencerSubmitOfferOnCampaign(campaign)) {
      toast({
        title: 'Teklif alınmıyor',
        description: 'Bu kampanyanın son başvuru tarihi doldu veya kampanya teklif kabul etmiyor.',
        variant: 'destructive',
      });
      return;
    }

    if (incomingOffersByCampaign[campaign.id]) {
      toast({
        title: 'Teklif zaten var',
        description: 'Bu kampanyaya zaten teklif verdin.',
      });
      return;
    }

    if (brandOutgoingOfferByCampaign[campaign.id]) {
      toast({
        title: 'Marka teklifi mevcut',
        description:
          'Bu kampanya için markadan teklifin var. Katılım teklifi gönderemezsin; Teklifler sekmesinden yanıt ver.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedCampaign(campaign);
    setOfferPrice('');
    setOfferMessage('');
    setOfferModalOpen(true);
  };

  const openCampaignDetail = (campaign: ActiveCampaign) => {
    setDetailCampaign(campaign);
    setDetailOpen(true);
  };

  const handleDetailOffer = (c: ActiveCampaign) => {
    openOfferModal(c);
  };

  const submitIncomingOffer = async () => {
    if (!canOperate) {
      toast({
        title: 'İşlem Kısıtlı',
        description: 'Profilin doğrulanmadan teklif veremezsin.',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedCampaign || !influencerId) return;
    if (!canInfluencerSubmitOfferOnCampaign(selectedCampaign)) {
      toast({
        title: 'Teklif alınmıyor',
        description: 'Bu kampanya artık teklif kabul etmiyor.',
        variant: 'destructive',
      });
      return;
    }

    if (brandOutgoingOfferByCampaign[selectedCampaign.id]) {
      toast({
        title: 'Marka teklifi mevcut',
        description: 'Katılım teklifi gönderilemez. Teklifler ekranından marka teklifine yanıt ver.',
        variant: 'destructive',
      });
      return;
    }

    const parsedPrice = Number(offerPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast({
        title: 'Hatalı tutar',
        description: 'Teklif tutarı 0\'dan büyük olmalı.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSendingOffer(true);
      const createdOffer = await createIncomingCampaignOffer({
        campaignId: selectedCampaign.id,
        brandId: selectedCampaign.brandId,
        influencerId,
        price: parsedPrice,
        message: offerMessage,
      });

      setIncomingOffersByCampaign((prev) => ({
        ...prev,
        [selectedCampaign.id]: createdOffer,
      }));

      setOfferModalOpen(false);
      setSelectedCampaign(null);
      toast({
        title: 'Teklif gönderildi',
        description: 'Teklifin kampanyanın gelen tekliflerine kaydedildi.',
      });
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message || 'Teklif gönderilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSendingOffer(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#08afd5]/10 dark:bg-[#08afd5]/20 flex items-center justify-center shrink-0">
          <Briefcase size={24} className="text-[#08afd5] dark:text-[#6edff3]" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Kampanyalar</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Herkese açık ve aktif kampanyaları görüntüleyin; son başvuru tarihi açıkken teklif gönderebilirsiniz.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900/50">
          <p className="text-xs text-gray-600 dark:text-gray-400">Aktif Kampanya</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900/50">
          <p className="text-xs text-gray-600 dark:text-gray-400">UGC Video</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.ugcVideo}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900/50">
          <p className="text-xs text-gray-600 dark:text-gray-400">İşbirliği</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.collaboration}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900/50">
          <p className="text-xs text-gray-600 dark:text-gray-400">Eski model</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.legacyModel}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900/50 col-span-2 sm:col-span-1 xl:col-span-1">
          <p className="text-xs text-gray-600 dark:text-gray-400">Ortalama Bütçe</p>
          <p className="text-2xl font-bold text-[#08afd5] dark:text-[#6edff3] mt-1">
            {formatMoney(stats.avgBudget)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6 p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Kampanya veya marka ara..."
              className="pl-9 h-9 rounded-[10px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrele:</span>
          </div>

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-44 h-9 rounded-[10px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {platformOptions.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={modelFilter} onValueChange={(value) => setModelFilter(value as CampaignModelFilter)}>
            <SelectTrigger className="w-48 h-9 rounded-[10px]">
              <SelectValue placeholder="Kampanya modeli" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="ugc_video">UGC Video</SelectItem>
              <SelectItem value="collaboration">İşbirliği</SelectItem>
              <SelectItem value="social_post">Sosyal Medya Postu (eski)</SelectItem>
              <SelectItem value="shared_link">Paylaşımlı Link (eski)</SelectItem>
              <SelectItem value="unknown">Belirtilmemiş</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-52 h-9 rounded-[10px]">
              <SelectValue placeholder="Sıralama" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Tarih (Yeni → Eski)</SelectItem>
              <SelectItem value="date_asc">Tarih (Eski → Yeni)</SelectItem>
              <SelectItem value="budget_desc">Bütçe (Yüksek → Düşük)</SelectItem>
              <SelectItem value="budget_asc">Bütçe (Düşük → Yüksek)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white/85 dark:bg-gray-900/80 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={
              viewMode === 'card'
                ? 'h-8 px-3 rounded-lg bg-[#e3447c] text-white shadow-sm hover:bg-[#cf3a6a] hover:text-white'
                : 'h-8 px-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-[#e3447c]/15 hover:text-gray-900 dark:hover:bg-[#e3447c]/22 dark:hover:text-white'
            }
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid size={14} className="mr-1" />
            Kart
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={
              viewMode === 'list'
                ? 'h-8 px-3 rounded-lg bg-[#e3447c] text-white shadow-sm hover:bg-[#cf3a6a] hover:text-white'
                : 'h-8 px-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-[#e3447c]/15 hover:text-gray-900 dark:hover:bg-[#e3447c]/22 dark:hover:text-white'
            }
            onClick={() => setViewMode('list')}
          >
            <List size={14} className="mr-1" />
            Liste
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#08afd5]/30 border-t-[#08afd5] rounded-full animate-spin" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#08afd5]/15 dark:bg-[#08afd5]/25 flex items-center justify-center">
            <Briefcase size={32} className="text-[#08afd5] dark:text-[#6edff3]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Kampanya bulunamadı</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Filtreleri değiştirerek tekrar deneyin.
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filteredCampaigns.map((campaign) => {
            const campaignModel = getCampaignModel(campaign);
            const budget = getPrimaryBudget(campaign);
            const existingOffer = incomingOffersByCampaign[campaign.id];
            const brandOfferBlock = brandOutgoingOfferByCampaign[campaign.id];
            const participationOfferBlocked = Boolean(existingOffer) || Boolean(brandOfferBlock);

            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="group w-full"
              >
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => openCampaignDetail(campaign)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openCampaignDetail(campaign);
                    }
                  }}
                  className="relative flex aspect-square w-full max-w-full cursor-pointer flex-col overflow-hidden border border-gray-200/60 dark:border-gray-800/80 rounded-2xl bg-gray-950 shadow-lg shadow-black/20 outline-none transition-all duration-300 hover:-translate-y-1 hover:border-[#08afd5]/40 hover:shadow-2xl hover:shadow-[#08afd5]/10 focus-visible:ring-2 focus-visible:ring-[#08afd5]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  <div className="pointer-events-none absolute inset-0 z-0">
                    {campaign.campaignImageURL ? (
                      <img
                        src={campaign.campaignImageURL}
                        alt={campaign.campaignName || campaign.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
                    )}
                    <div
                      className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(8,175,213,0.12),transparent)]"
                      aria-hidden
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
                  </div>

                  <div className="relative z-10 flex h-full min-h-0 flex-col gap-1.5 p-2.5 sm:p-3">
                    <div className="shrink-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium uppercase tracking-wider text-white/50 sm:text-[10px] truncate">
                            {campaign.brandName}
                          </p>
                          <h4 className="line-clamp-2 text-sm font-bold leading-tight text-white sm:text-base">
                            {campaign.campaignName || campaign.title || 'Kampanya'}
                          </h4>
                        </div>
                        <div className="flex max-w-[45%] shrink-0 flex-col items-end gap-0.5">
                          {campaign.status === 'taslak' && (
                            <Badge className="truncate rounded-full border-0 bg-amber-500/90 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm sm:text-[10px]">
                              Taslak
                            </Badge>
                          )}
                          <Badge className="max-w-full truncate rounded-full border-0 bg-[#08afd5] px-2 py-0.5 text-[10px] font-semibold text-white shadow-md shadow-[#08afd5]/30 sm:text-[11px]">
                            {modelLabelMap[campaignModel]}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <p className="shrink-0 line-clamp-1 text-[11px] leading-snug text-white/80 sm:text-xs">
                      {campaign.campaignDescription || campaign.productDescription || campaign.productInfo || 'Kampanya açıklaması yok.'}
                    </p>

                    {/* Kısa ekranlarda taşan üst+orta kayar; CTA dışarıda kaldığı için buton asla clip olmaz */}
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
                      <div className="flex min-h-full flex-col">
                        <div className="min-h-0 flex-1" aria-hidden="true" />
                        <div className="grid shrink-0 grid-cols-2 gap-1 text-white/95 sm:gap-1.5">
                        <div className="flex min-w-0 items-center gap-1 rounded-md border border-white/[0.1] bg-black/45 px-1.5 py-1 shadow-sm backdrop-blur-sm">
                          <Banknote size={12} className="shrink-0 text-[#6edff3]" />
                          <span className="truncate text-[11px] font-semibold tabular-nums sm:text-xs">{formatMoney(budget)}</span>
                        </div>
                        <div className="flex min-w-0 items-center gap-1 rounded-md border border-white/[0.1] bg-black/45 px-1.5 py-1 shadow-sm backdrop-blur-sm">
                          <Calendar size={12} className="shrink-0 text-[#6edff3]" />
                          <span className="truncate text-[10px] leading-tight sm:text-[11px]">
                            {formatDate(campaign.duration?.start)} – {formatDate(campaign.duration?.end)}
                          </span>
                        </div>
                        <div className="col-span-2 flex min-h-0 items-start gap-1 rounded-md border border-white/[0.1] bg-black/45 px-1.5 py-1 text-[10px] shadow-sm backdrop-blur-sm sm:text-[11px]">
                          <Tags size={11} className="mt-0.5 shrink-0 text-[#6edff3]" />
                          <span className="line-clamp-1 min-w-0 break-words text-white/95">
                            {getCampaignContentSummaryLine(campaign)}
                          </span>
                        </div>
                        <div className="col-span-2 flex min-h-0 items-start gap-1 rounded-md border border-white/[0.1] bg-black/45 px-1.5 py-1 text-[10px] shadow-sm backdrop-blur-sm sm:text-[11px]">
                          <Users size={11} className="mt-0.5 shrink-0 text-[#6edff3]/90" />
                          <span className="line-clamp-1 min-w-0 leading-snug text-white/95">İlgi: {formatAudience(campaign.targetAudience?.interests)}</span>
                        </div>
                        <div className="col-span-2 flex min-h-0 items-start gap-1 rounded-md border border-white/[0.1] bg-black/45 px-1.5 py-1 text-[10px] shadow-sm backdrop-blur-sm sm:text-[11px]">
                          <MapPin size={11} className="mt-0.5 shrink-0 text-[#6edff3]/90" />
                          <span className="line-clamp-1 min-w-0 text-white/95">Lokasyon: {formatAudience(campaign.targetAudience?.location)}</span>
                        </div>
                        </div>
                      </div>
                    </div>

                    <p className="shrink-0 text-center text-[9px] text-white/40 sm:text-[10px]">Detay için karta tıklayın</p>
                    <div className="shrink-0 space-y-0.5" onClick={(e) => e.stopPropagation()}>
                      {getOfferStatusBadge(existingOffer) || getBrandOfferBlockBadge(brandOfferBlock)}
                      <Button
                        type="button"
                        className="h-7 w-full py-0 text-[11px] brand-btn-primary font-semibold text-white shadow-md shadow-[#08afd5]/20 sm:h-8 sm:text-xs"
                        onClick={() => openOfferModal(campaign)}
                        disabled={
                          !influencerId ||
                          participationOfferBlocked ||
                          !canOperate ||
                          !canInfluencerSubmitOfferOnCampaign(campaign)
                        }
                      >
                        {existingOffer
                          ? 'Teklif gönderildi'
                          : brandOfferBlock
                            ? 'Marka teklifi mevcut'
                            : !canInfluencerSubmitOfferOnCampaign(campaign)
                              ? 'Başvuru kapalı'
                              : 'Bu kampanyaya teklif ver'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCampaigns.map((campaign) => {
            const campaignModel = getCampaignModel(campaign);
            const budget = getPrimaryBudget(campaign);
            const existingOffer = incomingOffersByCampaign[campaign.id];
            const brandOfferBlock = brandOutgoingOfferByCampaign[campaign.id];
            const participationOfferBlocked = Boolean(existingOffer) || Boolean(brandOfferBlock);

            return (
              <Card
                key={campaign.id}
                className="p-4 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900 rounded-xl transition-colors hover:border-[#08afd5]/35 hover:shadow-md"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr_1fr_auto_auto_auto] gap-3 items-center">
                  <button
                    type="button"
                    className="min-w-0 text-left rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5]/50"
                    onClick={() => openCampaignDetail(campaign)}
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{campaign.brandName}</p>
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate underline-offset-2 hover:underline decoration-[#08afd5]/50">
                      {campaign.campaignName || campaign.title || 'Kampanya'}
                    </h4>
                    {campaign.productInfo && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{campaign.productInfo}</p>
                    )}
                  </button>

                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium">{formatMoney(budget)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Influencer bütçesi</p>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>{formatDate(campaign.createdAt)}</p>
                    <p className="text-xs line-clamp-2">{getCampaignContentSummaryLine(campaign)}</p>
                  </div>

                  <div className="flex justify-end">
                    {getOfferStatusBadge(existingOffer) || getBrandOfferBlockBadge(brandOfferBlock) || <div />}
                  </div>

                  <div className="flex justify-end gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-[#08afd5]/40 text-[#08afd5] hover:bg-[#08afd5]/10"
                      onClick={() => openCampaignDetail(campaign)}
                    >
                      Detay
                    </Button>
                    {campaign.status === 'taslak' && (
                      <Badge className="bg-amber-500/20 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200">
                        Taslak
                      </Badge>
                    )}
                    <Badge className="bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/25 dark:text-[#7ce7ff]">
                      {modelLabelMap[campaignModel]}
                    </Badge>
                    <Button
                      type="button"
                      className="brand-btn-primary text-white"
                      onClick={() => openOfferModal(campaign)}
                      disabled={
                        !influencerId ||
                        participationOfferBlocked ||
                        !canOperate ||
                        !canInfluencerSubmitOfferOnCampaign(campaign)
                      }
                    >
                      {existingOffer
                        ? 'Teklif gönderildi'
                        : brandOfferBlock
                          ? 'Marka teklifi mevcut'
                          : !canInfluencerSubmitOfferOnCampaign(campaign)
                            ? 'Başvuru kapalı'
                            : 'Teklif ver'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <InfluencerCampaignDetailDialog
        open={detailOpen && detailCampaign != null}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailCampaign(null);
        }}
        campaign={detailCampaign}
        onOfferClick={handleDetailOffer}
        existingOffer={detailCampaign ? incomingOffersByCampaign[detailCampaign.id] : undefined}
        brandDirectOffer={detailCampaign ? brandOutgoingOfferByCampaign[detailCampaign.id] : undefined}
        canOperate={canOperate}
        hasInfluencerId={Boolean(influencerId)}
      />

      <Dialog open={offerModalOpen} onOpenChange={setOfferModalOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-24px)] md:w-full rounded-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kampanyaya teklif ver</DialogTitle>
            <DialogDescription>
              {selectedCampaign
                ? `${selectedCampaign.brandName || 'Marka'} — ${selectedCampaign.campaignName || selectedCampaign.title || 'Kampanya'}`
                : 'Teklif detaylarını gir.'}
            </DialogDescription>
          </DialogHeader>

          {selectedCampaign && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-3 space-y-2 text-sm">
              {selectedCampaign.campaignModel && (
                <p className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-500 dark:text-gray-400">Model: </span>
                  {getCampaignModelLabel(selectedCampaign.campaignModel)}
                </p>
              )}
              <p className="text-gray-800 dark:text-gray-200">
                <span className="text-gray-500 dark:text-gray-400">İçerik talepleri: </span>
                <span className="break-words">
                  {hasContentLines(selectedCampaign)
                    ? formatContentLinesSummary(selectedCampaign)
                    : (selectedCampaign.platforms || []).length > 0
                      ? `${(selectedCampaign.platforms || []).join(', ')} — ${(selectedCampaign.contentFormats || []).join(', ')}`
                      : '—'}
                </span>
              </p>
              {selectedCampaign.applicationDeadline && (
                <p className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-500 dark:text-gray-400">Son başvuru: </span>
                  {formatDate(selectedCampaign.applicationDeadline)}
                </p>
              )}
              {(selectedCampaign.publishWindow?.start || selectedCampaign.duration?.start) && (
                <p className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-500 dark:text-gray-400">Yayın / paylaşım: </span>
                  {formatDate(selectedCampaign.publishWindow?.start || selectedCampaign.duration?.start)} —{' '}
                  {formatDate(selectedCampaign.publishWindow?.end || selectedCampaign.duration?.end)}
                </p>
              )}
              {selectedCampaign.contentDetails && (
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed line-clamp-4">
                  <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Detay</span>
                  {selectedCampaign.contentDetails}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Teklif tutari (TL)
              </label>
              <Input
                type="number"
                value={offerPrice}
                onChange={(event) => setOfferPrice(event.target.value)}
                placeholder="Örn: 5000"
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Not (opsiyonel)
              </label>
              <Textarea
                value={offerMessage}
                onChange={(event) => setOfferMessage(event.target.value)}
                placeholder="Kampanyaya nasıl katkı sağlayacağını yazabilirsin"
                className="mt-2"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOfferModalOpen(false)}
              disabled={sendingOffer || !canOperate}
              className="flex items-center gap-2"
            >
              <X size={16} />
              İptal
            </Button>
            <Button
              type="button"
              className="brand-btn-primary text-white flex items-center gap-2"
              onClick={submitIncomingOffer}
              disabled={sendingOffer || !canOperate}
            >
              <Upload size={16} />
              {sendingOffer ? 'Gönderiliyor...' : 'Teklifi gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

