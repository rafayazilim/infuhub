import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Filter,
    Clock,
    CheckCircle,
    XCircle,
    DollarSign,
    Calendar,
    Building2,
    Instagram,
    Youtube,
    Eye,
    ThumbsUp,
    ThumbsDown,
    Upload,
    MessageSquare,
    AlertCircle,
    Link2,
    Copy,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import {
    getOffersByInfluencer,
    updateOfferStatus,
    updateOfferContentLink,
    FirebaseOffer,
} from '@/services/firebaseOfferService';
import { getUserData } from '@/services/firebaseAuthService';
import { getTrackingLinkByOfferId, TrackingLink } from '@/services/trackingLinkService';
import { useToast } from '@/hooks/use-toast';

// TikTok icon
const TikTokIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

interface OffersContentProps {
    influencerId: string;
    onOfferAccepted?: () => void;
}

interface EnrichedOffer extends FirebaseOffer {
    brandName?: string;
    campaignTitle?: string;
}

type StatusFilter = 'all' | 'beklemede' | 'kabul' | 'red';

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

    useEffect(() => {
        if (influencerId) {
            loadOffers();
        }
    }, [influencerId]);

    // Modal açıldığında veya selectedOffer değiştiğinde tracking link'i yükle
    useEffect(() => {
        if (detailModalOpen && selectedOffer && selectedOffer.status === 'kabul') {
            setLoadingTrackingLink(true);
            getTrackingLinkByOfferId(selectedOffer.id)
                .then((link) => {
                    setTrackingLink(link);
                })
                .catch((error) => {
                    console.error('Tracking link yükleme hatası:', error);
                    setTrackingLink(null);
                })
                .finally(() => {
                    setLoadingTrackingLink(false);
                });
        } else {
            setTrackingLink(null);
        }
    }, [detailModalOpen, selectedOffer]);

    const loadOffers = async () => {
        try {
            setLoading(true);
            const offersData = await getOffersByInfluencer(influencerId);

            // Her teklif için marka bilgilerini çek
            const enrichedOffers = await Promise.all(
                offersData.map(async (offer) => {
                    try {
                        const brandData = await getUserData(offer.brandId, 'brand');
                        return {
                            ...offer,
                            brandName: (brandData as any)?.brandName || 'Bilinmeyen Marka',
                        };
                    } catch {
                        return {
                            ...offer,
                            brandName: 'Bilinmeyen Marka',
                        };
                    }
                })
            );

            // En yeniden eskiye sırala
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
                        description: `${offer.brandName || 'Marka'} revizyon talebi gonderdi.`,
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

    const handleAcceptOffer = async (offer: EnrichedOffer) => {
        try {
            setActionLoading(true);
            await updateOfferStatus(offer.id, 'kabul');

            // Teklif kabul edildikten sonra tracking link'i yükle
            try {
                const link = await getTrackingLinkByOfferId(offer.id);
                setTrackingLink(link);
            } catch (error) {
                console.error('Tracking link yükleme hatası:', error);
            }

            toast({
                title: 'Teklif Kabul Edildi!',
                description: 'Teklifi kabul ettiniz. Kampanya hazırlanıyor.',
            });

            await loadOffers();
            
            // Eğer modal açıksa ve bu teklif seçiliyse, modal'ı kapatma
            if (selectedOffer?.id === offer.id) {
                // Modal açık kalacak, sadece offer'ı güncelle
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
        try {
            setActionLoading(true);
            await updateOfferStatus(offer.id, 'red');

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

    
    const handleSaveContentLink = async () => {
        if (!selectedOffer) return;
        const trimmed = contentLink.trim();
        if (!trimmed) {
            toast({
                title: 'Hata',
                description: 'Lutfen icerik linkini girin.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setContentSaving(true);
            await updateOfferContentLink(selectedOffer.id, trimmed);
            toast({
                title: 'Icerik linki kaydedildi',
                description: 'Link basariyla kaydedildi.',
            });
            setContentModalOpen(false);
            await loadOffers();
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'Icerik linki kaydedilirken hata olustu.',
                variant: 'destructive',
            });
        } finally {
            setContentSaving(false);
        }
    };

    
    const getRevisionList = (offer: EnrichedOffer) => {
        if (!offer.revisions) return [];
        const values = Object.values(offer.revisions);
        return values.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).reverse();
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

    // İstatistikler
    const stats = {
        total: offers.length,
        pending: offers.filter(o => o.status === 'beklemede').length,
        accepted: offers.filter(o => o.status === 'kabul').length,
        rejected: offers.filter(o => o.status === 'red').length,
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Teklifler</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Markalardan gelen kampanya tekliflerini yönetin
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <FileText size={18} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Toplam Teklif</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border border-yellow-200/50 dark:border-yellow-800/30 bg-yellow-50/50 dark:bg-yellow-900/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                            <Clock size={18} className="text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.pending}</p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-500">Beklemede</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border border-green-200/50 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.accepted}</p>
                            <p className="text-xs text-green-600 dark:text-green-500">Kabul Edildi</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                            <XCircle size={18} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejected}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Reddedildi</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
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
            </div>

            {/* Offers List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
                </div>
            ) : filteredOffers.length === 0 ? (
                <Card className="p-12 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <FileText size={32} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {statusFilter === 'all' ? 'Henüz Teklif Yok' : 'Teklif Bulunamadı'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {statusFilter === 'all'
                                ? 'Markalardan teklifler geldiğinde burada görünecek.'
                                : 'Seçili filtreye uygun teklif bulunamadı.'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredOffers.map((offer) => {
                        const status = statusConfig[offer.status];

                        return (
                            <motion.div
                                key={offer.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.01 }}
                                transition={{ duration: 0.15 }}
                            >
                                <Card
                                    className={`p-5 border rounded-xl bg-white dark:bg-gray-900 hover:shadow-md transition-all cursor-pointer ${status.borderColor}`}
                                    onClick={() => {
                                        setSelectedOffer(offer);
                                        setDetailModalOpen(true);
                                        // Tracking link yükleme useEffect tarafından yapılacak
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            {/* Marka Avatar */}
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                                {offer.brandName?.charAt(0).toUpperCase() || 'M'}
                                            </div>

                                            {/* Info */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                                        {offer.brandName}
                                                    </h4>
                                                    <Badge className={`${status.color} flex items-center gap-1`}>
                                                        {status.icon}
                                                        {status.label}
                                                    </Badge>
                                                </div>

                                                {offer.message && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
                                                        "{offer.message}"
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign size={14} />
                                                        <span className="font-medium text-purple-600 dark:text-purple-400">
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

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {offer.status === 'beklemede' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="rounded-lg text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRejectOffer(offer);
                                                        }}
                                                    >
                                                        <ThumbsDown size={14} className="mr-1" />
                                                        Reddet
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="rounded-lg bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcceptOffer(offer);
                                                        }}
                                                    >
                                                        <ThumbsUp size={14} className="mr-1" />
                                                        Kabul Et
                                                    </Button>
                                                </>
                                            )}
                                            {offer.status === 'kabul' && (
                                                <Button
                                                    size="sm"
                                                    className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOffer(offer);
                                                        setContentLink(offer.contentLink || '');
                                                        setContentModalOpen(true);
                                                    }}
                                                >
                                                    <Upload size={14} className="mr-1" />
                                                    İçerik Yükle
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="rounded-lg"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedOffer(offer);
                                                    setDetailModalOpen(true);
                                                }}
                                            >
                                                <Eye size={14} className="mr-1" />
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

            
            {/* Content Upload Modal */}
            <Dialog open={contentModalOpen} onOpenChange={setContentModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Icerik Linki</DialogTitle>
                        <DialogDescription>
                            Paylastigin icerigin linkini buraya ekle.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Icerik Linki
                        </label>
                        <input
                            type="url"
                            value={contentLink}
                            onChange={(e) => setContentLink(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setContentModalOpen(false)}
                            disabled={contentSaving}
                        >
                            Iptal
                        </Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={handleSaveContentLink}
                            disabled={contentSaving}
                        >
                            {contentSaving ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

{/* Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                {selectedOffer?.brandName?.charAt(0).toUpperCase() || 'M'}
                            </div>
                            <div>
                                <span className="text-xl">{selectedOffer?.brandName}</span>
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
                        <div className="space-y-4 py-4">
                            {/* Teklif Tutarı */}
                            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Teklif Tutarı</p>
                                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                                    {formatPrice(selectedOffer.price)}
                                </p>
                            </div>

                            {/* Mesaj */}
                            {selectedOffer.message && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Marka Mesajı
                                    </p>
                                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {selectedOffer.message}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tarih Bilgileri */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Teklif Tarihi</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {formatDate(selectedOffer.createdAt)}
                                    </p>
                                </div>
                                {selectedOffer.respondedAt && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Yanıt Tarihi</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {formatDate(selectedOffer.respondedAt)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            
                            {selectedOffer.contentLink && (
                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Icerik Linki
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={selectedOffer.contentLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm text-purple-600 dark:text-purple-400 break-all underline"
                                        >
                                            {selectedOffer.contentLink}
                                        </a>
                                    </div>
                                </div>
                            )}

                            {selectedOffer.revisions && getRevisionList(selectedOffer).length > 0 && (
                                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                        Revizyon Talepleri
                                    </p>
                                    <div className="space-y-2">
                                        {getRevisionList(selectedOffer).map((rev, idx) => (
                                            <div
                                                key={idx}
                                                className="text-sm text-red-700 dark:text-red-200 bg-white/60 dark:bg-gray-900/40 border border-red-200/50 dark:border-red-800/50 rounded-lg p-2"
                                            >
                                                <div className="text-xs text-red-600 dark:text-red-400 mb-1">
                                                    {rev.createdAt ? formatDate(rev.createdAt) : ''}
                                                </div>
                                                {rev.note}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

{/* Tracking Link (Sadece kabul edilmiş teklifler için) */}
                            {selectedOffer.status === 'kabul' && (
                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
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
                                        <div className="space-y-2">
                                            <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                                            Paylaşım Linki
                                                        </p>
                                                        <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                                                            {trackingLink.trackingUrl || `http://localhost:3002/c/${trackingLink.shortCode}`}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={async () => {
                                                            const fullLink = trackingLink.trackingUrl || `http://localhost:3002/c/${trackingLink.shortCode}`;
                                                            try {
                                                                await navigator.clipboard.writeText(fullLink);
                                                                setLinkCopied(true);
                                                                toast({
                                                                    title: 'Başarılı',
                                                                    description: 'Link kopyalandı!',
                                                                });
                                                                setTimeout(() => setLinkCopied(false), 2000);
                                                            } catch (error) {
                                                                toast({
                                                                    title: 'Hata',
                                                                    description: 'Link kopyalanamadı.',
                                                                    variant: 'destructive',
                                                                });
                                                            }
                                                        }}
                                                        className="flex-shrink-0"
                                                    >
                                                        {linkCopied ? (
                                                            <Check size={16} />
                                                        ) : (
                                                            <Copy size={16} />
                                                        )}
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
                        </div>
                    )}

                    <DialogFooter>
                        {selectedOffer?.status === 'beklemede' && (
                            <div className="flex gap-2 w-full">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                                    disabled={actionLoading}
                                    onClick={() => handleRejectOffer(selectedOffer)}
                                >
                                    <ThumbsDown size={16} className="mr-2" />
                                    Reddet
                                </Button>
                                <Button
                                    className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                                    disabled={actionLoading}
                                    onClick={() => handleAcceptOffer(selectedOffer)}
                                >
                                    {actionLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <ThumbsUp size={16} className="mr-2" />
                                            Kabul Et
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                        {selectedOffer?.status === 'kabul' && (
                            <Button
                                className="w-full rounded-xl bg-purple-600 hover:bg-purple-700"
                                onClick={() => {
                                    if (!selectedOffer) return;
                                    setContentLink(selectedOffer.contentLink || '');
                                    setContentModalOpen(true);
                                }}
                            >
                                <Upload size={16} className="mr-2" />
                                Icerik Yukle
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
        </div>
    );
};
