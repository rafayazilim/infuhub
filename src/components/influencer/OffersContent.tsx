import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Filter,
    Clock,
    CheckCircle,
    XCircle,
    Banknote,
    Calendar,
    Eye,
    ThumbsUp,
    ThumbsDown,
    Upload,
    Link2,
    Copy,
    Check,
    X,
    Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    getCampaignModelDescription,
    getCampaignModelLabel,
    shouldHideTrackableCampaignLinkSection,
} from '@/lib/campaignModelLabels';
import { formatContentLinesSummary, hasContentLines } from '@/lib/campaignContentLines';
import {
    getOffersByInfluencer,
    updateOfferStatus,
    updateOfferContentLink,
    createCounterOffer,
    influencerRespondToIncomingCampaignParticipationOffer,
    collapseIncomingParticipationThreadsForDisplay,
    isGenuineInfluencerCampaignAcceptance,
    influencerOfferActionsLockedAwaitingBrand,
    FirebaseOffer,
} from '@/services/firebaseOfferService';
import { FirebaseCampaign, getCampaignById, updateCampaignStatus } from '@/services/firebaseCampaignService';
import { getUserData } from '@/services/firebaseAuthService';
import { getTrackingLinkByOfferId, TrackingLink } from '@/services/trackingLinkService';
import { useToast } from '@/hooks/use-toast';

interface OffersContentProps {
    influencerId: string;
    onOfferAccepted?: () => void;
    /** İçerik Teslimleri sekmesine geçip bu teklif için yükleme panelini açar */
    onOpenDeliveriesForOffer?: (offerId: string) => void;
    canOperate?: boolean;
}

interface EnrichedOffer extends FirebaseOffer {
    brandName?: string;
    campaignTitle?: string;
    brandLogoURL?: string;
    isFixedOffer?: boolean;
}

type StatusFilter = 'all' | 'beklemede' | 'kabul' | 'red';
type SortOption = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc';

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
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        borderColor: 'border-green-200 dark:border-green-800/50',
    },
    red: {
        label: 'Reddedildi',
        icon: <XCircle size={14} />,
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-800/50',
    },
};

