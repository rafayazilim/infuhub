import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Package,
  Target,
  Wallet,
  CalendarDays,
  LayoutGrid,
  List,
  Megaphone,
  Inbox,
  MessageSquare,
  User,
  Instagram,
  Youtube,
  ExternalLink,
  Mail,
  BadgeCheck,
} from 'lucide-react';
import { getCampaignModelLabel } from '@/lib/campaignModelLabels';
import {
  resolvePrimaryOfferContentUrl,
  listOfferContentMediaItems,
  isOfferShareLinkCompleteForCampaign,
} from '@/lib/offerContentCompleteness';
import { isRevisionResponsePending } from '@/lib/offerRevisionState';
import { getContentLines, formatDurationShort, hasContentLines } from '@/lib/campaignContentLines';
import { resolveRegistrationPlatformId } from '@/constants/registrationPlatforms';
import { RegistrationPlatformIcon } from '@/components/shared/RegistrationPlatformIcon';
import { formatCampaignGoalLabel } from '@/constants/campaignGoals';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { FirebaseCampaign } from '@/services/firebaseCampaignService';
import {
  getOffersByCampaign,
  addOfferRevision,
  FirebaseOffer,
  getIncomingOffersByCampaign,
  updateIncomingCampaignOfferStatus,
  resolveIncomingCounterOfferWithBrandRevision,
  reviseIncomingCampaignParticipationOffer,
  resolveIncomingOfferNegotiationHistory,
  collapseIncomingParticipationThreadsForDisplay,
  getLatestThreadDisplay,
  isGenuineInfluencerCampaignAcceptance,
  isParticipationThreadFullyAccepted,
} from '@/services/firebaseOfferService';
import { getUserData } from '@/services/firebaseAuthService';
import { getInfluencerProfile, InfluencerProfile } from '@/services/firebaseInfluencerService';
import { buildDailyClicksSeries, getTrackingLinksByCampaign, sumClicks } from '@/services/firebaseTrackingService';
import { ContentViewerModal } from '@/components/shared/ContentViewerModal';
import { useToast } from '@/hooks/use-toast';
import {
  BRAND_WALLET_INSUFFICIENT_ERROR_MESSAGE,
  ensureBrandWallet,
  isBalanceInsufficientForIncomingAccept,
  isInsufficientBrandWalletError,
} from '@/services/firebaseBrandWalletService';

interface CampaignDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: FirebaseCampaign | null;
  brandId: string;
  onViewOffers?: (campaign: FirebaseCampaign, influencerId?: string) => void;
  canOperate?: boolean;
}

type DetailTab = 'general' | 'flow' | 'influencers' | 'incoming';

/** Kampanya > Aktif çalışan influencer kartı aksiyonları (çerçeve + pembe hover) */
const activeInfluencerCardActionClassName =
  'rounded-full gap-1.5 border border-gray-200/90 dark:border-gray-600 shadow-none h-8 px-3 text-xs font-medium text-gray-700 dark:text-gray-200 bg-transparent ' +
  '[&_svg]:size-3.5 [&_svg]:shrink-0 ' +
  'hover:!border-[#e3447c] hover:!bg-[#e3447c] hover:!text-white dark:hover:!bg-[#e3447c] dark:hover:!border-[#e3447c] dark:hover:!text-white ' +
  'active:!bg-[#c93d70] active:!border-[#c93d70] active:!text-white ' +
  'focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:outline-none ' +
  'disabled:opacity-40 disabled:hover:!bg-transparent disabled:hover:!text-gray-700 disabled:hover:!border-gray-200/90 ' +
  'dark:disabled:hover:!bg-transparent dark:disabled:hover:!text-gray-200 dark:disabled:hover:!border-gray-600';

const buildSpendingSeries = (offers: FirebaseOffer[], days: number) => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const buckets = new Map<string, { label: string; total: number }>();
  for (let i = 0; i < days; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = current.toISOString().slice(0, 10);
    const label = current.toLocaleDateString('tr-TR', { weekday: 'short' });
    buckets.set(key, { label, total: 0 });
  }

  offers.forEach((offer) => {
    const dateValue = offer.respondedAt || offer.updatedAt || offer.createdAt;
    if (!dateValue) return;
    const offerDate = new Date(dateValue);
    if (Number.isNaN(offerDate.getTime())) return;
    const key = offerDate.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket.total += offer.price || 0;
  });

  return Array.from(buckets.values()).map((bucket) => ({
    day: bucket.label,
    spent: bucket.total,
  }));
};

/** Gelen teklif rozeti: counter satırı `kabul` = iş akışı (anlaşma değil). */
function incomingListStatusLabel(offer: FirebaseOffer): string {
  if (offer.status === 'red') return 'Red';
  if (offer.status === 'beklemede') return 'Beklemede';
  if (offer.status === 'kabul' && offer.offerKind === 'counter_offer') return 'İşlendi';
  if (offer.status === 'kabul') return 'Kabul';
  return offer.status;
}

function incomingListStatusBadgeClass(offer: FirebaseOffer): string {
  if (offer.status === 'red') {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  }
  if (offer.status === 'beklemede') {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  }
  if (offer.status === 'kabul' && offer.offerKind === 'counter_offer') {
    return 'bg-slate-200/90 text-slate-700 dark:bg-slate-800/50 dark:text-slate-200';
  }
  if (offer.status === 'kabul') {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  }
  return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
}

