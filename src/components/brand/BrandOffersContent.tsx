import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Banknote,
  Filter,
  MessageSquare,
  XCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Instagram,
  Youtube,
  ThumbsUp,
  ThumbsDown,
  User,
  Mail,
  BadgeCheck,
  Wallet,
  Hash,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FirebaseOffer,
  getOffersByBrand,
  getOffersByCampaign,
  updateIncomingCampaignOfferStatus,
  resolveIncomingCounterOfferWithBrandRevision,
  reviseIncomingCampaignParticipationOffer,
  isAwaitingInfluencerAfterBrandNegotiation,
  isBrandToInfluencerDirectOffer,
  collapseIncomingParticipationThreadsForDisplay,
} from '@/services/firebaseOfferService';
import {
  BRAND_WALLET_INSUFFICIENT_ERROR_MESSAGE,
  ensureBrandWallet,
  isBalanceInsufficientForIncomingAccept,
  isInsufficientBrandWalletError,
} from '@/services/firebaseBrandWalletService';
import { getUserData } from '@/services/firebaseAuthService';
import { useToast } from '@/hooks/use-toast';
import { getCampaignById } from '@/services/firebaseCampaignService';
import { getInfluencerProfile, InfluencerProfile } from '@/services/firebaseInfluencerService';

/** Kart / liste teklif aksiyonları: ince çerçeve + ikon; hover pembe (#e3447c) */
const offerRowActionClassName =
  'rounded-lg border border-gray-200/90 dark:border-gray-600 shadow-none h-8 px-2.5 gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-transparent ' +
  '[&_svg]:size-3.5 [&_svg]:shrink-0 ' +
  'hover:!border-[#e3447c] hover:!bg-[#e3447c] hover:!text-white dark:hover:!bg-[#e3447c] dark:hover:!border-[#e3447c] dark:hover:!text-white ' +
  'active:!bg-[#c93d70] active:!border-[#c93d70] active:!text-white ' +
  'focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:outline-none ' +
  'disabled:opacity-40 disabled:hover:!bg-transparent disabled:hover:!text-gray-700 disabled:hover:!border-gray-200/90 ' +
  'dark:disabled:hover:!bg-transparent dark:disabled:hover:!text-gray-200 dark:disabled:hover:!border-gray-600';

/** Aynı çizgide yalnızca kullanıcı ikonu (profil) */
const offerRowProfileIconClassName =
  'rounded-lg border border-gray-200/90 dark:border-gray-600 shadow-none h-8 w-8 shrink-0 p-0 gap-0 justify-center text-gray-700 dark:text-gray-200 bg-transparent ' +
  '[&_svg]:size-3.5 [&_svg]:shrink-0 ' +
  'hover:!border-[#e3447c] hover:!bg-[#e3447c] hover:!text-white dark:hover:!bg-[#e3447c] dark:hover:!border-[#e3447c] dark:hover:!text-white ' +
  'active:!bg-[#c93d70] active:!border-[#c93d70] active:!text-white ' +
  'focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:outline-none ' +
  'disabled:opacity-40 disabled:hover:!bg-transparent disabled:hover:!text-gray-700 disabled:hover:!border-gray-200/90 ' +
  'dark:disabled:hover:!bg-transparent dark:disabled:hover:!text-gray-200 dark:disabled:hover:!border-gray-600';

interface BrandOffersContentProps {
  brandId: string;
  canOperate?: boolean;
  focusOfferId?: string | null;
}

interface EnrichedOffer extends FirebaseOffer {
  influencerName?: string;
  campaignTitle?: string;
  influencerPhotoURL?: string;
  campaignIsFixedOffer?: boolean;
  brandAwaitingInfluencerReply?: boolean;
  /** Doğrudan teklifte influencer karşı teklifi (beklemede); marka aksiyonları bu kayıt id’si ile yapılır */
  pendingCounterForActions?: EnrichedOffer | null;
}

function getOfferTypeLabel(offer: Pick<EnrichedOffer, 'offerKind' | 'sourceType'>): string {
  if (offer.offerKind === 'counter_offer' && offer.sourceType === 'influencer') {
    return 'Influencer karşı teklifi';
  }
  if (offer.offerKind === 'incoming_campaign') {
    return 'Kampanyaya katılım teklifi';
  }
  if (offer.offerKind === 'counter_offer') {
    return 'Karşı teklif';
  }
  return 'Teklif';
}

type StatusFilter = 'all' | 'beklemede' | 'kabul' | 'red';
type OfferTab = 'outgoing' | 'incoming';

const statusConfig = {
  beklemede: {
    label: 'Beklemede',
    icon: <Clock size={14} />,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800/50',
  },
  kabul: {
    label: 'Kabul Edildi',
    icon: <CheckCircle size={14} />,
    color: 'bg-[#08afd5]/20 text-[#08afd5] dark:bg-[#08afd5]/25 dark:text-[#76e3f5]',
    borderColor: 'border-[#08afd5]/35 dark:border-[#08afd5]/45',
  },
  red: {
    label: 'Reddedildi',
    icon: <XCircle size={14} />,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800/50',
  },
};