export const OffersContent: React.FC<OffersContentProps> = ({
    influencerId,
    onOfferAccepted,
    onOpenDeliveriesForOffer,
    canOperate = true,
}) => {
    const { toast } = useToast();
    const [offers, setOffers] = useState<EnrichedOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedOffer, setSelectedOffer] = useState<EnrichedOffer | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [contentModalOpen, setContentModalOpen] = useState(false);
    const [contentLink, setContentLink] = useState('');
    const [contentSaving, setContentSaving] = useState(false);
    const [trackingLink, setTrackingLink] = useState<TrackingLink | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [loadingTrackingLink, setLoadingTrackingLink] = useState(false);
    const [lastRevisionCounts, setLastRevisionCounts] = useState<Record<string, number>>({});
    const [revisionInit, setRevisionInit] = useState(false);
    const [detailTab, setDetailTab] = useState<'project' | 'revisions' | 'content'>('project');
    const [selectedCampaign, setSelectedCampaign] = useState<FirebaseCampaign | null>(null);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [sortBy, setSortBy] = useState<SortOption>('date_desc');
    const [counterModalOpen, setCounterModalOpen] = useState(false);
    const [counterTargetOffer, setCounterTargetOffer] = useState<EnrichedOffer | null>(null);
    const [counterPrice, setCounterPrice] = useState('');
    const [counterMessage, setCounterMessage] = useState('');
    const [counterSending, setCounterSending] = useState(false);
    /** Aynı pazarlık kilidi (katılım + marka teklifi) — sunucudan son teklif listesi */
    const [allOffersForLock, setAllOffersForLock] = useState<FirebaseOffer[]>([]);

    useEffect(() => {
        if (influencerId) {
            loadOffers();
        }
    }, [influencerId]);

    useEffect(() => {
        if (!detailModalOpen || !selectedOffer || selectedOffer.status !== 'kabul') {
            setTrackingLink(null);
            setLoadingTrackingLink(false);
            return;
        }
        if (!selectedCampaign || shouldHideTrackableCampaignLinkSection(selectedCampaign.campaignModel)) {
            setTrackingLink(null);
            setLoadingTrackingLink(false);
            return;
        }
        setLoadingTrackingLink(true);
        getTrackingLinkByOfferId(selectedOffer.id)
            .then((link) => {
                setTrackingLink(link);
            })
            .catch(() => {
                setTrackingLink(null);
            })
            .finally(() => {
                setLoadingTrackingLink(false);
            });
    }, [detailModalOpen, selectedOffer, selectedCampaign]);

    useEffect(() => {
        if (detailModalOpen && selectedOffer) {
            setContentLink(selectedOffer.contentLink || '');
            setDetailTab('project');
        }
    }, [detailModalOpen, selectedOffer]);

    useEffect(() => {
        const loadCampaignDetail = async () => {
            if (!detailModalOpen || !selectedOffer) {
                setSelectedCampaign(null);
                return;
            }
            setSelectedCampaign(null);
            try {
                const campaign = await getCampaignById(selectedOffer.brandId, selectedOffer.campaignId);
                setSelectedCampaign(campaign || null);
            } catch {
                setSelectedCampaign(null);
            }
        };
        loadCampaignDetail();
    }, [detailModalOpen, selectedOffer]);

    const loadOffers = async () => {
        try {
            setLoading(true);
            const rawOffers = await getOffersByInfluencer(influencerId);
            setAllOffersForLock(rawOffers);

            const offersData = collapseIncomingParticipationThreadsForDisplay(rawOffers);

            const listOffers = offersData.filter((offer) => {
                if (offer.offerKind === 'counter_offer') return false;
                if (offer.offerKind === 'incoming_campaign') {
                    return offer.sourceType === 'influencer' && offer.destinationType === 'brand';
                }
                return offer.sourceType === 'brand' && offer.destinationType === 'influencer';
            });

            const enrichedOffers = await Promise.all(
                listOffers.map(async (offer) => {
                    try {
                        const [brandData, campaignData] = await Promise.all([
                            getUserData(offer.brandId, 'brand'),
                            getCampaignById(offer.brandId, offer.campaignId),
                        ]);
                        return {
                            ...offer,
                            brandName: (brandData as any)?.brandName || 'Bilinmeyen Marka',
                            brandLogoURL: (brandData as any)?.profilePhotoURL || '',
                            isFixedOffer: Boolean(campaignData?.isFixedOffer),
                            campaignTitle:
                                (campaignData as any)?.title ||
                                (campaignData as any)?.productInfo ||
                                'Kampanya',
                        };
                    } catch {
                        return {
                            ...offer,
                            brandName: 'Bilinmeyen Marka',
                            brandLogoURL: '',
                            isFixedOffer: false,
                            campaignTitle: 'Kampanya',
                        };
                    }
                })
            );

            enrichedOffers.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setOffers(enrichedOffers);

            const newCounts: Record<string, number> = {};
            enrichedOffers.forEach((offer) => {
                const count = offer.revisions ? Object.keys(offer.revisions).length : 0;
                newCounts[offer.id] = count;
                const prev = lastRevisionCounts[offer.id] || 0;
                if (revisionInit && count > prev) {
                    toast({
                        title: 'Yeni revizyon talebi',
                        description: `${offer.brandName || 'Marka'} revizyon talebi gönderdi.`,
                    });
                }
            });
            setLastRevisionCounts(newCounts);
            if (!revisionInit) setRevisionInit(true);
        } catch (error) {
            console.error('Teklifler yüklenemedi:', error);
            toast({
                title: 'Hata',
                description: 'Teklifler yüklenirken bir hata oluştu.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredOffers = offers.filter((offer) => {
        if (statusFilter === 'all') return true;
        return offer.status === statusFilter;
    });

    const displayedOffers = useMemo(() => {
        const items = [...filteredOffers];
        const getDateValue = (value?: string) => {
            if (!value) return 0;
            const parsed = new Date(value).getTime();
            return Number.isNaN(parsed) ? 0 : parsed;
        };
        const getPriceValue = (value?: number) => {
            if (typeof value === 'number') return value;
            const parsed = Number(value ?? 0);
            return Number.isNaN(parsed) ? 0 : parsed;
        };

        items.sort((a, b) => {
            if (sortBy === 'price_desc') return getPriceValue(b.price) - getPriceValue(a.price);
            if (sortBy === 'price_asc') return getPriceValue(a.price) - getPriceValue(b.price);
            if (sortBy === 'date_asc') return getDateValue(a.createdAt) - getDateValue(b.createdAt);
            return getDateValue(b.createdAt) - getDateValue(a.createdAt);
        });

        return items;
    }, [filteredOffers, sortBy]);

    const handleAcceptOffer = async (offer: EnrichedOffer) => {
        if (!canOperate) {
            toast({
                title: 'İşlem Kısıtlı',
                description: 'Profilin doğrulanmadan teklif işlemi yapamazsın.',
                variant: 'destructive',
            });
            return;
        }
        if (influencerOfferActionsLockedAwaitingBrand(offer, allOffersForLock)) {
            toast({
                title: 'Marka yanıtı bekleniyor',
                description: 'Marka dönüşü olmadan bu teklifte işlem yapılamaz.',
            });
            return;
        }
        try {
            setActionLoading(true);
            if (offer.offerKind === 'incoming_campaign') {
                await influencerRespondToIncomingCampaignParticipationOffer(offer.id, 'kabul');
            } else {
                await updateOfferStatus(offer.id, 'kabul');
            }

            try {
                const link = await getTrackingLinkByOfferId(offer.id);
                setTrackingLink(link);
            } catch {
                // ignore
            }

            toast({
                title: 'Teklif Kabul Edildi!',
                description: 'Teklifi kabul ettiniz. Kampanya hazırlanıyor.',
            });

            await loadOffers();
            if (selectedOffer?.id === offer.id) {
                setSelectedOffer({ ...offer, status: 'kabul' });
            } else {
                setDetailModalOpen(false);
            }
            onOfferAccepted?.();
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'Teklif kabul edilirken bir hata oluştu.',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectOffer = async (offer: EnrichedOffer) => {
        if (!canOperate) {
            toast({
                title: 'İşlem Kısıtlı',
                description: 'Profilin doğrulanmadan teklif işlemi yapamazsın.',
                variant: 'destructive',
            });
            return;
        }
        if (influencerOfferActionsLockedAwaitingBrand(offer, allOffersForLock)) {
            toast({
                title: 'Marka yanıtı bekleniyor',
                description: 'Marka dönüşü olmadan bu teklifte işlem yapılamaz.',
            });
            return;
        }
        try {
            setActionLoading(true);
            if (offer.offerKind === 'incoming_campaign') {
                await influencerRespondToIncomingCampaignParticipationOffer(offer.id, 'red');
            } else {
                await updateOfferStatus(offer.id, 'red');
            }
            toast({
                title: 'Teklif Reddedildi',
                description: 'Teklifi reddettiniz.',
            });
            await loadOffers();
            setDetailModalOpen(false);
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'Teklif reddedilirken bir hata oluştu.',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const openCounterModal = async (offer: EnrichedOffer) => {
        if (influencerOfferActionsLockedAwaitingBrand(offer, allOffersForLock)) {
            toast({
                title: 'Marka yanıtı bekleniyor',
                description: 'Marka dönüşü olmadan yeni karşı teklif gönderemezsin.',
            });
            return;
        }
        try {
            const campaign = await getCampaignById(offer.brandId, offer.campaignId);
            if (campaign?.isFixedOffer) {
                toast({
                    title: 'Sabit Teklif Aktif',
                    description: 'Bu kampanyada karşı teklif veremezsin.',
                    variant: 'destructive',
                });
                return;
            }
        } catch {
            // Kampanya bilgisi alınamasa da mevcut davranışla devam et.
        }

        setCounterTargetOffer(offer);
        setCounterPrice(offer.price ? String(offer.price) : '');
        setCounterMessage('');
        setCounterModalOpen(true);
    };

    const handleSendCounterOffer = async () => {
        if (!canOperate) {
            toast({
                title: 'İşlem Kısıtlı',
                description: 'Profilin doğrulanmadan karşı teklif veremezsin.',
                variant: 'destructive',
            });
            return;
        }
        if (!counterTargetOffer) return;
        if (influencerOfferActionsLockedAwaitingBrand(counterTargetOffer, allOffersForLock)) {
            toast({
                title: 'Marka yanıtı bekleniyor',
                description: 'Marka dönüşü olmadan yeni karşı teklif gönderemezsin.',
            });
            return;
        }
        const parsed = Number(counterPrice);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            toast({
                title: 'Hata',
                description: 'Geçerli bir teklif tutarı girin.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setCounterSending(true);
            await createCounterOffer({
                campaignId: counterTargetOffer.campaignId,
                brandId: counterTargetOffer.brandId,
                influencerId,
                parentOfferId: counterTargetOffer.id,
                price: parsed,
                message: counterMessage.trim() || undefined,
            });

            toast({
                title: 'Karşı teklif gönderildi',
                description: 'Teklifiniz markanın gelen teklifler paneline iletildi.',
            });
            setCounterModalOpen(false);
            setDetailModalOpen(false);
            setCounterTargetOffer(null);
            setCounterPrice('');
            setCounterMessage('');
            await loadOffers();
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'Karşı teklif gönderilemedi.',
                variant: 'destructive',
            });
        } finally {
            setCounterSending(false);
        }
    };

    const handleSaveContentLink = async () => {
        if (!canOperate) {
            toast({
                title: 'İşlem Kısıtlı',
                description: 'Profilin doğrulanmadan içerik yükleyemezsin.',
                variant: 'destructive',
            });
            return;
        }
        if (!selectedOffer) return;
        if (selectedOffer.contentApproved) {
            toast({
                title: 'İçerik onaylandı',
                description: 'Marka onayından sonra içerik güncellemesi yapılamaz.',
                variant: 'destructive',
            });
            return;
        }
        const trimmed = contentLink.trim();
        if (!trimmed) {
            toast({
                title: 'Hata',
                description: 'Lütfen içerik linkini girin.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setContentSaving(true);
            await updateOfferContentLink(selectedOffer.id, trimmed);
            toast({
                title: 'İçerik linki kaydedildi',
                description: 'Link başarıyla kaydedildi.',
            });
            setContentModalOpen(false);
            await loadOffers();
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'İçerik linki kaydedilirken hata oluştu.',
                variant: 'destructive',
            });
        } finally {
            setContentSaving(false);
        }
    };

    /** Tekliflerden içerik yükleme: Teslimler sekmesine yönlendir veya (callback yoksa) link modalı */
    const openContentUploadFlow = (offer: EnrichedOffer) => {
        if (!canOperate) {
            toast({
                title: 'İşlem Kısıtlı',
                description: 'Profilin doğrulanmadan içerik yükleyemezsin.',
                variant: 'destructive',
            });
            return;
        }
        if (offer.contentApproved) {
            toast({
                title: 'İçerik onaylandı',
                description: 'Marka içeriği onayladığı için yükleme veya bağlantı değişikliği yapılamaz.',
                variant: 'destructive',
            });
            return;
        }
        if (onOpenDeliveriesForOffer) {
            setDetailModalOpen(false);
            onOpenDeliveriesForOffer(offer.id);
            return;
        }
        setSelectedOffer(offer);
        setContentLink(offer.contentLink || '');
        setContentModalOpen(true);
    };

    const getRevisionList = (offer: EnrichedOffer) => {
        if (!offer.revisions) return [];
        const values = Object.values(offer.revisions);
        return values.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).reverse();
    };

    const getNegotiationHistory = (offer: EnrichedOffer) => {
        if (!offer.negotiationHistory) return [] as Array<{
            actor: 'brand' | 'influencer';
            price: number;
            message?: string;
            createdAt: string;
            type: 'initial' | 'counter' | 'revision';
        }>;
        const values = Object.values(offer.negotiationHistory);
        return values
            .filter((item) => item && item.createdAt)
            .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const isOfferAwaitingBrand = useCallback(
        (offer: EnrichedOffer | null | undefined) => {
            if (!offer || offer.status !== 'beklemede') return false;
            return influencerOfferActionsLockedAwaitingBrand(offer, allOffersForLock);
        },
        [allOffersForLock]
    );

    /** Beklemedeki markaya giden tekliflerde (doğrudan veya katılım) sabit fiyat değilse karşı teklif */
    const canInfluencerCounterToBrandOffer = (offer: EnrichedOffer) => !offer.isFixedOffer;

    const stats = {
        total: offers.length,
        pending: offers.filter((o) => o.status === 'beklemede').length,
        accepted: offers.filter((o) => isGenuineInfluencerCampaignAcceptance(o)).length,
        rejected: offers.filter((o) => o.status === 'red').length,
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#08afd5]/10 dark:bg-[#08afd5]/20 flex items-center justify-center">
                        <FileText size={24} className="text-[#08afd5] dark:text-[#6edff3]" />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Teklifler</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            Marka teklifleri ve kampanya katılımına verilen yanıtları yönetin
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[#08afd5]/10 dark:bg-[#08afd5]/20">
                            <FileText size={18} className="text-[#08afd5] dark:text-[#6edff3]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Toplam Teklif</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-2xl border border-yellow-200/60 dark:border-yellow-800/40 bg-yellow-50/80 dark:bg-yellow-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                            <Clock size={18} className="text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.pending}</p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-500">Beklemede</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-2xl border border-green-200/60 dark:border-green-800/40 bg-green-50/80 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.accepted}</p>
                            <p className="text-xs text-green-600 dark:text-green-500">Kabul Edildi</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-100/80 dark:bg-red-900/30">
                            <XCircle size={18} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejected}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Reddedildi</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6 p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrele:</span>
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                        <SelectTrigger className="w-40 rounded-[10px] h-9">
                            <SelectValue placeholder="Durum" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tümü</SelectItem>
                            <SelectItem value="beklemede">Beklemede</SelectItem>
                            <SelectItem value="kabul">Kabul Edildi</SelectItem>
                            <SelectItem value="red">Reddedildi</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                        <SelectTrigger className="w-52 rounded-[10px] h-9">
                            <SelectValue placeholder="Sıralama" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date_desc">Tarih (Yeni → Eski)</SelectItem>
                            <SelectItem value="date_asc">Tarih (Eski → Yeni)</SelectItem>
                            <SelectItem value="price_desc">Fiyat (Yüksek → Düşük)</SelectItem>
                            <SelectItem value="price_asc">Fiyat (Düşük → Yüksek)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Görünüm:</span>
                    <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white/85 dark:bg-gray-900/80 p-1">
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
            ) : displayedOffers.length === 0 ? (
                <div className="p-12 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 text-center">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#08afd5]/15 dark:bg-[#08afd5]/25 flex items-center justify-center">
                            <FileText size={32} className="text-[#08afd5] dark:text-[#6edff3]" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {statusFilter === 'all' ? 'Henüz Teklif Yok' : 'Teklif Bulunamadı'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {statusFilter === 'all'
                                ? 'Marka teklifleri ve katılım teklifleriniz burada listelenir.'
                                : 'Seçili filtreye uygun teklif bulunamadı.'}
                        </p>
                    </div>
                </div>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedOffers.map((offer) => {
                        const status = statusConfig[offer.status];
                        return (
                            <motion.div
                                key={offer.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.15 }}
                                className="h-full"
                            >
                                <Card
                                    className={`p-5 border rounded-2xl bg-white dark:bg-gray-900/80 border-gray-200/70 dark:border-gray-700/70 hover:border-[#08afd5]/40 dark:hover:border-[#08afd5]/50 hover:shadow-lg transition-all cursor-pointer ${status.borderColor} h-full`}
                                    onClick={() => {
                                        setSelectedOffer(offer);
                                        setDetailModalOpen(true);
                                    }}
                                >
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 overflow-hidden flex items-center justify-center">
                                                {offer.brandLogoURL ? (
                                                    <img
                                                        src={offer.brandLogoURL}
                                                        alt={offer.brandName || 'Marka'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold text-lg">
                                                        {offer.brandName?.charAt(0).toUpperCase() || 'M'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {offer.brandName}
                                                    </h4>
                                                    {offer.offerKind === 'incoming_campaign' && (
                                                        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 text-[10px]">
                                                            Katılım
                                                        </Badge>
                                                    )}
                                                    <Badge className={`${status.color} flex items-center gap-1`}>
                                                        {status.icon}
                                                        {status.label}
                                                    </Badge>
                                                </div>
                                                {offer.campaignTitle && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                                                        {offer.campaignTitle}
                                                    </p>
                                                )}
                                                {offer.message && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                                        "{offer.message}"
                                                    </p>
                                                )}
                                                <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400">
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
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-800/60">
                                            {offer.status === 'beklemede' && !isOfferAwaitingBrand(offer) ? (
                                                <div
                                                    className={`grid gap-2 ${
                                                        offer.isFixedOffer
                                                            ? 'grid-cols-1 sm:grid-cols-3'
                                                            : 'grid-cols-2 sm:grid-cols-4'
                                                    }`}
                                                >
                                                    {canInfluencerCounterToBrandOffer(offer) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-lg w-full text-xs px-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openCounterModal(offer);
                                                            }}
                                                        >
                                                            <Banknote size={12} className="mr-1" />
                                                            Karşı Teklif
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 rounded-lg w-full text-xs px-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRejectOffer(offer);
                                                        }}
                                                    >
                                                        <ThumbsDown size={12} className="mr-1" />
                                                        Reddet
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 rounded-lg w-full text-xs px-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcceptOffer(offer);
                                                        }}
                                                    >
                                                        <ThumbsUp size={12} className="mr-1" />
                                                        Kabul Et
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 rounded-lg w-full text-xs px-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOffer(offer);
                                                            setDetailModalOpen(true);
                                                        }}
                                                    >
                                                        <Eye size={12} className="mr-1" />
                                                        Detay
                                                    </Button>
                                                </div>
                                            ) : offer.status === 'beklemede' && isOfferAwaitingBrand(offer) ? (
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                        Marka yanıtı bekleniyor
                                                    </Badge>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 rounded-lg ml-auto text-xs px-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOffer(offer);
                                                            setDetailModalOpen(true);
                                                        }}
                                                    >
                                                        <Eye size={12} className="mr-1" />
                                                        Detay
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {offer.status === 'kabul' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-lg text-xs px-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openContentUploadFlow(offer);
                                                            }}
                                                        >
                                                            <Upload size={12} className="mr-1" />
                                                            İçerik Yükle
                                                        </Button>
                                                    )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 rounded-lg ml-auto text-xs px-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOffer(offer);
                                                            setDetailModalOpen(true);
                                                        }}
                                                    >
                                                        <Eye size={12} className="mr-1" />
                                                        Detay
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
                    {displayedOffers.map((offer) => {
                        const status = statusConfig[offer.status];
                        return (
                            <motion.div
                                key={offer.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.12 }}
                            >
                                <Card
                                    className={`px-4 py-3 border rounded-2xl bg-white/90 dark:bg-gray-900/85 hover:shadow-sm transition-all cursor-pointer ${status.borderColor}`}
                                    onClick={() => {
                                        setSelectedOffer(offer);
                                        setDetailModalOpen(true);
                                    }}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2.1fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-3 items-center">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 overflow-hidden flex items-center justify-center">
                                                {offer.brandLogoURL ? (
                                                    <img
                                                        src={offer.brandLogoURL}
                                                        alt={offer.brandName || 'Marka'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold">
                                                        {offer.brandName?.charAt(0).toUpperCase() || 'M'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {offer.brandName}
                                                    </p>
                                                    {offer.offerKind === 'incoming_campaign' && (
                                                        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 text-[10px]">
                                                            Katılım
                                                        </Badge>
                                                    )}
                                                    <Badge className={`${status.color} flex items-center gap-1`}>
                                                        {status.icon}
                                                        {status.label}
                                                    </Badge>
                                                </div>
                                                {offer.campaignTitle && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {offer.campaignTitle}
                                                    </p>
                                                )}
                                                {offer.message && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                        "{offer.message}"
                                                    </p>
                                                )}
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
                                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                            {offer.status === 'beklemede' && !isOfferAwaitingBrand(offer) && (
                                                <>
                                                    {canInfluencerCounterToBrandOffer(offer) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-lg text-xs px-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openCounterModal(offer);
                                                            }}
                                                        >
                                                            <Banknote size={12} className="mr-1" />
                                                            Karşı Teklif
                                                        </Button>
                                                    )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 rounded-lg text-xs px-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRejectOffer(offer);
                                                        }}
                                                    >
                                                        <ThumbsDown size={12} className="mr-1" />
                                                        Reddet
                                                    </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 rounded-lg text-xs px-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAcceptOffer(offer);
                                                        }}
                                                    >
                                                        <ThumbsUp size={12} className="mr-1" />
                                                        Kabul Et
                                                    </Button>
                                                </>
                                            )}
                                            {offer.status === 'beklemede' && isOfferAwaitingBrand(offer) && (
                                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                    Marka yanıtı bekleniyor
                                                </Badge>
                                            )}
                                            {offer.status === 'kabul' && (
                                                <Button
                                                    size="sm"
                                                    className="rounded-lg brand-btn-primary text-white"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openContentUploadFlow(offer);
                                                    }}
                                                >
                                                    <Upload size={12} className="mr-1" />
                                                    İçerik Yükle
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 rounded-lg text-xs px-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedOffer(offer);
                                                    setDetailModalOpen(true);
                                                }}
                                            >
                                                <Eye size={12} className="mr-1" />
                                                Detay
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <Dialog open={contentModalOpen} onOpenChange={setContentModalOpen}>
                <DialogContent className="max-w-md w-[calc(100%-24px)] md:w-full rounded-lg">
                    <DialogHeader>
                        <DialogTitle>İçerik Linki</DialogTitle>
                        <DialogDescription>
                            Paylaştığın içeriğin linkini buraya ekle.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            İçerik Linki
                        </label>
                        <input
                            type="url"
                            value={contentLink}
                            onChange={(e) => setContentLink(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setContentModalOpen(false)}
                            disabled={contentSaving}
                            className="flex items-center gap-2"
                        >
                            <X size={16} />
                            İptal
                        </Button>
                        <Button
                            className="brand-btn-primary text-white flex items-center gap-2"
                            onClick={handleSaveContentLink}
                            disabled={contentSaving}
                        >
                            <Save size={16} />
                            {contentSaving ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={counterModalOpen} onOpenChange={setCounterModalOpen}>
                <DialogContent className="max-w-md w-[calc(100%-24px)] md:w-full rounded-lg">
                    <DialogHeader>
                        <DialogTitle>Karşı Teklif Gönder</DialogTitle>
                        <DialogDescription>
                            Markaya iletilecek teklif tutarı ve notunu gir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Teklif Tutarı (TL)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={counterPrice}
                                onChange={(e) => setCounterPrice(e.target.value)}
                                placeholder="Örn: 5000"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Mesaj (Opsiyonel)
                            </label>
                            <Textarea
                                value={counterMessage}
                                onChange={(e) => setCounterMessage(e.target.value)}
                                placeholder="Karşı teklif notunu yazabilirsin..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCounterModalOpen(false)}
                            disabled={counterSending}
                            className="flex items-center gap-2"
                        >
                            <X size={16} />
                            İptal
                        </Button>
                        <Button
                            className="brand-btn-primary text-white flex items-center gap-2"
                            onClick={handleSendCounterOffer}
                            disabled={counterSending}
                        >
                            <Upload size={16} />
                            {counterSending ? 'Gönderiliyor...' : 'Karşı Teklif Gönder'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="max-w-4xl w-[calc(100%-24px)] md:w-full h-[82vh] max-h-[82vh] overflow-hidden flex flex-col rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 overflow-hidden flex items-center justify-center shadow-sm">
                                {selectedOffer?.brandLogoURL ? (
                                    <img
                                        src={selectedOffer.brandLogoURL}
                                        alt={selectedOffer.brandName || 'Marka'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold text-lg">
                                        {selectedOffer?.brandName?.charAt(0).toUpperCase() || 'M'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <span className="text-2xl">{selectedOffer?.brandName}</span>
                                {selectedOffer && (
                                    <Badge className={`ml-2 ${statusConfig[selectedOffer.status].color}`}>
                                        {statusConfig[selectedOffer.status].label}
                                    </Badge>
                                )}
                            </div>
                        </DialogTitle>
                        <DialogDescription>Teklif detayları</DialogDescription>
                    </DialogHeader>

                    {selectedOffer && (
                        <div className="py-3 flex-1 min-h-0 flex flex-col">
                            {(() => {
                                const isOfferAccepted = selectedOffer.status === 'kabul';
                                const tabs: Array<{ id: 'project' | 'revisions' | 'content'; label: string; disabled?: boolean }> = [
                                    { id: 'project', label: 'Proje Detayı' },
                                    { id: 'revisions', label: 'Revizyon Talepleri', disabled: !isOfferAccepted },
                                    { id: 'content', label: 'İçerik', disabled: !isOfferAccepted },
                                ];
                                return (
                            <div className="flex flex-wrap gap-2 mb-4 sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md py-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => !tab.disabled && setDetailTab(tab.id)}
                                        disabled={tab.disabled}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                            detailTab === tab.id
                                                ? 'bg-[#08afd5] text-white shadow-sm'
                                                : tab.disabled
                                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                    : 'bg-white/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                                );
                            })()}

                            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-3 mac-scrollbar">
                                {detailTab === 'project' && (
                                    <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-5">
                                        <div className="space-y-4">
                                            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#08afd5]/10 to-[#e3447c]/10 dark:from-[#08afd5]/20 dark:to-[#e3447c]/15 border border-[#08afd5]/30 dark:border-[#08afd5]/35">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-wide text-[#08afd5] dark:text-[#7ce7ff] mb-2">
                                                            Teklif Tutarı
                                                        </p>
                                                        <p className="text-3xl font-bold text-[#08afd5] dark:text-[#7ce7ff]">
                                                            {formatPrice(selectedOffer.price)}
                                                        </p>
                                                    </div>
                                                    {selectedCampaign?.campaignModel && (
                                                        <Badge className="bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/25 dark:text-[#7ce7ff]">
                                                            {getCampaignModelLabel(selectedCampaign.campaignModel)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-4 rounded-xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Teklif Tarihi</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        {formatDate(selectedOffer.createdAt)}
                                                    </p>
                                                </div>
                                                <div className="p-4 rounded-xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Yanıt Tarihi</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        {selectedOffer.respondedAt ? formatDate(selectedOffer.respondedAt) : '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            {selectedOffer.message && (
                                                <div className="p-4 rounded-xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60">
                                                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                                        Marka Mesajı
                                                    </p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        {selectedOffer.message}
                                                    </p>
                                                </div>
                                            )}

                                            {getNegotiationHistory(selectedOffer).length > 0 && (
                                                <div className="p-4 rounded-xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60">
                                                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                                        Pazarlık Geçmişi
                                                    </p>
                                                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1 mac-scrollbar">
                                                        {getNegotiationHistory(selectedOffer).map((item, idx) => (
                                                            <div
                                                                key={`${item.createdAt}-${idx}`}
                                                                className="p-2.5 rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/80 dark:bg-gray-800/50"
                                                            >
                                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                                    <span
                                                                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                                                                            item.actor === 'brand'
                                                                                ? 'bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/25 dark:text-[#7ce7ff]'
                                                                                : 'bg-[#e3447c]/15 text-[#e3447c] dark:bg-[#e3447c]/25 dark:text-[#ff8eb3]'
                                                                        }`}
                                                                    >
                                                                        {item.actor === 'brand' ? 'Marka' : 'Influencer'}
                                                                    </span>
                                                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                        {formatDate(item.createdAt)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm font-semibold text-[#08afd5] dark:text-[#7ce7ff]">
                                                                    {formatPrice(item.price)}
                                                                </p>
                                                                {item.message && (
                                                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                                                        {item.message}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-4 rounded-xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60">
                                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                                    Kampanya Özeti
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                                                    <div className="sm:col-span-2 rounded-xl border border-[#08afd5]/25 bg-[#08afd5]/5 dark:bg-[#08afd5]/10 dark:border-[#08afd5]/30 p-3">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                                                            Kampanya türü (içerik modeli)
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge className="bg-[#08afd5]/20 text-[#0a8fb0] dark:bg-[#08afd5]/25 dark:text-[#7ce7ff] text-xs font-semibold">
                                                                {getCampaignModelLabel(selectedCampaign?.campaignModel)}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                                                            {getCampaignModelDescription(selectedCampaign?.campaignModel)}
                                                        </p>
                                                        {selectedCampaign && hasContentLines(selectedCampaign) && (
                                                            <div className="mt-2 pt-2 border-t border-[#08afd5]/15 dark:border-[#08afd5]/25">
                                                                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                                                                    İçerik özeti (format / platform)
                                                                </p>
                                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                                    {formatContentLinesSummary(selectedCampaign)}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kampanya</p>
                                                        <p className="font-medium">{selectedCampaign?.title || selectedOffer.campaignTitle || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Platformlar</p>
                                                        <p className="font-medium">{selectedCampaign?.platforms?.join(', ') || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Süre</p>
                                                        <p className="font-medium">{selectedCampaign?.duration?.start || '-'} - {selectedCampaign?.duration?.end || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kampanya Bütçesi</p>
                                                        <p className="font-medium">
                                                            {selectedCampaign?.budget?.total
                                                                ? formatPrice(selectedCampaign.budget.total)
                                                                : '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {selectedOffer.status === 'kabul' &&
                                                selectedCampaign &&
                                                !shouldHideTrackableCampaignLinkSection(selectedCampaign.campaignModel) && (
                                                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Link2 className="text-blue-600 dark:text-blue-400" size={18} />
                                                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                                            İzlenebilir Kampanya Linki
                                                        </p>
                                                    </div>

                                                    {loadingTrackingLink ? (
                                                        <div className="flex items-center justify-center py-4">
                                                            <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                                        </div>
                                                    ) : trackingLink ? (
                                                        <div className="space-y-3">
                                                            <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                                                            Paylaşım Linki
                                                                        </p>
                                                                        <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                                                                            {trackingLink.trackingUrl ||
                                                                              `${import.meta.env.VITE_TRACKING_BASE_URL || 'http://localhost:3002'}/c/${trackingLink.shortCode}`}
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={async () => {
                                                                            const fullLink =
                                                                              trackingLink.trackingUrl ||
                                                                              `${import.meta.env.VITE_TRACKING_BASE_URL || 'http://localhost:3002'}/c/${trackingLink.shortCode}`;
                                                                            try {
                                                                                await navigator.clipboard.writeText(fullLink);
                                                                                setLinkCopied(true);
                                                                                toast({
                                                                                    title: 'Başarılı',
                                                                                    description: 'Link kopyalandı!',
                                                                                });
                                                                                setTimeout(() => setLinkCopied(false), 2000);
                                                                            } catch {
                                                                                toast({
                                                                                    title: 'Hata',
                                                                                    description: 'Link kopyalanamadı.',
                                                                                    variant: 'destructive',
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="flex-shrink-0"
                                                                    >
                                                                        {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            {trackingLink.clickCount !== undefined && (
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-blue-600 dark:text-blue-400">
                                                                        Toplam Tıklama
                                                                    </span>
                                                                    <span className="font-bold text-blue-700 dark:text-blue-300">
                                                                        {trackingLink.clickCount}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                                                Bu linki paylaşarak kampanyaya katılabilirsiniz.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4">
                                                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                                                Marka henüz izlenebilir link oluşturmadı.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60">
                                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                                    Hedef Kitle
                                                </p>
                                                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <p><span className="text-gray-500 dark:text-gray-400">Yaş:</span> {selectedCampaign?.targetAudience?.ageRange || '-'}</p>
                                                    <p>
                                                      <span className="text-gray-500 dark:text-gray-400">Ürün:</span>{' '}
                                                      {Array.isArray(selectedCampaign?.targetAudience?.productSubcategories) &&
                                                      selectedCampaign.targetAudience.productSubcategories.length > 0
                                                        ? selectedCampaign.targetAudience.productSubcategories.join(', ')
                                                        : selectedCampaign?.targetAudience?.interests || '-'}
                                                    </p>
                                                    <p><span className="text-gray-500 dark:text-gray-400">Lokasyon:</span> {selectedCampaign?.targetAudience?.location || '-'}</p>
                                                </div>
                                            </div>
                                            {selectedOffer.status !== 'kabul' && (
                                                <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20">
                                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                                        Teklif kabul edilene kadar içerik yükleme ve revizyon alanları pasif kalır.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {detailTab === 'revisions' && (
                                    <div className="space-y-3">
                                        {selectedOffer.status !== 'kabul' ? (
                                            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
                                                Teklif henüz kabul edilmediği için revizyon sekmesi pasif.
                                            </div>
                                        ) : selectedOffer.revisions && getRevisionList(selectedOffer).length > 0 ? (
                                            getRevisionList(selectedOffer).map((rev, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                                                >
                                                    <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                                                        {rev.createdAt ? formatDate(rev.createdAt) : ''}
                                                    </p>
                                                    <p className="text-sm text-red-700 dark:text-red-200">
                                                        {rev.note}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Revizyon talebi bulunmuyor.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {detailTab === 'content' && (
                                    <div className="space-y-4">
                                        {selectedOffer.status !== 'kabul' && (
                                            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
                                                Teklif henüz kabul edilmediği için içerik teslimi aktif değil.
                                            </div>
                                        )}
                                        {selectedOffer.contentApproved && (
                                            <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/30 text-sm text-sky-800 dark:text-sky-200">
                                                Bu içerik marka tarafından onaylandı; bağlantı veya dosya güncellemesi yapılamaz.
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                İçerik Yönetimi
                                            </p>
                                            <Button
                                                className="brand-btn-primary text-white"
                                                onClick={handleSaveContentLink}
                                                disabled={
                                                    contentSaving ||
                                                    selectedOffer.status !== 'kabul' ||
                                                    selectedOffer.contentApproved === true
                                                }
                                            >
                                                {contentSaving ? 'Kaydediliyor...' : 'İçerik Yükle'}
                                            </Button>
                                        </div>
                                        {selectedOffer.contentLink && (
                                            <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60">
                                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                                    Mevcut İçerik Linki
                                                </p>
                                                <a
                                                    href={selectedOffer.contentLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sm text-[#08afd5] dark:text-[#7ce7ff] break-all underline"
                                                >
                                                    {selectedOffer.contentLink}
                                                </a>
                                            </div>
                                        )}

                                        <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60">
                                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                                İçerik Yükle
                                            </p>
                                            <input
                                                type="url"
                                                value={contentLink}
                                                onChange={(e) => setContentLink(e.target.value)}
                                                placeholder="https://..."
                                                disabled={
                                                    selectedOffer.status !== 'kabul' || selectedOffer.contentApproved === true
                                                }
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#08afd5]"
                                            />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                Linki ekledikten sonra "İçerik Yükle" ile kaydedin.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="shrink-0">
                        {selectedOffer?.status === 'beklemede' && !isOfferAwaitingBrand(selectedOffer) && (
                            <div className="flex gap-2 w-full">
                                {selectedOffer && canInfluencerCounterToBrandOffer(selectedOffer) && (
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-xl"
                                        disabled={actionLoading}
                                        onClick={() => openCounterModal(selectedOffer)}
                                    >
                                        Karşı Teklif
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl"
                                    disabled={actionLoading}
                                    onClick={() => handleRejectOffer(selectedOffer)}
                                >
                                    <ThumbsDown size={16} className="mr-2" />
                                    Reddet
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl"
                                    disabled={actionLoading}
                                    onClick={() => handleAcceptOffer(selectedOffer)}
                                >
                                    {actionLoading ? (
                                        <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-500 rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <ThumbsUp size={16} className="mr-2" />
                                            Kabul Et
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                        {selectedOffer?.status === 'beklemede' && isOfferAwaitingBrand(selectedOffer) && (
                            <div className="w-full p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
                                Marka yanıtı bekleniyor. Dönüş olana kadar kabul, red veya yeni karşı teklif veremezsin.
                            </div>
                        )}
                        {selectedOffer?.status === 'kabul' && (
                            <Button
                                variant="outline"
                                className="w-full rounded-xl"
                                onClick={() => {
                                    if (!selectedOffer) return;
                                    openContentUploadFlow(selectedOffer);
                                }}
                            >
                                <Upload size={16} className="mr-2" />
                                İçerik Yükle
                            </Button>
                        )}
                        {selectedOffer?.status === 'red' && (
                            <Button variant="outline" className="w-full rounded-xl" onClick={() => setDetailModalOpen(false)}>
                                Kapat
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style>{`
                .mac-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .mac-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .mac-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.45);
                    border-radius: 10px;
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
                .dark .mac-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.45);
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
                .mac-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(100, 116, 139, 0.65);
                    background-clip: padding-box;
                }
                .dark .mac-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.65);
                    background-clip: padding-box;
                }
            `}</style>
        </div>
    );
};