export function CampaignDetailModal({
  isOpen,
  onClose,
  campaign,
  brandId,
  onViewOffers,
  canOperate = true,
}: CampaignDetailModalProps) {
  const [offers, setOffers] = useState<FirebaseOffer[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<FirebaseOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('general');
  const [engagementData, setEngagementData] = useState<Array<{ date: string; engagement: number }>>([]);
  const [spendingData, setSpendingData] = useState<Array<{ day: string; spent: number }>>([]);
  const [totalEngagementValue, setTotalEngagementValue] = useState(0);
  const [influencerStats, setInfluencerStats] = useState<Record<string, { engagement: number; revisionRequests: number; contentViews: number }>>({});
  const [influencers, setInfluencers] = useState<
    Array<{
      id: string;
      name: string;
      profilePhotoURL?: string;
      offerId: string;
	      contentLink?: string;
	      contentApproved?: boolean;
	      contentMediaApproved?: boolean;
	      revisionResponsePending?: boolean;
      shareLinkComplete?: boolean;
      contentMediaItems?: Array<{ url: string; label: string; shareLink?: string }>;
    }>
  >([]);
  const [savedInfluencers, setSavedInfluencers] = useState<Array<{ id: string; name: string; profilePhotoURL?: string }>>([]);
  const [incomingOfferInfluencerNames, setIncomingOfferInfluencerNames] = useState<Record<string, string>>({});
  const [incomingOfferInfluencerPhotos, setIncomingOfferInfluencerPhotos] = useState<Record<string, string>>({});
  const [incomingHistoryByOfferId, setIncomingHistoryByOfferId] = useState<
    Record<
      string,
      Array<{
        actor: 'brand' | 'influencer';
        price: number;
        message?: string;
        createdAt: string;
        type: 'initial' | 'counter' | 'revision';
      }>
    >
  >({});
  const [incomingProcessingOfferId, setIncomingProcessingOfferId] = useState<string | null>(null);
  const [incomingLockedOfferIds, setIncomingLockedOfferIds] = useState<Record<string, boolean>>({});
  const [incomingTypeTab, setIncomingTypeTab] = useState<'campaign' | 'counter'>('campaign');
  const [incomingViewMode, setIncomingViewMode] = useState<'card' | 'list'>('card');
  const [incomingCounterModalOpen, setIncomingCounterModalOpen] = useState(false);
  const [incomingCounterTarget, setIncomingCounterTarget] = useState<FirebaseOffer | null>(null);
  const [incomingCounterPrice, setIncomingCounterPrice] = useState('');
  const [incomingCounterMessage, setIncomingCounterMessage] = useState('');
  const [incomingCounterSending, setIncomingCounterSending] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionTarget, setRevisionTarget] = useState<{ offerId: string; influencerName: string } | null>(null);
  const [revisionSending, setRevisionSending] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<InfluencerProfile | null>(null);
  const [selectedProfileName, setSelectedProfileName] = useState('');
  const [contentViewerOpen, setContentViewerOpen] = useState(false);
  const [selectedContentUrl, setSelectedContentUrl] = useState('');
  const [selectedContentOfferId, setSelectedContentOfferId] = useState<string | undefined>();
	  const [selectedContentInfluencerId, setSelectedContentInfluencerId] = useState<string | undefined>();
	  const [selectedContentApproved, setSelectedContentApproved] = useState(false);
	  const [selectedContentApprovalMode, setSelectedContentApprovalMode] = useState<'final' | 'collaboration_raw'>('final');
  const [selectedContentPreviewUnlocked, setSelectedContentPreviewUnlocked] = useState(false);
  const [selectedContentCanApprove, setSelectedContentCanApprove] = useState(true);
  const [contentViewerMediaItems, setContentViewerMediaItems] = useState<
    Array<{ url: string; label: string; shareLink?: string }>
  >([]);
  const [brandWalletBalance, setBrandWalletBalance] = useState(0);
  /** `offers/{id}` eşleşmesi; kampanya incoming kopyası eski kaldığında status buradan düzeltilir. */
  const [campaignOfferById, setCampaignOfferById] = useState<Record<string, FirebaseOffer>>({});
  const { toast } = useToast();

  const incomingCounterPriceNum = Number(incomingCounterPrice);
  const incomingCounterPriceRounded = Number.isFinite(incomingCounterPriceNum)
    ? Math.round(incomingCounterPriceNum)
    : NaN;
  const incomingCounterExceedsWallet =
    Number.isFinite(incomingCounterPriceRounded) &&
    incomingCounterPriceRounded > 0 &&
    incomingCounterPriceRounded > brandWalletBalance;

  useEffect(() => {
    if (isOpen && campaign) {
      setActiveTab('general');
      setIncomingTypeTab('campaign');
      setIncomingViewMode('card');
      loadSavedInfluencers();
      loadIncomingOffers();

      loadCampaignData();
    }
  }, [isOpen, campaign]);

  const loadCampaignData = async () => {
    if (!campaign) return;

    setLoading(true);
    try {
      const offersData = await getOffersByCampaign(campaign.id);
      const outgoingOffers = offersData.filter(
        (offer) => offer.sourceType === 'brand' && offer.destinationType === 'influencer'
      );
      setOffers(outgoingOffers);

      const acceptedOffers = outgoingOffers.filter((o) => o.status === 'kabul');
      setSpendingData(buildSpendingSeries(acceptedOffers, 7));

      const trackingLinks = await getTrackingLinksByCampaign(campaign.id);
      setEngagementData(buildDailyClicksSeries(trackingLinks, 30, 'dayMonth'));
      setTotalEngagementValue(sumClicks(trackingLinks));

      const statsMap: Record<string, { engagement: number; revisionRequests: number; contentViews: number }> = {};
      trackingLinks.forEach((link) => {
        if (!link.influencerId) return;
        const clicks = sumClicks([link]);
        if (!statsMap[link.influencerId]) {
          statsMap[link.influencerId] = { engagement: 0, revisionRequests: 0, contentViews: 0 };
        }
        statsMap[link.influencerId].engagement += clicks;
      });
      setInfluencerStats(statsMap);

      /** Yalnızca gerçek anlaşma: karşı teklif satırındaki iş akışı `kabul` değil. */
      const allAcceptedForCampaign = offersData.filter(isGenuineInfluencerCampaignAcceptance);
      const latestAcceptedByInfluencer = Object.values(
        allAcceptedForCampaign.reduce<Record<string, FirebaseOffer>>((acc, offer) => {
          const prev = acc[offer.influencerId];
          const prevTs = new Date(prev?.updatedAt || prev?.createdAt || 0).getTime();
          const curTs = new Date(offer.updatedAt || offer.createdAt || 0).getTime();
          if (!prev || curTs >= prevTs) {
            acc[offer.influencerId] = offer;
          }
          return acc;
        }, {})
      );

      const influencerPromises = latestAcceptedByInfluencer.map(async (offer) => {
        const mediaItems = listOfferContentMediaItems(offer, campaign);
        const primaryUrl = mediaItems[0]?.url || resolvePrimaryOfferContentUrl(offer) || offer.contentLink;
        const shareLinkComplete = isOfferShareLinkCompleteForCampaign(offer, campaign);
        try {
          const influencerData = await getUserData(offer.influencerId, 'influencer');
          const profile = await getInfluencerProfile(offer.influencerId);
          return {
            id: offer.influencerId,
            name: (influencerData as any)?.fullName || 'Bilinmeyen Influencer',
            profilePhotoURL: profile?.profilePhotoURL,
            offerId: offer.id,
            contentLink: primaryUrl,
	            contentApproved: offer.contentApproved || false,
	            contentMediaApproved: offer.contentMediaApproved || false,
	            revisionResponsePending: isRevisionResponsePending(offer),
            shareLinkComplete,
            contentMediaItems: mediaItems,
          };
        } catch {
          return {
            id: offer.influencerId,
            name: 'Bilinmeyen Influencer',
            profilePhotoURL: undefined,
            offerId: offer.id,
            contentLink: primaryUrl,
	            contentApproved: offer.contentApproved || false,
	            contentMediaApproved: offer.contentMediaApproved || false,
	            revisionResponsePending: isRevisionResponsePending(offer),
            shareLinkComplete,
            contentMediaItems: mediaItems,
          };
        }
      });

      const influencerData = (await Promise.all(influencerPromises)).sort((a, b) =>
        a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
      );
      setInfluencers(influencerData);
    } catch (error) {
      console.error('Kampanya verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIncomingOffers = async () => {
    if (!campaign) return;

    try {
      const [rawIncoming, campaignOffers] = await Promise.all([
        getIncomingOffersByCampaign(brandId, campaign.id),
        getOffersByCampaign(campaign.id),
      ]);
      const offerMap = campaignOffers.reduce<Record<string, FirebaseOffer>>((acc, offer) => {
        acc[offer.id] = offer;
        return acc;
      }, {});
      const rawMerged: FirebaseOffer[] = rawIncoming.map((row) =>
        offerMap[row.id] ? { ...row, ...offerMap[row.id] } : row
      );
      const data = collapseIncomingParticipationThreadsForDisplay(rawMerged);
      setIncomingOffers(data);
      setCampaignOfferById(offerMap);

      const influencerIds = Array.from(new Set(data.map((offer) => offer.influencerId)));
      const profileEntries = await Promise.all(
        influencerIds.map(async (influencerId) => {
          try {
            const [influencer, profile] = await Promise.all([
              getUserData(influencerId, 'influencer'),
              getInfluencerProfile(influencerId).catch(() => null),
            ]);
            return [
              influencerId,
              {
                name: (influencer as any)?.fullName || 'Bilinmeyen Influencer',
                photo: profile?.profilePhotoURL || '',
              },
            ] as const;
          } catch {
            return [influencerId, { name: 'Bilinmeyen Influencer', photo: '' }] as const;
          }
        })
      );

      const nameMap: Record<string, string> = {};
      const photoMap: Record<string, string> = {};
      profileEntries.forEach(([id, info]) => {
        nameMap[id] = info.name;
        photoMap[id] = info.photo;
      });
      setIncomingOfferInfluencerNames(nameMap);
      setIncomingOfferInfluencerPhotos(photoMap);

      const historyMap: Record<
        string,
        Array<{
          actor: 'brand' | 'influencer';
          price: number;
          message?: string;
          createdAt: string;
          type: 'initial' | 'counter' | 'revision';
        }>
      > = {};
      data.forEach((offer) => {
        /* Kampanya incomingOffers düğümünde negotiationHistory yok; yalnızca offers/{id} altında tutuluyor. */
        historyMap[offer.id] = resolveIncomingOfferNegotiationHistory(
          offerMap[offer.id] || offer,
          offerMap
        );
      });
      setIncomingHistoryByOfferId(historyMap);
      setIncomingLockedOfferIds({});

      try {
        const w = await ensureBrandWallet(brandId);
        setBrandWalletBalance(w.balance);
      } catch {
        setBrandWalletBalance(0);
      }
    } catch (error) {
      console.error('Gelen teklifler yüklenemedi:', error);
      setIncomingOffers([]);
      setCampaignOfferById({});
      setIncomingOfferInfluencerNames({});
      setIncomingOfferInfluencerPhotos({});
      setIncomingHistoryByOfferId({});
      setIncomingLockedOfferIds({});
    }
  };

  const loadSavedInfluencers = async () => {
    if (!campaign?.savedInfluencers || campaign.savedInfluencers.length === 0) {
      setSavedInfluencers([]);
      return;
    }

    try {
      const saved = await Promise.all(
        campaign.savedInfluencers.map(async (influencerId) => {
          try {
            const influencerData = await getUserData(influencerId, 'influencer');
            const profile = await getInfluencerProfile(influencerId);
            return {
              id: influencerId,
              name: (influencerData as any)?.fullName || 'Bilinmeyen Influencer',
              profilePhotoURL: profile?.profilePhotoURL,
            };
          } catch {
            return {
              id: influencerId,
              name: 'Bilinmeyen Influencer',
              profilePhotoURL: undefined,
            };
          }
        })
      );
      setSavedInfluencers(saved);
    } catch {
      setSavedInfluencers([]);
    }
  };

  const handleUpdateIncomingOfferStatus = async (
    offer: FirebaseOffer,
    status: 'beklemede' | 'kabul' | 'red'
  ) => {
    if (!campaign) return;
    if (incomingProcessingOfferId || incomingLockedOfferIds[offer.id]) return;
    if (offer.status !== 'beklemede') return;
    if (status === 'kabul' || status === 'red') {
      const h = incomingHistoryByOfferId[offer.id] || [];
      const awaitingInfluencerAfterBrand =
        h.length > 0 && h[h.length - 1].actor === 'brand';
      if (awaitingInfluencerAfterBrand) return;
    }
    const hForPrice = incomingHistoryByOfferId[offer.id] || [];
    const { displayPrice: offerPriceForWallet } = getLatestThreadDisplay(offer, hForPrice);
    if (status === 'kabul' && isBalanceInsufficientForIncomingAccept(brandWalletBalance, offerPriceForWallet)) {
      toast({
        title: 'Yetersiz bakiye',
        description: BRAND_WALLET_INSUFFICIENT_ERROR_MESSAGE,
        variant: 'destructive',
      });
      return;
    }

    try {
      const now = new Date().toISOString();
      setIncomingProcessingOfferId(offer.id);
      setIncomingLockedOfferIds((prev) => ({ ...prev, [offer.id]: true }));
      setIncomingOffers((prev) =>
        prev.map((item) =>
          item.id === offer.id
            ? {
                ...item,
                status,
                updatedAt: now,
                respondedAt: status === 'beklemede' ? undefined : now,
              }
            : item
        )
      );
      await updateIncomingCampaignOfferStatus(brandId, campaign.id, offer.id, status);
      await loadIncomingOffers();
      await loadCampaignData();
    } catch (error) {
      console.error('Gelen teklif durumu güncellenemedi:', error);
      const isWallet = isInsufficientBrandWalletError(error);
      const description = isWallet
        ? BRAND_WALLET_INSUFFICIENT_ERROR_MESSAGE
        : error instanceof Error
          ? error.message
          : 'Teklif durumu güncellenemedi.';
      toast({
        title: isWallet ? 'Yetersiz bakiye' : 'Hata',
        description,
        variant: 'destructive',
      });
      setIncomingLockedOfferIds((prev) => {
        const next = { ...prev };
        delete next[offer.id];
        return next;
      });
      await loadIncomingOffers();
    } finally {
      setIncomingProcessingOfferId(null);
    }
  };

  const openIncomingCounterModal = (offer: FirebaseOffer) => {
    if (campaign?.isFixedOffer) {
      window.alert('Bu kampanyada sabit teklif aktif; karşı teklif verilemez.');
      return;
    }
    const h = incomingHistoryByOfferId[offer.id] || [];
    if (
      offer.status === 'beklemede' &&
      h.length > 0 &&
      h[h.length - 1].actor === 'brand'
    ) {
      window.alert('Influencer yaniti bekleniyor; yeni karsi teklif gonderilemez.');
      return;
    }
    setIncomingCounterTarget(offer);
    const h0 = incomingHistoryByOfferId[offer.id] || [];
    const { displayPrice: baseCounterPrice } = getLatestThreadDisplay(offer, h0);
    setIncomingCounterPrice(Number.isFinite(baseCounterPrice) ? String(baseCounterPrice) : '');
    setIncomingCounterMessage('');
    setIncomingCounterModalOpen(true);
  };

  const handleSendIncomingCounterOffer = async () => {
    if (!campaign || !incomingCounterTarget) return;
    const parsed = Number(incomingCounterPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      window.alert('Gecerli bir teklif tutari girin.');
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

    const releaseCounterLock = () => {
      setIncomingLockedOfferIds((prev) => {
        const next = { ...prev };
        delete next[incomingCounterTarget.id];
        return next;
      });
    };

    try {
      setIncomingCounterSending(true);
      setIncomingLockedOfferIds((prev) => ({ ...prev, [incomingCounterTarget.id]: true }));
      if (
        incomingCounterTarget.offerKind === 'counter_offer' &&
        incomingCounterTarget.sourceType === 'influencer'
      ) {
        await resolveIncomingCounterOfferWithBrandRevision({
          brandId,
          campaignId: campaign.id,
          counterOfferId: incomingCounterTarget.id,
          price: parsed,
          message: incomingCounterMessage.trim() || undefined,
        });
      } else if (incomingCounterTarget.offerKind === 'incoming_campaign') {
        await reviseIncomingCampaignParticipationOffer({
          brandId,
          campaignId: campaign.id,
          offerId: incomingCounterTarget.id,
          price: parsed,
          message: incomingCounterMessage.trim() || undefined,
        });
      } else {
        window.alert('Bu teklif turu icin karsi teklif desteklenmiyor.');
        releaseCounterLock();
        return;
      }
      await loadIncomingOffers();
      setIncomingCounterModalOpen(false);
      setIncomingCounterTarget(null);
      setIncomingCounterPrice('');
      setIncomingCounterMessage('');
      window.alert('Karsi teklif influencera gonderildi.');
    } catch {
      window.alert('Karsi teklif gonderilemedi.');
      releaseCounterLock();
    } finally {
      setIncomingCounterSending(false);
    }
  };

  const handleSendRevision = async () => {
    if (!revisionTarget) return;
    const note = revisionNote.trim();
    if (!note) return;
    try {
      setRevisionSending(true);
      await addOfferRevision(revisionTarget.offerId, note);
      setRevisionModalOpen(false);
      setRevisionNote('');
      setRevisionTarget(null);
      window.alert('Revizyon talebi gonderildi.');
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : 'Revizyon talebi gönderilemedi.');
    } finally {
      setRevisionSending(false);
    }
  };

  if (!campaign) return null;

  const isDraft = campaign.status === 'taslak';
  const isCompleted = campaign.status === 'tamamlandı';
  const isLocked = isCompleted || campaign.status === 'iptal' || !canOperate;

  const acceptedOffers = offers.filter((o) => o.status === 'kabul');
  const pendingOffers = offers.filter((o) => o.status === 'beklemede');
  const rejectedOffers = offers.filter((o) => o.status === 'red');
  const totalSpent = acceptedOffers.reduce((sum, o) => sum + o.price, 0);

  const campaignIncomingOffers = incomingOffers.filter(
    (offer) => offer.offerKind !== 'counter_offer'
  );
  const counterIncomingOffers = incomingOffers.filter(
    (offer) => offer.offerKind === 'counter_offer'
  );
  const activeIncomingOffers = incomingTypeTab === 'campaign' ? campaignIncomingOffers : counterIncomingOffers;
  const withIncomingCanonical = (o: FirebaseOffer) =>
    campaignOfferById[o.id] ? { ...o, ...campaignOfferById[o.id] } : o;
  const activeIncomingSummary = {
    total: activeIncomingOffers.length,
    pending: activeIncomingOffers.filter((o) => {
      const c = withIncomingCanonical(o);
      if (c.status !== 'beklemede') return false;
      if (isParticipationThreadFullyAccepted(c, campaignOfferById)) return false;
      return true;
    }).length,
    accepted: activeIncomingOffers.filter((o) =>
      isGenuineInfluencerCampaignAcceptance(withIncomingCanonical(o))
    ).length,
    rejected: activeIncomingOffers.filter((o) => withIncomingCanonical(o).status === 'red').length,
  };

  const tabButtonClass = (tab: DetailTab) =>
    `px-4 py-2 rounded-full text-sm font-medium transition-all ${
      activeTab === tab
        ? 'bg-[#08afd5] text-white shadow-sm'
        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  const formatPrice = (value?: number) =>
    typeof value === 'number'
      ? new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: 'TRY',
          minimumFractionDigits: 0,
        }).format(value)
      : '-';

  const normalizePlatforms = (profile: InfluencerProfile) => {
    if (!profile?.platforms) return [] as Array<{ id: string; username: string; followers?: number }>;
    if (Array.isArray(profile.platforms)) {
      return profile.platforms.map((p) => ({
        id: p.id,
        username: p.username,
        followers: p.followers,
      }));
    }
    const obj = profile.platforms as Record<string, { username: string; followers: number } | undefined>;
    return Object.entries(obj)
      .filter(([, value]) => Boolean(value?.username))
      .map(([id, value]) => ({
        id,
        username: value?.username || '',
        followers: value?.followers,
      }));
  };

  const openInfluencerProfile = async (influencerId: string, fallbackName?: string) => {
    try {
      setProfileOpen(true);
      setProfileLoading(true);
      setSelectedProfile(null);
      setSelectedProfileName(fallbackName || 'Influencer');
      const profile = await getInfluencerProfile(influencerId);
      setSelectedProfile(profile);
      setSelectedProfileName(profile?.fullName || fallbackName || 'Influencer');
    } catch {
      setSelectedProfile(null);
      setSelectedProfileName(fallbackName || 'Influencer');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-800/50 flex flex-col">
              <div className="flex items-center justify-end p-4 border-b border-gray-200/50 dark:border-gray-800/50">
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="px-6 pt-4 border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="inline-flex items-center gap-2 rounded-full bg-gray-100/80 dark:bg-gray-800/80 p-1.5 mb-4">
                  <button className={tabButtonClass('general')} onClick={() => setActiveTab('general')}>
                    <LayoutGrid size={14} className="inline mr-1.5" />
                    Genel
                  </button>
                  <button className={tabButtonClass('flow')} onClick={() => setActiveTab('flow')}>
                    <TrendingUp size={14} className="inline mr-1.5" />
                    Kampanya Akışı
                  </button>
                  <button className={tabButtonClass('influencers')} onClick={() => setActiveTab('influencers')}>
                    <Users size={14} className="inline mr-1.5" />
                    Kampanyadaki Influencerlar
                  </button>
                  <button className={tabButtonClass('incoming')} onClick={() => setActiveTab('incoming')}>
                    <Inbox size={14} className="inline mr-1.5" />
                    Gelen Teklifler
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 min-h-0 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-[#08afd5]/30 border-t-[#08afd5] rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {activeTab === 'general' && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
                          <Card className="overflow-hidden border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_0.9fr] gap-0">
                              <div className="relative min-h-[260px] md:min-h-[340px]">
                                {campaign.campaignImageURL ? (
                                  <img
                                    src={campaign.campaignImageURL}
                                    alt={campaign.campaignName || campaign.title || 'Kampanya'}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
                                )}
                              </div>
                              <div className="p-5">
                                <h4 className="text-3xl leading-tight font-bold text-gray-900 dark:text-white">
                                  {campaign.campaignName || campaign.title || campaign.productInfo}
                                </h4>
                                <p className="mt-3 text-base text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                  {campaign.campaignDescription || campaign.productDescription || campaign.productInfo || 'Kampanya açıklaması bulunmuyor.'}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Badge className="bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3]">
                                    {getCampaignModelLabel(campaign.campaignModel)}
                                  </Badge>
                                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                    {(() => {
                                      const start = campaign.publishWindow?.start || campaign.duration?.start;
                                      const end = campaign.publishWindow?.end || campaign.duration?.end;
                                      if (start && end) {
                                        const startDate = new Date(start);
                                        const endDate = new Date(end);
                                        if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
                                          const now = new Date();
                                          if (now >= startDate && now <= endDate) return 'Aktif';
                                        }
                                      }
                                      return campaign.status === 'taslak' ? 'Taslak' : campaign.status;
                                    })()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-5 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                              Kabul edilen influencerlar
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                              Bu kampanyada teklifi onaylanmış kişiler (kayıtlı liste değil).
                            </p>
                            <div className="space-y-3 max-h-[255px] overflow-y-auto pr-1 mac-scrollbar">
                              {influencers.slice(0, 5).map((inf) => (
                                <div key={inf.id} className="flex items-center gap-3">
                                  {inf.profilePhotoURL ? (
                                    <img src={inf.profilePhotoURL} alt={inf.name} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-white flex items-center justify-center font-bold">
                                      {inf.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white truncate">{inf.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      Tıklama:{' '}
                                      {(influencerStats[inf.id]?.engagement ?? 0).toLocaleString('tr-TR')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {influencers.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Henüz kabul edilmiş bir influencer yok. Teklif onaylandığında burada
                                  listelenir.
                                </p>
                              )}
                            </div>
                            {onViewOffers && !isLocked && (
                              <Button
                                className="w-full mt-4 brand-btn-primary text-white rounded-xl"
                                onClick={() => {
                                  onViewOffers(campaign);
                                  onClose();
                                }}
                              >
                                <Megaphone size={15} className="mr-2" />
                                Influencerlara Teklif Ver
                              </Button>
                            )}
                          </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="p-4 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                            <div className="flex items-center gap-2 mb-3">
                              <Target size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
                              <h5 className="font-semibold text-gray-900 dark:text-white">Hedef Kitle</h5>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">Yaş: {campaign.targetAudience?.ageRange || '-'}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">Cinsiyet: {campaign.targetAudience?.gender === 'female' ? 'Kadın' : campaign.targetAudience?.gender === 'male' ? 'Erkek' : 'Herkes'}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Ürün (alt kategori):{' '}
                              {Array.isArray(campaign.targetAudience?.productSubcategories) &&
                              campaign.targetAudience.productSubcategories.length > 0
                                ? campaign.targetAudience.productSubcategories.join(', ')
                                : campaign.targetAudience?.interests || '-'}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">Lokasyon: {campaign.targetAudience?.location || '-'}</p>
                          </Card>

                          <Card className="p-4 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                            <div className="flex items-center gap-2 mb-3">
                              <Megaphone size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
                              <h5 className="font-semibold text-gray-900 dark:text-white">İçerik</h5>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(campaign.platforms || []).map((platform) => (
                                <Badge key={platform} variant="secondary" className="bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3]">{platform}</Badge>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(campaign.contentFormats || []).map((format) => (
                                <Badge key={format} variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{format}</Badge>
                              ))}
                            </div>
                          </Card>

                          <Card className="p-4 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                            <div className="flex items-center gap-2 mb-3">
                              <Wallet size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
                              <h5 className="font-semibold text-gray-900 dark:text-white">Kampanya Bilgileri</h5>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Hedef: {formatCampaignGoalLabel(campaign.campaignGoal) || '-'}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">Bütçe: {formatPrice(campaign.budget?.perInfluencer || campaign.budget?.total)}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">Son başvuru: {campaign.applicationDeadline || '-'}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">Paylaşım: {campaign.publishWindow?.start || campaign.duration?.start || '-'} - {campaign.publishWindow?.end || campaign.duration?.end || '-'}</p>
                          </Card>
                        </div>
                      </div>
                    )}

                    {activeTab === 'flow' && (
                      <>
                        {isDraft ? (
                          <div className="space-y-6">
                            <Card className="p-4 border border-[#08afd5]/35 dark:border-[#08afd5]/40 bg-[#08afd5]/10 dark:bg-[#08afd5]/15">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Clock className="text-[#08afd5] dark:text-[#6edff3]" size={18} />
                                  <p className="text-sm font-medium text-[#08afd5] dark:text-[#6edff3]">
                                    Taslak kampanya: Henüz influencer anlaşması yok.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {onViewOffers && !isLocked && (
                                    <Button
                                      size="sm"
                                      className="brand-btn-primary text-white rounded-lg"
                                      onClick={() => {
                                        onViewOffers(campaign);
                                        onClose();
                                      }}
                                    >
                                      <Megaphone size={14} className="mr-1.5" />
                                      Influencerlara Teklif Ver
                                    </Button>
                                  )}
                                  <Badge className="bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3] border border-[#08afd5]/30 dark:border-[#08afd5]/40">
                                    Taslak
                                  </Badge>
                                </div>
                              </div>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <Card className="p-5 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-2 mb-4">
                                  <Package size={18} className="text-[#08afd5] dark:text-[#6edff3]" />
                                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">Ürün Bilgileri</h4>
                                </div>
                                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                  <p><strong>Ürün:</strong> {campaign.title || campaign.productInfo}</p>
                                  {campaign.productDescription ? (
                                    <p><strong>Açıklama:</strong> {campaign.productDescription}</p>
                                  ) : (
                                    <p className="text-gray-500 dark:text-gray-400">Açıklama girilmemiş.</p>
                                  )}
                                </div>
                              </Card>

                              <Card className="p-5 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-2 mb-4">
                                  <Target size={18} className="text-[#08afd5] dark:text-[#6edff3]" />
                                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">Hedef Kitle</h4>
                                </div>
                                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                  {campaign.targetAudience?.ageRange && <p><strong>Yaş Aralığı:</strong> {campaign.targetAudience.ageRange}</p>}
                                  {(Array.isArray(campaign.targetAudience?.productSubcategories) &&
                                    campaign.targetAudience.productSubcategories.length > 0) ||
                                  campaign.targetAudience?.interests ? (
                                    <p>
                                      <strong>Ürün (alt kategori):</strong>{' '}
                                      {Array.isArray(campaign.targetAudience?.productSubcategories) &&
                                      campaign.targetAudience.productSubcategories.length > 0
                                        ? campaign.targetAudience.productSubcategories.join(', ')
                                        : campaign.targetAudience?.interests}
                                    </p>
                                  ) : null}
                                  {campaign.targetAudience?.location && <p><strong>Lokasyon:</strong> {campaign.targetAudience.location}</p>}
                                </div>
                              </Card>

                              <Card className="p-5 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-2 mb-4">
                                  <Wallet size={18} className="text-[#08afd5] dark:text-[#6edff3]" />
                                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">Bütçe & Model</h4>
                                </div>
                                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                  <p>
                                    <strong>Influencer Bütçesi:</strong>{' '}
                                    {new Intl.NumberFormat('tr-TR', {
                                      style: 'currency',
                                      currency: 'TRY',
                                      minimumFractionDigits: 0,
                                    }).format(campaign.budget.total)}
                                  </p>
                                  <p>
                                    <strong>Çalışma Modeli:</strong> {getCampaignModelLabel(campaign.campaignModel)}
                                  </p>
                                </div>
                              </Card>

                              <Card className="p-5 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-2 mb-4">
                                  <CalendarDays size={18} className="text-[#08afd5] dark:text-[#6edff3]" />
                                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">Kampanya Süresi</h4>
                                </div>
                                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                  {campaign.duration?.start && <p><strong>Başlangıç:</strong> {campaign.duration.start}</p>}
                                  {campaign.duration?.end && <p><strong>Bitiş:</strong> {campaign.duration.end}</p>}
                                  {campaign.duration?.period && <p><strong>Süre:</strong> {campaign.duration.period}</p>}
                                </div>
                              </Card>

                              <Card className="p-5 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-2 mb-4">
                                  <LayoutGrid size={18} className="text-[#08afd5] dark:text-[#6edff3]" />
                                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">İçerik talepleri</h4>
                                </div>
                                {hasContentLines(campaign) ? (
                                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                    {getContentLines(campaign).map((row) => (
                                      <li
                                        key={row.id}
                                        className="flex items-center gap-2 rounded-lg border border-gray-200/70 dark:border-gray-700/70 px-2 py-1.5"
                                      >
                                        {row.kind === 'ugc' ? (
                                          <span>
                                            <strong>UGC</strong> — {row.aspectRatio}, {formatDurationShort(row.durationSec)}
                                          </span>
                                        ) : (
                                          <>
                                            <RegistrationPlatformIcon
                                              platformId={resolveRegistrationPlatformId(row.platform)}
                                              size={16}
                                            />
                                            <span>
                                              {row.platform} — {row.contentFormat}
                                            </span>
                                          </>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Platformlar</p>
                                      <div className="flex flex-wrap gap-2">
                                        {(campaign.platforms || []).length > 0 ? (
                                          campaign.platforms.map((platform) => (
                                            <Badge key={platform} variant="secondary" className="bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3]">
                                              {platform}
                                            </Badge>
                                          ))
                                        ) : (
                                          <p className="text-sm text-gray-500 dark:text-gray-400">—</p>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">İçerik formatları</p>
                                      <div className="flex flex-wrap gap-2">
                                        {(campaign.contentFormats || []).length > 0 ? (
                                          campaign.contentFormats.map((format) => (
                                            <Badge key={format} variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                                              {format}
                                            </Badge>
                                          ))
                                        ) : (
                                          <p className="text-sm text-gray-500 dark:text-gray-400">—</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Card>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Toplam Teklif</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{offers.length}</p>
                              </Card>
                              <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Toplam Harcama</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                  {new Intl.NumberFormat('tr-TR', {
                                    style: 'currency',
                                    currency: 'TRY',
                                    minimumFractionDigits: 0,
                                  }).format(totalSpent)}
                                </p>
                              </Card>
                              <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Toplam Etkileşim</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalEngagementValue}</p>
                              </Card>
                              <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Aktif Influencer</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{influencers.length}</p>
                              </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Etkileşim Trendi (30 Gün)</h4>
                                <div className="h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={engagementData}>
                                      <defs>
                                        <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                      </defs>
                                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(value) => value.split(' ')[0]} />
                                      <YAxis tick={{ fontSize: 12 }} />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                          border: '1px solid #e5e7eb',
                                          borderRadius: '8px',
                                        }}
                                      />
                                      <Area type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={2} fill="url(#engagementGradient)" />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </Card>

                              <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Harcama Trendi (7 Gün)</h4>
                                <div className="h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={spendingData}>
                                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                                      <YAxis tick={{ fontSize: 12 }} />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                          border: '1px solid #e5e7eb',
                                          borderRadius: '8px',
                                        }}
                                        formatter={(value: number) =>
                                          new Intl.NumberFormat('tr-TR', {
                                            style: 'currency',
                                            currency: 'TRY',
                                            minimumFractionDigits: 0,
                                          }).format(value)
                                        }
                                      />
                                      <Bar dataKey="spent" fill="#10b981" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </Card>
                            </div>

                            <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teklif Durumu</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-800/30">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="text-yellow-600 dark:text-yellow-400" size={18} />
                                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Beklemede</span>
                                  </div>
                                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{pendingOffers.length}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="text-green-600 dark:text-green-400" size={18} />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Kabul Edildi</span>
                                  </div>
                                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{acceptedOffers.length}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30">
                                  <div className="flex items-center gap-2 mb-2">
                                    <XCircle className="text-red-600 dark:text-red-400" size={18} />
                                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Reddedildi</span>
                                  </div>
                                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{rejectedOffers.length}</p>
                                </div>
                              </div>
                            </Card>
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === 'influencers' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Aktif Çalışan Influencerlar</h4>
                            <span className="text-xs text-gray-500">{influencers.length} kişi</span>
                          </div>
                          {influencers.length === 0 ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400">Henüz aktif influencer yok.</p>
                          ) : (
                            <div className="space-y-3">
                              {influencers.map((influencer) => {
                                const stats = influencerStats[influencer.id] || {
                                  engagement: 0,
                                  revisionRequests: 0,
                                  contentViews: 0,
                                };

                                const isCollaboration = campaign?.campaignModel === 'collaboration';
                                const rawContentApproved = isCollaboration && influencer.contentMediaApproved === true;

                                const revisionDisabled =
                                  isLocked ||
                                  influencer.contentApproved ||
                                  rawContentApproved ||
                                  !influencer.contentLink ||
                                  influencer.revisionResponsePending;
                                const revisionTitle = influencer.contentApproved
                                  ? 'İçerik onaylandığı için revizyon istenemez'
                                  : rawContentApproved
                                    ? 'Ham içerik onaylandıktan sonra revizyon istenemez'
                                  : influencer.revisionResponsePending
                                    ? 'Influencer yeni içeriği yükleyene kadar ikinci revizyon talebi gönderilemez'
                                  : !influencer.contentLink
                                    ? 'Influencer içerik yüklemeden revizyon istenemez'
                                    : isLocked
                                      ? 'Bu kampanyada işlem yapılamaz'
                                      : undefined;

                                return (
                                  <div
                                    key={influencer.id}
                                    className="p-4 rounded-2xl bg-gradient-to-br from-white via-slate-50 to-[#08afd5]/5 dark:from-gray-900 dark:via-gray-900 dark:to-[#08afd5]/10 border border-gray-200/70 dark:border-gray-700/70 shadow-sm"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {influencer.profilePhotoURL ? (
                                        <img
                                          src={influencer.profilePhotoURL}
                                          alt={influencer.name}
                                          className="w-12 h-12 shrink-0 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold shadow-sm">
                                          {influencer.name.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-semibold text-gray-900 dark:text-white block truncate">{influencer.name}</span>
                                          <Badge
                                            className={
                                              influencer.contentApproved
                                                ? 'rounded-full border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300'
                                                : 'rounded-full border-0 bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3]'
                                            }
                                          >
                                            {influencer.contentApproved ? 'Tamamlandı' : 'Aktif'}
                                          </Badge>
                                        </div>
                                        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-yellow-200/70 bg-yellow-50 px-2.5 py-1 text-xs text-yellow-700 dark:border-yellow-800/50 dark:bg-yellow-900/20 dark:text-yellow-300">
                                          <Clock size={12} />
                                          Revizyon: <strong>{stats.revisionRequests}</strong>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-200/70 dark:border-gray-700/60 flex flex-wrap items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={activeInfluencerCardActionClassName}
                                        onClick={() => openInfluencerProfile(influencer.id, influencer.name)}
                                      >
                                        <User />
                                        Profil
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={activeInfluencerCardActionClassName}
                                        disabled={!influencer.contentLink}
                                        onClick={() => {
                                          if (!influencer.contentLink) return;
                                          setSelectedContentUrl(influencer.contentLink);
                                          setContentViewerMediaItems(influencer.contentMediaItems ?? []);
                                          setSelectedContentOfferId(influencer.offerId);
                                          setSelectedContentInfluencerId(influencer.id);
	                                          setSelectedContentApproved(influencer.contentApproved || false);
                                          setSelectedContentPreviewUnlocked(rawContentApproved);
                                          setSelectedContentCanApprove(
                                            !isCollaboration ||
                                              !influencer.contentMediaApproved ||
                                              influencer.shareLinkComplete === true
                                          );
	                                          setSelectedContentApprovalMode(
	                                            isCollaboration && !influencer.contentMediaApproved
	                                              ? 'collaboration_raw'
	                                              : 'final'
	                                          );
	                                          setContentViewerOpen(true);
                                        }}
                                      >
                                        <Eye />
                                        İçerik Görüntüle
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={activeInfluencerCardActionClassName}
                                        onClick={() => {
                                          setRevisionTarget({
                                            offerId: influencer.offerId,
                                            influencerName: influencer.name,
                                          });
                                          setRevisionNote('');
                                          setRevisionModalOpen(true);
                                        }}
                                        disabled={revisionDisabled}
                                        title={revisionTitle}
                                      >
                                        <MessageSquare />
                                        Revizyon İste
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>

                        <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Kayıtlı Influencerlar</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{savedInfluencers.length} kişi</span>
                              {onViewOffers && !isLocked && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={() => {
                                    onViewOffers(campaign);
                                    onClose();
                                  }}
                                >
                                  <Megaphone size={14} className="mr-1.5" />
                                  Teklif Ver
                                </Button>
                              )}
                            </div>
                          </div>
                          {savedInfluencers.length === 0 ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400">Henüz kayıtlı influencer yok.</p>
                          ) : (
                            <div className="space-y-3">
                              {savedInfluencers.map((influencer) => (
                                <div
                                  key={influencer.id}
                                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50"
                                >
                                  <div className="flex items-center gap-3">
                                    {influencer.profilePhotoURL ? (
                                      <img
                                        src={influencer.profilePhotoURL}
                                        alt={influencer.name}
                                        className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold text-sm">
                                        {influencer.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="font-medium text-gray-900 dark:text-white">{influencer.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-full"
                                      onClick={() => openInfluencerProfile(influencer.id, influencer.name)}
                                    >
                                      <User size={14} className="mr-1.5" />
                                      Profil
                                    </Button>
                                    {onViewOffers && !isLocked && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => {
                                          onViewOffers(campaign, influencer.id);
                                          onClose();
                                        }}
                                    >
                                      <Megaphone size={14} className="mr-1.5" />
                                      Teklif Ver
                                    </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      </div>
                    )}

                    {activeTab === 'incoming' && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                            <button
                              type="button"
                              onClick={() => setIncomingTypeTab('campaign')}
                              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                incomingTypeTab === 'campaign'
                                  ? 'bg-[#08afd5] text-white'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                              }`}
                            >
                              <Inbox size={14} className="inline mr-1.5" />
                              Kampanyaya Katılım
                            </button>
                            <button
                              type="button"
                              onClick={() => setIncomingTypeTab('counter')}
                              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                incomingTypeTab === 'counter'
                                  ? 'bg-[#08afd5] text-white'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                              }`}
                            >
                              <MessageSquare size={14} className="inline mr-1.5" />
                              Karşı Teklifler
                            </button>
                          </div>

                          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1">
                            <button
                              type="button"
                              onClick={() => setIncomingViewMode('card')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                incomingViewMode === 'card'
                                  ? 'bg-[#08afd5] text-white'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              <LayoutGrid size={14} className="inline mr-1" />
                              Kart
                            </button>
                            <button
                              type="button"
                              onClick={() => setIncomingViewMode('list')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                incomingViewMode === 'list'
                                  ? 'bg-[#08afd5] text-white'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              <List size={14} className="inline mr-1" />
                              Liste
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Toplam</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activeIncomingSummary.total}</p>
                          </Card>
                          <Card className="p-4 border border-yellow-200/60 dark:border-yellow-800/40 bg-yellow-50/50 dark:bg-yellow-900/10">
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">Beklemede</p>
                            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">{activeIncomingSummary.pending}</p>
                          </Card>
                          <Card className="p-4 border border-green-200/60 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10">
                            <p className="text-xs text-green-700 dark:text-green-300">Kabul</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{activeIncomingSummary.accepted}</p>
                          </Card>
                          <Card className="p-4 border border-red-200/60 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10">
                            <p className="text-xs text-red-700 dark:text-red-300">Red</p>
                            <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{activeIncomingSummary.rejected}</p>
                          </Card>
                        </div>

                        {activeIncomingOffers.length === 0 ? (
                          <Card className="p-8 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900 text-center">
                            <Inbox size={28} className="mx-auto text-gray-400 mb-3" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {incomingTypeTab === 'campaign'
                                ? 'Henüz kampanyaya katılım teklifi yok.'
                                : 'Henüz karşı teklif yok.'}
                            </p>
                          </Card>
                        ) : incomingViewMode === 'card' ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {activeIncomingOffers.map((offer) => {
                              const canonical = withIncomingCanonical(offer);
                              const dealSealed = isParticipationThreadFullyAccepted(canonical, campaignOfferById);
                              const influencerName =
                                incomingOfferInfluencerNames[offer.influencerId] || 'Bilinmeyen Influencer';
                              const influencerPhoto = incomingOfferInfluencerPhotos[offer.influencerId];
                              const isProcessing = incomingProcessingOfferId === offer.id;
                              const isActionLocked = Boolean(incomingLockedOfferIds[offer.id]) || isLocked;
                              const canProcess =
                                canonical.status === 'beklemede' &&
                                !isActionLocked &&
                                !incomingProcessingOfferId &&
                                !dealSealed;
                              const negotiationHistory = incomingHistoryByOfferId[offer.id] || [];
                              const { displayPrice, displayMessage } = getLatestThreadDisplay(
                                canonical,
                                negotiationHistory
                              );
                              const awaitingInfluencerAfterBrand =
                                canonical.status === 'beklemede' &&
                                !dealSealed &&
                                negotiationHistory.length > 0 &&
                                negotiationHistory[negotiationHistory.length - 1].actor === 'brand';
                              const insufficientWalletForAccept =
                                canProcess &&
                                !awaitingInfluencerAfterBrand &&
                                isBalanceInsufficientForIncomingAccept(brandWalletBalance, displayPrice);
                              const formattedPrice = new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: 'TRY',
                                minimumFractionDigits: 0,
                              }).format(displayPrice);
                              const balanceFormatted = new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: 'TRY',
                                minimumFractionDigits: 0,
                              }).format(brandWalletBalance);

                              return (
                                <Card
                                  key={offer.id}
                                  className="p-4 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900 hover:shadow-md transition-all"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                      {influencerPhoto ? (
                                        <img
                                          src={influencerPhoto}
                                          alt={influencerName}
                                          className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                        />
                                      ) : (
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold">
                                          {influencerName.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 dark:text-white truncate">{influencerName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {new Date(offer.createdAt).toLocaleString('tr-TR')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        {offer.offerKind === 'counter_offer' ? 'Karşı Teklif' : 'Katılım Teklifi'}
                                      </Badge>
                                      {dealSealed ? (
                                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200">
                                          Anlaşma sağlandı
                                        </Badge>
                                      ) : (
                                        <Badge className={incomingListStatusBadgeClass(canonical)}>
                                          {incomingListStatusLabel(canonical)}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="p-3 rounded-xl border border-[#08afd5]/35 dark:border-[#08afd5]/40 bg-[#08afd5]/10 dark:bg-[#08afd5]/15 mb-3">
                                    <p className="text-xs text-[#08afd5] dark:text-[#6edff3]">Güncel pazarlık tutarı</p>
                                    <p className="text-2xl font-bold text-[#08afd5] dark:text-[#6edff3]">{formattedPrice}</p>
                                  </div>

                                  {displayMessage && (
                                    <div className="p-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/70 dark:bg-gray-800/40 mb-3">
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Not</p>
                                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                                        {displayMessage}
                                      </p>
                                    </div>
                                  )}

                                  {negotiationHistory.length > 0 && (
                                    <div className="p-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/40 mb-3">
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Pazarlık Geçmişi</p>
                                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 mac-scrollbar">
                                        {negotiationHistory.map((entry, idx) => (
                                          <div key={`${entry.createdAt}-${idx}`} className="text-xs text-gray-600 dark:text-gray-300">
                                            <span className="font-semibold">{entry.actor === 'brand' ? 'Marka' : 'Influencer'}:</span>{' '}
                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(entry.price)}
                                            {entry.message ? ` • ${entry.message}` : ''}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {dealSealed ? (
                                    <p className="text-sm text-emerald-800 dark:text-emerald-200/90 rounded-lg border border-emerald-200/60 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-2">
                                      Influencer katılım teklifinizi onayladı. Bu kartta marka tarafı için ek
                                      işlem gerekmez; içerik akışı “Kampanyadaki influencerlar” sekmesinden
                                      yürüyebilir.
                                    </p>
                                  ) : (
                                    <>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="rounded-lg"
                                          disabled={
                                            !canProcess ||
                                            isProcessing ||
                                            awaitingInfluencerAfterBrand ||
                                            insufficientWalletForAccept
                                          }
                                          onClick={() => handleUpdateIncomingOfferStatus(offer, 'kabul')}
                                        >
                                          <CheckCircle2 size={14} className="mr-1.5" />
                                          Kabul Et
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="rounded-lg"
                                          disabled={!canProcess || isProcessing || awaitingInfluencerAfterBrand}
                                          onClick={() => handleUpdateIncomingOfferStatus(offer, 'red')}
                                        >
                                          <XCircle size={14} className="mr-1.5" />
                                          Reddet
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="rounded-lg"
                                          disabled={
                                            !canProcess ||
                                            isProcessing ||
                                            incomingCounterSending ||
                                            awaitingInfluencerAfterBrand
                                          }
                                          onClick={() =>
                                            canProcess &&
                                            !awaitingInfluencerAfterBrand &&
                                            openIncomingCounterModal(offer)
                                          }
                                        >
                                          <MessageSquare size={14} className="mr-1" />
                                          Karşı Teklif
                                        </Button>
                                      </div>
                                      {insufficientWalletForAccept && (
                                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                                          Cüzdan bakiyeniz bu teklifi kabul etmek için yetersiz (mevcut: {balanceFormatted}).
                                          Cüzdanınıza bütçe yükledikten sonra tekrar deneyin.
                                        </p>
                                      )}
                                    </>
                                  )}
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {activeIncomingOffers.map((offer) => {
                              const canonical = withIncomingCanonical(offer);
                              const dealSealed = isParticipationThreadFullyAccepted(canonical, campaignOfferById);
                              const influencerName =
                                incomingOfferInfluencerNames[offer.influencerId] || 'Bilinmeyen Influencer';
                              const influencerPhoto = incomingOfferInfluencerPhotos[offer.influencerId];
                              const isProcessing = incomingProcessingOfferId === offer.id;
                              const isActionLocked = Boolean(incomingLockedOfferIds[offer.id]) || isLocked;
                              const canProcess =
                                canonical.status === 'beklemede' &&
                                !isActionLocked &&
                                !incomingProcessingOfferId &&
                                !dealSealed;
                              const negotiationHistory = incomingHistoryByOfferId[offer.id] || [];
                              const { displayPrice, displayMessage } = getLatestThreadDisplay(
                                canonical,
                                negotiationHistory
                              );
                              const awaitingInfluencerAfterBrand =
                                canonical.status === 'beklemede' &&
                                !dealSealed &&
                                negotiationHistory.length > 0 &&
                                negotiationHistory[negotiationHistory.length - 1].actor === 'brand';
                              const insufficientWalletForAccept =
                                canProcess &&
                                !awaitingInfluencerAfterBrand &&
                                isBalanceInsufficientForIncomingAccept(brandWalletBalance, displayPrice);
                              const formattedPrice = new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: 'TRY',
                                minimumFractionDigits: 0,
                              }).format(displayPrice);
                              const balanceFormatted = new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: 'TRY',
                                minimumFractionDigits: 0,
                              }).format(brandWalletBalance);

                              return (
                                <Card
                                  key={offer.id}
                                  className="px-4 py-3 border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_auto] gap-3 items-center">
                                    <div className="flex items-center gap-3 min-w-0">
                                      {influencerPhoto ? (
                                        <img
                                          src={influencerPhoto}
                                          alt={influencerName}
                                          className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold">
                                          {influencerName.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 dark:text-white truncate">{influencerName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(offer.createdAt).toLocaleString('tr-TR')}</p>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        {offer.offerKind === 'counter_offer' ? 'Karşı Teklif' : 'Katılım Teklifi'}
                                      </Badge>
                                      {dealSealed ? (
                                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200">
                                          Anlaşma sağlandı
                                        </Badge>
                                      ) : (
                                        <Badge className={incomingListStatusBadgeClass(canonical)}>
                                          {incomingListStatusLabel(canonical)}
                                        </Badge>
                                      )}
                                      <span className="text-sm font-semibold text-[#08afd5] dark:text-[#6edff3]">{formattedPrice}</span>
                                    </div>

                                    {dealSealed ? (
                                      <p className="text-xs text-emerald-700 dark:text-emerald-300 md:col-span-2 md:text-right">
                                        Influencer onayı tamam.
                                      </p>
                                    ) : (
                                      <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={
                                            !canProcess ||
                                            isProcessing ||
                                            awaitingInfluencerAfterBrand ||
                                            insufficientWalletForAccept
                                          }
                                          onClick={() => handleUpdateIncomingOfferStatus(offer, 'kabul')}
                                        >
                                          <CheckCircle2 size={14} className="mr-1.5" />
                                          Kabul
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={!canProcess || isProcessing || awaitingInfluencerAfterBrand}
                                          onClick={() => handleUpdateIncomingOfferStatus(offer, 'red')}
                                        >
                                          <XCircle size={14} className="mr-1.5" />
                                          Red
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={
                                            !canProcess ||
                                            isProcessing ||
                                            incomingCounterSending ||
                                            awaitingInfluencerAfterBrand
                                          }
                                          onClick={() =>
                                            canProcess &&
                                            !awaitingInfluencerAfterBrand &&
                                            openIncomingCounterModal(offer)
                                          }
                                        >
                                          <MessageSquare size={14} className="mr-1.5" />
                                          Karşı Teklif
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  {!dealSealed && insufficientWalletForAccept && (
                                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                                      Cüzdan bakiyeniz yetersiz (mevcut: {balanceFormatted}). Bütçe yükleyin.
                                    </p>
                                  )}
                                  {negotiationHistory.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                      <span className="text-gray-500 dark:text-gray-400">Pazarlık Geçmişi:</span>{' '}
                                      {negotiationHistory.map((entry, idx) => (
                                        <span key={`${entry.createdAt}-${idx}`}>
                                          {idx > 0 ? ' • ' : ''}
                                          {entry.actor === 'brand' ? 'M' : 'I'} {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(entry.price)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {displayMessage && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                      Not: {displayMessage}
                                    </p>
                                  )}
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-start gap-3 p-6 border-t border-gray-200/50 dark:border-gray-800/50">
                <div className="flex items-center gap-2">
                  {campaign && onViewOffers && !isLocked && !isDraft && (
                    <Button
                      onClick={() => {
                        onViewOffers(campaign);
                        onClose();
                      }}
                      variant="outline"
                      className="rounded-full"
                    >
                      <Users size={16} className="mr-2" />
                      Teklifler
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
              <DialogContent className="max-w-2xl max-h-[86vh] overflow-hidden border border-gray-200/70 dark:border-gray-800/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle>Influencer Profili</DialogTitle>
                  <DialogDescription>{selectedProfileName}</DialogDescription>
                </DialogHeader>
                <div className="max-h-[68vh] overflow-y-auto pr-1 space-y-4 mac-scrollbar">
                  {profileLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-7 h-7 border-2 border-[#08afd5]/30 border-t-[#08afd5] rounded-full animate-spin" />
                    </div>
                  ) : !selectedProfile ? (
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400 py-10">
                      Profil bilgileri yüklenemedi.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl p-4 border border-[#08afd5]/35 dark:border-[#08afd5]/40 bg-gradient-to-br from-[#08afd5]/10 via-white to-[#e3447c]/10 dark:from-[#08afd5]/15 dark:via-gray-900 dark:to-[#e3447c]/15">
                        <div className="flex items-start gap-4">
                          {selectedProfile.profilePhotoURL ? (
                            <img
                              src={selectedProfile.profilePhotoURL}
                              alt={selectedProfile.fullName}
                              className="w-20 h-20 rounded-2xl object-cover border border-[#08afd5]/30 dark:border-[#08afd5]/35"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-white flex items-center justify-center font-bold text-2xl">
                              {selectedProfile.fullName?.charAt(0).toUpperCase() || 'I'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{selectedProfile.fullName}</p>
                            <div className="mt-1 inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                              <Mail size={14} />
                              <span className="truncate">{selectedProfile.email}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge className="bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3]">
                                <BadgeCheck size={12} className="mr-1" />
                                {selectedProfile.status || 'doğrulanmadı'}
                              </Badge>
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {selectedProfile.followerRange || 'Takipçi bilgisi yok'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedProfile.bio && (
                        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white dark:bg-gray-900">
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Biyografi</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedProfile.bio}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-3 bg-white dark:bg-gray-900">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Ortalama Ücret</p>
                          <p className="text-lg font-semibold text-[#08afd5] dark:text-[#6edff3]">{formatPrice(selectedProfile.averageAdPrice)}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-3 bg-white dark:bg-gray-900">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Post</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatPrice(selectedProfile.contentPricing?.post)}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-3 bg-white dark:bg-gray-900">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Story</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatPrice(selectedProfile.contentPricing?.story)}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-3 bg-white dark:bg-gray-900">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Reels</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatPrice(selectedProfile.contentPricing?.reels)}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-3 bg-white dark:bg-gray-900">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Video</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatPrice(selectedProfile.contentPricing?.video)}</p>
                        </div>
                      </div>

                      {selectedProfile.categories?.length ? (
                        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white dark:bg-gray-900">
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Kategoriler</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedProfile.categories.map((cat) => (
                              <span
                                key={cat}
                                className="px-2.5 py-1 rounded-full text-xs bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3]"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white dark:bg-gray-900">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Sosyal Platformlar</p>
                        {normalizePlatforms(selectedProfile).length === 0 ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400">Platform bilgisi yok.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {normalizePlatforms(selectedProfile).map((platform) => (
                              <div
                                key={`${platform.id}-${platform.username}`}
                                className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 p-3 bg-gray-50/60 dark:bg-gray-800/40"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {platform.id === 'instagram' ? (
                                      <Instagram size={15} className="text-pink-500" />
                                    ) : platform.id === 'youtube' ? (
                                      <Youtube size={15} className="text-red-500" />
                                    ) : (
                                      <ExternalLink size={15} className="text-gray-500" />
                                    )}
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize truncate">{platform.id}</p>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {platform.followers ? `${platform.followers.toLocaleString('tr-TR')}` : '-'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">@{platform.username || '-'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-full" onClick={() => setProfileOpen(false)}>
                    Kapat
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={incomingCounterModalOpen} onOpenChange={setIncomingCounterModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Karşı Teklif Gönder</DialogTitle>
                  <DialogDescription>
                    {incomingCounterTarget
                      ? `${incomingOfferInfluencerNames[incomingCounterTarget.influencerId] || 'Influencer'} için yeni teklif gönderin.`
                      : 'Yeni teklif detayını girin.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mevcut cüzdan:{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                        minimumFractionDigits: 0,
                      }).format(brandWalletBalance)}
                    </span>
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teklif Tutarı (₺)</label>
                    <input
                      type="number"
                      min="1"
                      max={brandWalletBalance > 0 ? brandWalletBalance : undefined}
                      value={incomingCounterPrice}
                      onChange={(e) => setIncomingCounterPrice(e.target.value)}
                      placeholder="Örn: 25000"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                    />
                  </div>
                  {incomingCounterExceedsWallet && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Karşı teklif tutarı bakiyenizi aşamaz. Tutarı düşürün veya cüzdan yükleyin.
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mesaj (Opsiyonel)</label>
                    <Textarea
                      value={incomingCounterMessage}
                      onChange={(e) => setIncomingCounterMessage(e.target.value)}
                      placeholder="Karşı teklif notu..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setIncomingCounterModalOpen(false)}
                    disabled={incomingCounterSending}
                  >
                    İptal
                  </Button>
                  <Button
                    className="brand-btn-primary text-white rounded-full"
                    onClick={handleSendIncomingCounterOffer}
                    disabled={incomingCounterSending || incomingCounterExceedsWallet}
                  >
                    {incomingCounterSending ? 'Gönderiliyor...' : 'Karşı Teklif Gönder'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={revisionModalOpen} onOpenChange={setRevisionModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Revizyon Talebi</DialogTitle>
                  <DialogDescription>
                    {revisionTarget
                      ? `${revisionTarget.influencerName} için revizyon notu yazın.`
                      : 'Revizyon notu yazın.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Revizyon Notu
                  </label>
                  <Textarea
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    placeholder="Düzenlenmesini istediğiniz noktalar..."
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-full" onClick={() => setRevisionModalOpen(false)} disabled={revisionSending}>
                    İptal
                  </Button>
                  <Button
                    className="brand-btn-primary text-white rounded-full"
                    onClick={handleSendRevision}
                    disabled={revisionSending || !revisionNote.trim()}
                  >
                    {revisionSending ? 'Gönderiliyor...' : 'Gönder'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      <ContentViewerModal
        isOpen={contentViewerOpen}
        onClose={() => {
          setContentViewerOpen(false);
          setSelectedContentUrl('');
          setSelectedContentOfferId(undefined);
	          setSelectedContentInfluencerId(undefined);
	          setSelectedContentApproved(false);
	          setSelectedContentApprovalMode('final');
          setSelectedContentPreviewUnlocked(false);
          setSelectedContentCanApprove(true);
	          setContentViewerMediaItems([]);
        }}
        contentUrl={selectedContentUrl}
        mediaItems={contentViewerMediaItems.length > 0 ? contentViewerMediaItems : undefined}
        offerId={selectedContentOfferId}
        influencerId={selectedContentInfluencerId}
        brandId={brandId}
        isBrandPanel={true}
	        contentApproved={selectedContentApproved}
        previewUnlocked={selectedContentPreviewUnlocked}
        canApproveContent={selectedContentCanApprove}
	        approvalMode={selectedContentApprovalMode}
        onContentApproved={() => {
          // İçerik onaylandığında influencer listesini yenile
          loadCampaignData();
        }}
        canOperate={canOperate}
      />
    </>
  );
}