export const BrandOffersContent: React.FC<BrandOffersContentProps> = ({ brandId, canOperate = true, focusOfferId = null }) => {
  const { toast } = useToast();
  const [offers, setOffers] = useState<EnrichedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [offerTab, setOfferTab] = useState<OfferTab>('outgoing');
  const [updatingOfferId, setUpdatingOfferId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<InfluencerProfile | null>(null);
  const [selectedProfileName, setSelectedProfileName] = useState<string>('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<EnrichedOffer | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterTarget, setCounterTarget] = useState<EnrichedOffer | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [counterSending, setCounterSending] = useState(false);
  const [brandWalletBalance, setBrandWalletBalance] = useState(0);
  const [lastFocusedOfferId, setLastFocusedOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (brandId) {
      loadOffers();
    }
  }, [brandId]);

  useEffect(() => {
    setCampaignFilter('all');
    setStatusFilter('all');
  }, [offerTab]);

  useEffect(() => {
    if (!focusOfferId || loading || focusOfferId === lastFocusedOfferId) return;
    const target = offers.find(
      (offer) => offer.id === focusOfferId || offer.parentOfferId === focusOfferId || offer.pendingCounterForActions?.id === focusOfferId
    );
    if (!target) return;
    const shouldOpenIncoming =
      target.offerKind === 'incoming_campaign' ||
      (target.offerKind === 'counter_offer' && target.sourceType === 'influencer');
    setOfferTab(shouldOpenIncoming ? 'incoming' : 'outgoing');
    setCampaignFilter('all');
    setStatusFilter('all');
    setSelectedOffer(target);
    setDetailOpen(true);
    setLastFocusedOfferId(focusOfferId);
  }, [focusOfferId, loading, offers, lastFocusedOfferId]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const offersData = collapseIncomingParticipationThreadsForDisplay(await getOffersByBrand(brandId));
      const campaignIds = Array.from(new Set(offersData.map((o) => o.campaignId)));
      const perCampaign = await Promise.all(campaignIds.map((id) => getOffersByCampaign(id)));
      const offerMap: Record<string, FirebaseOffer> = {};
      perCampaign.forEach((list) => {
        list.forEach((o) => {
          offerMap[o.id] = o;
        });
      });

      const enriched = await Promise.all(
        offersData.map(async (offer) => {
          const [influencerData, campaignData, influencerProfile] = await Promise.all([
            getUserData(offer.influencerId, 'influencer').catch(() => null),
            getCampaignById(brandId, offer.campaignId).catch(() => null),
            getInfluencerProfile(offer.influencerId).catch(() => null),
          ]);

          const influencerName = (influencerData as any)?.fullName || 'Bilinmeyen Influencer';
          const campaignTitle =
            (campaignData as any)?.title || (campaignData as any)?.productInfo || 'Kampanya';
          const campaignIsFixedOffer = Boolean((campaignData as any)?.isFixedOffer);

          let pendingCounterForActions: EnrichedOffer | null = null;
          if (isBrandToInfluencerDirectOffer(offer) && offer.status === 'beklemede') {
            const pendingCounters = Object.values(offerMap).filter(
              (o) =>
                o.offerKind === 'counter_offer' &&
                o.sourceType === 'influencer' &&
                o.parentOfferId === offer.id &&
                o.status === 'beklemede'
            );
            if (pendingCounters.length > 0) {
              const latestCounter = pendingCounters.reduce((best, cur) =>
                new Date(cur.updatedAt).getTime() > new Date(best.updatedAt).getTime() ? cur : best
              );
              pendingCounterForActions = {
                ...latestCounter,
                influencerName,
                campaignTitle,
                influencerPhotoURL: influencerProfile?.profilePhotoURL,
                campaignIsFixedOffer,
                brandAwaitingInfluencerReply: isAwaitingInfluencerAfterBrandNegotiation(
                  latestCounter,
                  offerMap
                ),
                pendingCounterForActions: null,
              };
            }
          }

          return {
            ...offer,
            influencerName,
            campaignTitle,
            influencerPhotoURL: influencerProfile?.profilePhotoURL,
            campaignIsFixedOffer,
            brandAwaitingInfluencerReply: isAwaitingInfluencerAfterBrandNegotiation(
              offerMap[offer.id] || offer,
              offerMap
            ),
            pendingCounterForActions,
          };
        })
      );

      enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOffers(enriched);
      try {
        const w = await ensureBrandWallet(brandId);
        setBrandWalletBalance(w.balance);
      } catch {
        setBrandWalletBalance(0);
      }
    } catch (error) {
      console.error('Teklifler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const outgoingOffers = useMemo(
    () =>
      offers.filter(
        (offer) => offer.offerKind !== 'incoming_campaign' && offer.sourceType !== 'influencer'
      ),
    [offers]
  );

  const incomingOffers = useMemo(
    () =>
      offers.filter(
        (offer) =>
          offer.offerKind === 'incoming_campaign' ||
          (offer.offerKind === 'counter_offer' && offer.sourceType === 'influencer')
      ),
    [offers]
  );

  const visibleOffers = offerTab === 'incoming' ? incomingOffers : outgoingOffers;

  const campaignOptions = useMemo(() => {
    const map = new Map<string, string>();
    visibleOffers.forEach((offer) => {
      map.set(offer.campaignId, offer.campaignTitle || 'Kampanya');
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [visibleOffers]);

  const filteredOffers = useMemo(() => {
    let result = visibleOffers;
    if (statusFilter !== 'all') {
      result = result.filter((offer) => offer.status === statusFilter);
    }
    if (campaignFilter !== 'all') {
      result = result.filter((offer) => offer.campaignId === campaignFilter);
    }
    return result;
  }, [visibleOffers, statusFilter, campaignFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const normalizePlatforms = (profile: InfluencerProfile | null) => {
    if (!profile?.platforms) return [];
    if (Array.isArray(profile.platforms)) {
      return profile.platforms.map((p) => ({
        id: p.id,
        username: p.username,
        followers: p.followers,
      }));
    }
    return Object.entries(profile.platforms).map(([key, value]) => ({
      id: key,
      username: value?.username,
      followers: value?.followers,
    }));
  };

  const handleOpenProfile = async (offer: EnrichedOffer) => {
    setProfileOpen(true);
    setSelectedProfile(null);
    setSelectedProfileName(offer.influencerName || 'Influencer');
    setProfileLoading(true);
    try {
      const profile = await getInfluencerProfile(offer.influencerId);
      setSelectedProfile(profile);
    } catch (error) {
      console.error('Influencer profili yüklenemedi:', error);
      setSelectedProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOpenDetail = (offer: EnrichedOffer) => {
    setSelectedOffer(offer);
    setDetailOpen(true);
  };

  const canActPendingIncoming = (offer: EnrichedOffer) =>
    offer.status === 'beklemede' && canOperate;

  /** Marka son pazarlık adımını attıysa kabul/red influencer yanıtına kadar kapalı */
  const canAcceptOrRejectIncoming = (offer: EnrichedOffer) =>
    canActPendingIncoming(offer) && !offer.brandAwaitingInfluencerReply;

  const canCounterIncoming = (offer: EnrichedOffer) =>
    canActPendingIncoming(offer) &&
    !offer.campaignIsFixedOffer &&
    !offer.brandAwaitingInfluencerReply &&
    (offer.offerKind === 'incoming_campaign' ||
      (offer.offerKind === 'counter_offer' && offer.sourceType === 'influencer'));

  const kabulDisabledByWallet = (o: EnrichedOffer) =>
    isBalanceInsufficientForIncomingAccept(brandWalletBalance, o.price);

  const counterPriceNum = Number(counterPrice);
  const counterPriceRounded = Number.isFinite(counterPriceNum) ? Math.round(counterPriceNum) : NaN;
  const counterExceedsWallet =
    Number.isFinite(counterPriceRounded) && counterPriceRounded > 0 && counterPriceRounded > brandWalletBalance;

  const detailActionTarget = useMemo((): EnrichedOffer | null => {
    if (!selectedOffer) return null;
    if (offerTab === 'incoming') return selectedOffer;
    if (selectedOffer.pendingCounterForActions && selectedOffer.status === 'beklemede') {
      return selectedOffer.pendingCounterForActions;
    }
    return null;
  }, [selectedOffer, offerTab]);

  const detailContentOffer = useMemo(
    () => (selectedOffer ? detailActionTarget ?? selectedOffer : null),
    [selectedOffer, detailActionTarget]
  );

  const detailUpdating = useMemo(
    () =>
      Boolean(
        selectedOffer &&
          (updatingOfferId === selectedOffer.id ||
            Boolean(detailActionTarget && updatingOfferId === detailActionTarget.id))
      ),
    [selectedOffer, detailActionTarget, updatingOfferId]
  );

  const openIncomingCounter = (offer: EnrichedOffer) => {
    if (offer.brandAwaitingInfluencerReply) {
      toast({
        title: 'Yanıt bekleniyor',
        description: 'Influencer yanıt verene kadar yeni karşı teklif gönderemezsiniz.',
        variant: 'destructive',
      });
      return;
    }
    setCounterTarget(offer);
    setCounterPrice(offer.price ? String(offer.price) : '');
    setCounterMessage('');
    setCounterOpen(true);
  };

  const handleSendIncomingCounter = async () => {
    if (!counterTarget) return;
    const parsed = Number(counterPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({
        title: 'Geçersiz tutar',
        description: 'Geçerli bir teklif tutarı girin.',
        variant: 'destructive',
      });
      return;
    }
    if (Math.round(parsed) > brandWalletBalance) {
      toast({
        title: 'Yetersiz bakiye',
        description: 'Karşı teklif tutarı mevcut cüzdan bakiyenizi aşamaz. Bütçe yükleyin veya tutarı düşürün.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCounterSending(true);
      if (
        counterTarget.offerKind === 'counter_offer' &&
        counterTarget.sourceType === 'influencer'
      ) {
        await resolveIncomingCounterOfferWithBrandRevision({
          brandId,
          campaignId: counterTarget.campaignId,
          counterOfferId: counterTarget.id,
          price: parsed,
          message: counterMessage.trim() || undefined,
        });
      } else if (counterTarget.offerKind === 'incoming_campaign') {
        await reviseIncomingCampaignParticipationOffer({
          brandId,
          campaignId: counterTarget.campaignId,
          offerId: counterTarget.id,
          price: parsed,
          message: counterMessage.trim() || undefined,
        });
      } else {
        toast({
          title: 'Desteklenmiyor',
          description: 'Bu teklif türü için karşı teklif uygulanamaz.',
          variant: 'destructive',
        });
        return;
      }
      await loadOffers();
      setCounterOpen(false);
      setCounterTarget(null);
      setCounterPrice('');
      setCounterMessage('');
      toast({ title: 'Gönderildi', description: 'Karşı teklif influencera iletildi.' });
    } catch (error: any) {
      console.error('Karşı teklif gönderilemedi:', error);
      toast({
        title: 'Hata',
        description: error?.message || 'Karşı teklif gönderilemedi.',
        variant: 'destructive',
      });
    } finally {
      setCounterSending(false);
    }
  };

  const handleIncomingStatusUpdate = async (
    offer: EnrichedOffer,
    status: 'beklemede' | 'kabul' | 'red'
  ) => {
    if (!canOperate) return;
    if (offer.status !== 'beklemede') return;
    if (
      (status === 'kabul' || status === 'red') &&
      offer.brandAwaitingInfluencerReply
    ) {
      return;
    }
    if (status === 'kabul' && isBalanceInsufficientForIncomingAccept(brandWalletBalance, offer.price)) {
      toast({
        title: 'Yetersiz bakiye',
        description: BRAND_WALLET_INSUFFICIENT_ERROR_MESSAGE,
        variant: 'destructive',
      });
      return;
    }
    try {
      setUpdatingOfferId(offer.id);
      await updateIncomingCampaignOfferStatus(brandId, offer.campaignId, offer.id, status);
      await loadOffers();
      if (selectedOffer?.id === offer.id) {
        setSelectedOffer((prev) =>
          prev
            ? {
                ...prev,
                status,
                updatedAt: new Date().toISOString(),
                respondedAt: status === 'beklemede' ? undefined : new Date().toISOString(),
              }
            : prev
        );
      } else if (selectedOffer?.pendingCounterForActions?.id === offer.id) {
        setSelectedOffer((prev) =>
          prev
            ? {
                ...prev,
                status,
                updatedAt: new Date().toISOString(),
                respondedAt: status === 'beklemede' ? undefined : new Date().toISOString(),
                pendingCounterForActions:
                  status === 'beklemede' ? prev.pendingCounterForActions : null,
                ...(status === 'kabul' && prev.pendingCounterForActions
                  ? {
                      price: prev.pendingCounterForActions.price,
                      message: prev.pendingCounterForActions.message ?? prev.message,
                    }
                  : {}),
              }
            : prev
        );
      }
    } catch (error: any) {
      console.error('Gelen teklif durumu güncellenemedi:', error);
      const isWallet = isInsufficientBrandWalletError(error);
      toast({
        title: isWallet ? 'Yetersiz bakiye' : 'Hata',
        description: isWallet
          ? BRAND_WALLET_INSUFFICIENT_ERROR_MESSAGE
          : error?.message || 'Teklif durumu güncellenemedi.',
        variant: 'destructive',
      });
      await loadOffers();
    } finally {
      setUpdatingOfferId(null);
    }
  };

  return (
    <div className="w-full max-w-none min-w-0">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Influencer Teklifleri</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {offerTab === 'incoming'
            ? 'Influencerlardan gelen teklifleri görüntüleyin ve yönetin'
            : 'Daha önce gönderdiğiniz teklifleri görüntüleyin ve yönetin'}
        </p>
      </div>

      <div className="mb-4">
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 p-1">
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              offerTab === 'outgoing'
                ? 'bg-[#08afd5] text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => setOfferTab('outgoing')}
            type="button"
          >
            Verilen Teklifler
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              offerTab === 'incoming'
                ? 'bg-[#08afd5] text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => setOfferTab('incoming')}
            type="button"
          >
            Gelen Teklifler
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrele:</span>
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-40 rounded-xl h-9">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="beklemede">Beklemede</SelectItem>
              <SelectItem value="kabul">Kabul Edildi</SelectItem>
              <SelectItem value="red">Reddedildi</SelectItem>
            </SelectContent>
          </Select>
          <Select value={campaignFilter} onValueChange={(v) => setCampaignFilter(v)}>
            <SelectTrigger className="w-56 rounded-xl h-9">
              <SelectValue placeholder="Kampanya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kampanyalar</SelectItem>
              {campaignOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Görünüm:</span>
          <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 p-1">
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-[#08afd5] text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setViewMode('card')}
              type="button"
            >
              Kart
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#08afd5] text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setViewMode('list')}
              type="button"
            >
              Liste
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#08afd5]/30 border-t-[#08afd5] rounded-full animate-spin" />
        </div>
      ) : filteredOffers.length === 0 ? (
        <Card className="p-12 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#08afd5]/15 dark:bg-[#08afd5]/20 flex items-center justify-center">
              <MessageSquare size={32} className="text-[#08afd5] dark:text-[#6edff3]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {statusFilter === 'all' ? 'Henüz Teklif Yok' : 'Teklif Bulunamadı'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {statusFilter === 'all'
                ? offerTab === 'incoming'
                  ? 'Influencerlardan gelen teklifler burada görünecek.'
                  : 'Influencer teklifleri oluşturduğunuzda burada görünecek.'
                : 'Seçili filtreye uygun teklif bulunamadı.'}
            </p>
          </div>
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => {
            const status = statusConfig[offer.status];
            const negotiationTarget: EnrichedOffer | null =
              offerTab === 'incoming'
                ? offer
                : offer.pendingCounterForActions && offer.status === 'beklemede'
                  ? offer.pendingCounterForActions
                  : null;
            const rowUpdating =
              updatingOfferId === offer.id ||
              Boolean(negotiationTarget && updatingOfferId === negotiationTarget.id);
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <Card
                  onClick={() => handleOpenDetail(offer)}
                  className={`p-5 border rounded-xl bg-white dark:bg-gray-900 hover:shadow-md transition-all cursor-pointer ${status.borderColor} h-full`}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start gap-4">
                      {offer.influencerPhotoURL ? (
                        <img
                          src={offer.influencerPhotoURL}
                          alt={offer.influencerName || 'Influencer'}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold text-lg">
                          {offer.influencerName?.charAt(0).toUpperCase() || 'I'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {offer.influencerName}
                          </h4>
                          <Badge className={`${status.color} flex items-center gap-1`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {offer.campaignTitle}
                        </p>
                        {offer.message && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">
                            "{offer.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-col gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Banknote size={14} />
                          <span className="font-medium text-[#08afd5] dark:text-[#6edff3]">
                            {formatPrice(offer.price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{formatDate(offer.createdAt)}</span>
                        </div>
                      </div>
                      {negotiationTarget ? (
                        <>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={offerRowActionClassName}
                            disabled={
                              rowUpdating ||
                              !canAcceptOrRejectIncoming(negotiationTarget) ||
                              kabulDisabledByWallet(negotiationTarget)
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIncomingStatusUpdate(negotiationTarget, 'kabul');
                            }}
                          >
                            <ThumbsUp />
                            Kabul
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={offerRowActionClassName}
                            disabled={rowUpdating || !canAcceptOrRejectIncoming(negotiationTarget)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIncomingStatusUpdate(negotiationTarget, 'red');
                            }}
                          >
                            <ThumbsDown />
                            Red
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={offerRowActionClassName}
                            disabled={
                              !canCounterIncoming(negotiationTarget) ||
                              rowUpdating ||
                              counterSending
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              openIncomingCounter(negotiationTarget);
                            }}
                          >
                            <MessageSquare />
                            Karşı Teklif
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className={offerRowProfileIconClassName}
                            aria-label="Influencer profili"
                            title="Profil"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProfile(offer);
                            }}
                          >
                            <User />
                          </Button>
                        </div>
                        {negotiationTarget &&
                          canAcceptOrRejectIncoming(negotiationTarget) &&
                          kabulDisabledByWallet(negotiationTarget) && (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Cüzdan bakiyeniz bu teklifi kabul etmek için yetersiz (mevcut:{' '}
                              {formatPrice(brandWalletBalance)}). Cüzdanınıza bütçe yükledikten sonra kabul
                              edebilirsiniz.
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className={offerRowProfileIconClassName}
                            aria-label="Influencer profili"
                            title="Profil"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProfile(offer);
                            }}
                          >
                            <User />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOffers.map((offer) => {
            const status = statusConfig[offer.status];
            const negotiationTarget: EnrichedOffer | null =
              offerTab === 'incoming'
                ? offer
                : offer.pendingCounterForActions && offer.status === 'beklemede'
                  ? offer.pendingCounterForActions
                  : null;
            const rowUpdating =
              updatingOfferId === offer.id ||
              Boolean(negotiationTarget && updatingOfferId === negotiationTarget.id);
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Card
                  onClick={() => handleOpenDetail(offer)}
                  className={`px-4 py-3 border rounded-xl bg-white dark:bg-gray-900 hover:shadow-sm transition-all cursor-pointer ${status.borderColor}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-3 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      {offer.influencerPhotoURL ? (
                        <img
                          src={offer.influencerPhotoURL}
                          alt={offer.influencerName || 'Influencer'}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold">
                          {offer.influencerName?.charAt(0).toUpperCase() || 'I'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {offer.influencerName}
                          </p>
                          <Badge className={`${status.color} flex items-center gap-1`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {offer.campaignTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                      <Banknote size={14} />
                      <span className="font-semibold text-[#08afd5] dark:text-[#6edff3]">
                        {formatPrice(offer.price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar size={14} />
                      <span>{formatDate(offer.createdAt)}</span>
                    </div>
                    {negotiationTarget ? (
                      <div className="flex flex-col gap-1 min-w-0 md:items-end">
                        <div className="flex flex-wrap items-center gap-2 min-w-0 justify-start md:justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={offerRowActionClassName}
                          disabled={
                            rowUpdating ||
                            !canAcceptOrRejectIncoming(negotiationTarget) ||
                            kabulDisabledByWallet(negotiationTarget)
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIncomingStatusUpdate(negotiationTarget, 'kabul');
                          }}
                        >
                          <ThumbsUp />
                          Kabul
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={offerRowActionClassName}
                          disabled={rowUpdating || !canAcceptOrRejectIncoming(negotiationTarget)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIncomingStatusUpdate(negotiationTarget, 'red');
                          }}
                        >
                          <ThumbsDown />
                          Red
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={offerRowActionClassName}
                          disabled={
                            !canCounterIncoming(negotiationTarget) ||
                            rowUpdating ||
                            counterSending
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            openIncomingCounter(negotiationTarget);
                          }}
                        >
                          <MessageSquare />
                          Karşı Teklif
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className={offerRowProfileIconClassName}
                          aria-label="Influencer profili"
                          title="Profil"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProfile(offer);
                          }}
                        >
                          <User />
                        </Button>
                        </div>
                        {canAcceptOrRejectIncoming(negotiationTarget) &&
                          kabulDisabledByWallet(negotiationTarget) && (
                            <p className="text-xs text-amber-700 dark:text-amber-300 text-left md:text-right w-full max-w-sm">
                              Bakiye yetersiz (mevcut: {formatPrice(brandWalletBalance)}). Bütçe yükleyin.
                            </p>
                          )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 min-w-0 md:justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className={offerRowProfileIconClassName}
                          aria-label="Influencer profili"
                          title="Profil"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProfile(offer);
                          }}
                        >
                          <User />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden border border-[#08afd5]/25 bg-slate-950 text-slate-100 shadow-2xl sm:rounded-2xl [&>button]:text-slate-400 [&>button]:hover:text-white">
          <DialogHeader className="space-y-1 border-b border-slate-800/90 pb-4">
            <DialogTitle className="text-xl font-bold tracking-tight text-white">Influencer Profili</DialogTitle>
            <DialogDescription className="text-base text-slate-400">{selectedProfileName}</DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[min(62vh,520px)] overflow-y-auto pr-1 space-y-5">
            {profileLoading ? (
              <div className="flex items-center justify-center py-14">
                <div className="w-8 h-8 border-2 border-[#08afd5]/30 border-t-[#08afd5] rounded-full animate-spin" />
              </div>
            ) : !selectedProfile ? (
              <div className="text-center text-sm text-slate-400 py-10">Profil bilgileri yüklenemedi.</div>
            ) : (
              <>
                <div className="rounded-2xl border border-[#08afd5]/35 bg-slate-900/70 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                    {selectedProfile.profilePhotoURL ? (
                      <img
                        src={selectedProfile.profilePhotoURL}
                        alt={selectedProfile.fullName}
                        className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl object-cover border border-[#08afd5]/40"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-white flex items-center justify-center font-bold text-2xl border border-[#08afd5]/40">
                        {selectedProfile.fullName?.charAt(0).toUpperCase() || 'I'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight truncate">
                        {selectedProfile.fullName}
                      </h3>
                      <div className="mt-3 flex items-start gap-2 text-sm text-slate-300">
                        <Mail className="size-4 shrink-0 mt-0.5 text-[#08afd5]" />
                        <span className="break-all">{selectedProfile.email}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedProfile.status === 'onaylandı' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#08afd5]/18 text-[#7ce7ff] px-3 py-1 text-xs font-semibold border border-[#08afd5]/40">
                            <BadgeCheck className="size-3.5 shrink-0" />
                            onaylandı
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-800/90 text-slate-300 px-3 py-1 text-xs font-medium border border-slate-600">
                            {selectedProfile.status === 'beklemede'
                              ? 'doğrulama beklemede'
                              : selectedProfile.status === 'reddedildi'
                                ? 'reddedildi'
                                : 'doğrulanmadı'}
                          </span>
                        )}
                        {selectedProfile.followerRange ? (
                          <span className="inline-flex rounded-full bg-slate-800/95 text-slate-100 px-3 py-1 text-xs font-semibold border border-slate-600">
                            {selectedProfile.followerRange}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedProfile.bio ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Biyografi
                    </p>
                    <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3 text-sm text-slate-300 leading-relaxed">
                      {selectedProfile.bio}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Ücretler
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-xl border border-slate-700/90 bg-slate-900/60 p-3">
                      <p className="text-[11px] text-slate-500">Ortalama Ücret</p>
                      <p className="mt-1 text-sm font-bold text-white tabular-nums">
                        {selectedProfile.averageAdPrice ? formatPrice(selectedProfile.averageAdPrice) : '-'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-700/90 bg-slate-900/60 p-3">
                      <p className="text-[11px] text-slate-500">Post</p>
                      <p className="mt-1 text-sm font-bold text-white tabular-nums">
                        {selectedProfile.contentPricing?.post ? formatPrice(selectedProfile.contentPricing.post) : '-'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-700/90 bg-slate-900/60 p-3">
                      <p className="text-[11px] text-slate-500">Story</p>
                      <p className="mt-1 text-sm font-bold text-white tabular-nums">
                        {selectedProfile.contentPricing?.story ? formatPrice(selectedProfile.contentPricing.story) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
                    <div className="rounded-xl border border-slate-700/90 bg-slate-900/60 p-3">
                      <p className="text-[11px] text-slate-500">Reels</p>
                      <p className="mt-1 text-sm font-bold text-white tabular-nums">
                        {selectedProfile.contentPricing?.reels ? formatPrice(selectedProfile.contentPricing.reels) : '-'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-700/90 bg-slate-900/60 p-3">
                      <p className="text-[11px] text-slate-500">Video</p>
                      <p className="mt-1 text-sm font-bold text-white tabular-nums">
                        {selectedProfile.contentPricing?.video ? formatPrice(selectedProfile.contentPricing.video) : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Kategoriler
                  </p>
                  <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3 min-h-[3rem] flex flex-wrap items-center gap-2">
                    {selectedProfile.categories && selectedProfile.categories.length > 0 ? (
                      selectedProfile.categories.map((cat) => (
                        <span
                          key={cat}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#08afd5]/18 text-[#7ce7ff] border border-[#08afd5]/35"
                        >
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Sosyal platformlar
                  </p>
                  <div className="space-y-2">
                    {normalizePlatforms(selectedProfile).length === 0 ? (
                      <p className="text-sm text-slate-500 rounded-xl border border-slate-700/80 bg-slate-900/40 p-3">
                        Platform bilgisi yok.
                      </p>
                    ) : (
                      normalizePlatforms(selectedProfile).map((platform) => {
                        const label =
                          platform.id.length > 0
                            ? platform.id.charAt(0).toUpperCase() + platform.id.slice(1).toLowerCase()
                            : platform.id;
                        return (
                          <div
                            key={`${platform.id}-${platform.username}`}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/90"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {platform.id === 'instagram' ? (
                                <Instagram size={20} className="text-[#08afd5] shrink-0" />
                              ) : platform.id === 'youtube' ? (
                                <Youtube size={20} className="text-red-400 shrink-0" />
                              ) : (
                                <ExternalLink size={20} className="text-slate-400 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white">{label}</p>
                                <p className="text-xs text-slate-400 truncate">@{platform.username || '-'}</p>
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-white tabular-nums shrink-0">
                              {platform.followers != null
                                ? platform.followers.toLocaleString('tr-TR')
                                : '—'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="border-t border-slate-800/90 pt-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-slate-600 bg-transparent text-white hover:!bg-[#e3447c] hover:!text-white hover:!border-[#e3447c]"
              onClick={() => setProfileOpen(false)}
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden border border-gray-200/80 dark:border-gray-800/90 bg-white dark:bg-gray-950 shadow-2xl sm:rounded-2xl text-gray-900 dark:text-gray-100">
          {detailContentOffer && selectedOffer ? (
            <>
              <div className="h-1.5 w-full bg-gradient-to-r from-[#08afd5] via-[#e3447c] to-[#08afd5] shrink-0" />
              <div className="px-5 pt-5 pb-3 border-b border-gray-200/60 dark:border-gray-800/80 bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900/50 dark:to-gray-950/95">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {selectedOffer.influencerPhotoURL ? (
                    <img
                      src={selectedOffer.influencerPhotoURL}
                      alt={selectedOffer.influencerName || 'Influencer'}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-md ring-1 ring-gray-200/80 dark:ring-gray-700 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
                      {selectedOffer.influencerName?.charAt(0).toUpperCase() || 'I'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white p-0">
                        {selectedOffer.influencerName}
                      </DialogTitle>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-0 text-xs">
                        {getOfferTypeLabel(detailContentOffer)}
                      </Badge>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      {selectedOffer.campaignTitle}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`${statusConfig[detailContentOffer.status].color} inline-flex items-center gap-1`}>
                        {statusConfig[detailContentOffer.status].icon}
                        {statusConfig[detailContentOffer.status].label}
                      </Badge>
                      {detailActionTarget && detailActionTarget.id !== selectedOffer.id && (
                        <Badge
                          variant="outline"
                          className="text-amber-800 dark:text-amber-200 border-amber-300/60 dark:border-amber-600/50 bg-amber-50/80 dark:bg-amber-950/30"
                        >
                          Güncel pazarlık: influencer son teklif
                        </Badge>
                      )}
                    </div>
                    <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                      {detailContentOffer.campaignId && (
                        <span className="font-mono text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 break-all">
                          Kampanya: {selectedOffer.campaignId}
                        </span>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="max-h-[min(58vh,520px)] overflow-y-auto px-5 py-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="relative overflow-hidden rounded-2xl border border-[#08afd5]/40 dark:border-[#08afd5]/30 bg-gradient-to-br from-[#08afd5]/10 via-[#08afd5]/5 to-transparent dark:from-[#08afd5]/20 dark:via-slate-900/30 p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#08afd5] dark:text-[#6edff3]">
                      Kabulde kullanılacak tutar
                    </p>
                    <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums text-[#08afd5] dark:text-[#6edff3]">
                      {formatPrice(detailContentOffer.price)}
                    </p>
                    {detailActionTarget &&
                      canAcceptOrRejectIncoming(detailActionTarget) &&
                      kabulDisabledByWallet(detailActionTarget) && (
                        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200 leading-snug">
                          Bu tutarı kabul etmek için cüzdanınız yetersiz. Aşağıdaki cüzdan satırını kontrol
                          edin.
                        </p>
                      )}
                  </div>
                  <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Wallet className="w-4 h-4 text-[#08afd5] shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Cüzdan bakiyeniz</p>
                        <p className="text-lg font-semibold tabular-nums">{formatPrice(brandWalletBalance)}</p>
                      </div>
                    </div>
                    <div className="h-px bg-gray-200/80 dark:bg-gray-800" />
                    <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                      <span className="text-gray-500 shrink-0">Bakiye / tutar</span>
                      <span
                        className={
                          detailContentOffer.status === 'beklemede'
                            ? isBalanceInsufficientForIncomingAccept(
                                brandWalletBalance,
                                detailContentOffer.price
                              )
                              ? 'font-medium text-amber-700 dark:text-amber-300 text-right'
                              : 'font-medium text-emerald-700 dark:text-emerald-300 text-right'
                            : 'font-medium text-gray-600 dark:text-gray-400 text-right'
                        }
                      >
                        {detailContentOffer.status === 'beklemede'
                          ? isBalanceInsufficientForIncomingAccept(brandWalletBalance, detailContentOffer.price)
                            ? 'Kabul için yetersiz'
                            : 'Bu tutar kabul edilebilir'
                          : detailContentOffer.status === 'kabul'
                            ? 'Kabul edilmiş'
                            : 'Yanıtlandı'}
                      </span>
                    </div>
                  </div>
                </div>

                {detailActionTarget &&
                  canAcceptOrRejectIncoming(detailActionTarget) &&
                  kabulDisabledByWallet(detailActionTarget) && (
                    <div
                      className="rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/90 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
                      role="status"
                    >
                      <p className="font-medium">Bakiye yetersiz</p>
                      <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
                        Mevcut bakiye {formatPrice(brandWalletBalance)}. Teklifi kabul edebilmeniz için
                        cüzdanınıza bütçe yükleyin, ardından tekrar deneyin.
                      </p>
                    </div>
                  )}

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/50">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Oluşturulma</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(detailContentOffer.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/50">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Son güncelleme</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(detailContentOffer.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {detailContentOffer.respondedAt && (
                  <div className="p-3 rounded-xl border border-gray-200/70 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/30">
                    <p className="text-xs text-gray-500">Yanıt zamanı</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(detailContentOffer.respondedAt)}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-100/80 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/80">
                  <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <p className="text-[11px] sm:text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                    Teklif no: {detailContentOffer.id}
                  </p>
                </div>

                {detailContentOffer.message && (
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Not / teklif mesajı
                    </p>
                    <div className="relative p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800/90 bg-slate-50/90 dark:bg-slate-900/50 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <span
                        className="absolute -top-0.5 left-3 text-3xl text-[#08afd5]/30 dark:text-[#6edff3]/25 font-serif leading-none select-none"
                        aria-hidden
                      >
                        {'\u201C'}
                      </span>
                      <p className="pl-1 pt-1">{detailContentOffer.message}</p>
                    </div>
                  </div>
                )}

                {selectedOffer.campaignIsFixedOffer && offerTab === 'incoming' && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 rounded-lg border border-dashed border-gray-300/80 dark:border-gray-700/80 px-3 py-2">
                    Bu kampanyada <span className="font-medium">sabit teklif</span> uygulanıyor; fiyat
                    pazarlığı kısıtlı olabilir.
                  </p>
                )}
              </div>

              <div className="border-t border-gray-200/70 dark:border-gray-800/90 px-4 py-3 sm:px-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gray-50/50 dark:bg-gray-950/80">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => {
                      handleOpenProfile(selectedOffer);
                    }}
                  >
                    <User className="w-4 h-4 mr-1" />
                    Profil
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {detailActionTarget && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={offerRowActionClassName}
                        disabled={
                          detailUpdating ||
                          !canAcceptOrRejectIncoming(detailActionTarget) ||
                          kabulDisabledByWallet(detailActionTarget)
                        }
                        onClick={() => {
                          handleIncomingStatusUpdate(detailActionTarget, 'kabul');
                        }}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Kabul
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={offerRowActionClassName}
                        disabled={detailUpdating || !canAcceptOrRejectIncoming(detailActionTarget)}
                        onClick={() => {
                          handleIncomingStatusUpdate(detailActionTarget, 'red');
                        }}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        Red
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={offerRowActionClassName}
                        disabled={
                          !canCounterIncoming(detailActionTarget) || detailUpdating || counterSending
                        }
                        onClick={() => {
                          openIncomingCounter(detailActionTarget);
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Karşı teklif
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setDetailOpen(false)}
                  >
                    Kapat
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">Teklif detayları yüklenemedi.</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={counterOpen} onOpenChange={setCounterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Karşı Teklif Gönder</DialogTitle>
            <DialogDescription>
              {counterTarget
                ? `${counterTarget.influencerName || 'Influencer'} için yeni teklif gönderin.`
                : 'Yeni teklif detayını girin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mevcut cüzdan bakiyesi:{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatPrice(brandWalletBalance)}
              </span>
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Teklif Tutarı (₺)
              </label>
              <input
                type="number"
                min={1}
                max={brandWalletBalance > 0 ? brandWalletBalance : undefined}
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                placeholder="Örn: 25000"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
              />
            </div>
            {counterExceedsWallet && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Karşı teklif tutarı bakiyenizi aşamaz. Tutarı {formatPrice(brandWalletBalance)} veya altına
                indirin.
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mesaj (Opsiyonel)
              </label>
              <Textarea
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                placeholder="Karşı teklif notu..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterOpen(false)} disabled={counterSending}>
              İptal
            </Button>
            <Button
              className="brand-btn-primary text-white"
              onClick={handleSendIncomingCounter}
              disabled={counterSending || counterExceedsWallet}
            >
              {counterSending ? 'Gönderiliyor...' : 'Karşı Teklif Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


