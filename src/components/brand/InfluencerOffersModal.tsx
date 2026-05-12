import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    Filter,
    Instagram,
    Youtube,
    Users,
    Send,
    CheckCircle,
    Clock,
    XCircle,
    ChevronDown,
    User,
    DollarSign,
    Tag,
    Link2,
    Copy,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getAllInfluencers, InfluencerData } from '@/services/firebaseAuthService';
import { createOffer, getOffersByCampaign, FirebaseOffer } from '@/services/firebaseOfferService';
import { FirebaseCampaign } from '@/services/firebaseCampaignService';
import { getInfluencerProfile } from '@/services/firebaseInfluencerService';
import { createTrackingLink, getTrackingLinkByOfferId, TrackingLink } from '@/services/trackingLinkService';
import { useToast } from '@/hooks/use-toast';

interface InfluencerOffersModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: FirebaseCampaign;
    brandId: string;
}

// TikTok icon
const TikTokIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

const platformIcons: Record<string, React.ReactNode> = {
    instagram: <Instagram size={14} />,
    tiktok: <TikTokIcon />,
    youtube: <Youtube size={14} />,
};

type CategoryFilter = 'all' | string;
type StatusFilterType = 'all' | 'available' | 'offered';
type FollowerFilter = 'all' | '1K - 10K' | '10K - 50K' | '50K - 100K' | '100K - 500K' | '500K+';

export const InfluencerOffersModal: React.FC<InfluencerOffersModalProps> = ({
    isOpen,
    onClose,
    campaign,
    brandId,
}) => {
    const { toast } = useToast();
    const [influencers, setInfluencers] = useState<InfluencerData[]>([]);
    const [influencerProfiles, setInfluencerProfiles] = useState<Record<string, { profilePhotoURL?: string }>>({});
    const [existingOffers, setExistingOffers] = useState<FirebaseOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
    const [followerFilter, setFollowerFilter] = useState<FollowerFilter>('all');

    // Teklif gönderme state'leri
    const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerData | null>(null);
    const [offerPrice, setOfferPrice] = useState<string>('');
    const [offerMessage, setOfferMessage] = useState<string>('');
    const [sendingOffer, setSendingOffer] = useState(false);
    
    // Tracking link state'leri
    const [targetUrl, setTargetUrl] = useState<string>('');
    const [trackingLink, setTrackingLink] = useState<{ shortCode: string; trackingUrl: string } | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    // Tüm kategorileri topla
    const allCategories = React.useMemo(() => {
        const categories = new Set<string>();
        influencers.forEach(inf => {
            if (inf.categories) {
                inf.categories.forEach(cat => categories.add(cat));
            }
        });
        return Array.from(categories);
    }, [influencers]);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, campaign.id]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Paralel olarak influencer'ları ve mevcut teklifleri yükle
            const [influencersData, offersData] = await Promise.all([
                getAllInfluencers(),
                getOffersByCampaign(campaign.id),
            ]);

            // Sadece onaylanmış influencer'ları göster
            const approvedInfluencers = influencersData.filter(
                inf => inf.status === 'onaylandı'
            );

            setInfluencers(approvedInfluencers);
            setExistingOffers(offersData);

            // Profil fotoğraflarını yükle
            const profilePromises = approvedInfluencers.map(async (inf) => {
                try {
                    const profile = await getInfluencerProfile(inf.id);
                    return {
                        id: inf.id,
                        profilePhotoURL: profile?.profilePhotoURL,
                    };
                } catch {
                    return {
                        id: inf.id,
                        profilePhotoURL: undefined,
                    };
                }
            });

            const profiles = await Promise.all(profilePromises);
            const profilesMap: Record<string, { profilePhotoURL?: string }> = {};
            profiles.forEach((p) => {
                profilesMap[p.id] = { profilePhotoURL: p.profilePhotoURL };
            });
            setInfluencerProfiles(profilesMap);
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            toast({
                title: 'Hata',
                description: 'Influencer listesi yüklenirken bir hata oluştu.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Influencer'ın teklif durumunu kontrol et
    const getOfferStatus = (influencerId: string): FirebaseOffer | null => {
        return existingOffers.find(offer => offer.influencerId === influencerId) || null;
    };

    // Filtreleme
    const filteredInfluencers = influencers.filter(influencer => {
        // Arama filtresi
        const searchMatch =
            searchQuery === '' ||
            influencer.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            influencer.email.toLowerCase().includes(searchQuery.toLowerCase());

        // Kategori filtresi
        const categoryMatch =
            categoryFilter === 'all' ||
            (influencer.categories && influencer.categories.includes(categoryFilter));

        // Takipçi filtresi
        const followerMatch =
            followerFilter === 'all' || influencer.followerRange === followerFilter;

        // Durum filtresi
        const hasOffer = getOfferStatus(influencer.id) !== null;
        const statusMatch =
            statusFilter === 'all' ||
            (statusFilter === 'available' && !hasOffer) ||
            (statusFilter === 'offered' && hasOffer);

        return searchMatch && categoryMatch && followerMatch && statusMatch;
    });

    // Teklif gönder
    const handleSendOffer = async () => {
        if (!selectedInfluencer || !offerPrice) {
            toast({
                title: 'Hata',
                description: 'Lütfen tüm gerekli alanları doldurun.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setSendingOffer(true);

            const newOffer = await createOffer({
                campaignId: campaign.id,
                brandId: brandId,
                influencerId: selectedInfluencer.id,
                price: parseFloat(offerPrice),
                message: offerMessage || undefined,
            });

            // Eğer target URL varsa, tracking link oluştur
            if (targetUrl) {
                try {
                    const newLink = await createTrackingLink({
                        offerId: newOffer.id,
                        targetUrl: targetUrl,
                        platform: campaign.platforms[0]?.toLowerCase() || 'instagram',
                    });
                    setTrackingLink(newLink);
                    
                    toast({
                        title: 'Başarılı!',
                        description: `Teklif gönderildi ve izlenebilir link oluşturuldu.`,
                    });
                } catch (linkError: any) {
                    console.error('Link oluşturma hatası:', linkError);
                    toast({
                        title: 'Teklif Gönderildi',
                        description: `Teklif gönderildi ancak link oluşturulamadı: ${linkError.message}`,
                        variant: 'destructive',
                    });
                }
            } else {
                toast({
                    title: 'Başarılı!',
                    description: `${selectedInfluencer.fullName} adlı influencer'a teklif gönderildi.`,
                });
            }

            // Teklifleri yeniden yükle
            const offersData = await getOffersByCampaign(campaign.id);
            setExistingOffers(offersData);

            // Formu temizle
            setSelectedInfluencer(null);
            setOfferPrice('');
            setOfferMessage('');
            setTargetUrl('');
            setTrackingLink(null);
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

    // Platform bilgilerini render et
    const renderPlatforms = (platforms: InfluencerData['platforms']) => {
        if (!platforms) return null;

        if (Array.isArray(platforms)) {
            return platforms.map((p, idx) => (
                <div
                    key={idx}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs"
                >
                    {platformIcons[p.id.toLowerCase()]}
                    <span>@{p.username}</span>
                </div>
            ));
        }

        return null;
    };

    // Teklif durumu badge'i
    const renderOfferBadge = (offer: FirebaseOffer | null) => {
        if (!offer) return null;

        const statusConfig = {
            beklemede: {
                icon: <Clock size={12} />,
                label: 'Beklemede',
                className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            },
            kabul: {
                icon: <CheckCircle size={12} />,
                label: 'Kabul Edildi',
                className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            },
            red: {
                icon: <XCircle size={12} />,
                label: 'Reddedildi',
                className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            },
        };

        const config = statusConfig[offer.status];

        return (
            <Badge className={`${config.className} flex items-center gap-1`}>
                {config.icon}
                {config.label}
            </Badge>
        );
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Influencer'lara Teklif Gönder
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Kampanya: <span className="font-medium text-purple-600">{campaign.title || campaign.productInfo}</span>
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="rounded-full h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <X size={20} />
                        </Button>
                    </div>

                    <div className="flex h-[calc(90vh-80px)]">
                        {/* Sol Panel - Influencer Listesi */}
                        <div className="flex-1 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                            {/* Filtreler */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
                                {/* Arama */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <Input
                                        placeholder="İsim veya email ile ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 rounded-xl border-gray-200 dark:border-gray-700"
                                    />
                                </div>

                                {/* Filtre Row */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Filter size={14} />
                                        <span>Filtrele:</span>
                                    </div>

                                    {/* Kategori Filtresi */}
                                    <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                                        <SelectTrigger className="w-36 h-9 rounded-lg text-sm">
                                            <SelectValue placeholder="Kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tüm Kategoriler</SelectItem>
                                            {allCategories.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Takipçi Filtresi */}
                                    <Select value={followerFilter} onValueChange={(v) => setFollowerFilter(v as FollowerFilter)}>
                                        <SelectTrigger className="w-36 h-9 rounded-lg text-sm">
                                            <SelectValue placeholder="Takipçi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tüm Takipçiler</SelectItem>
                                            <SelectItem value="1K - 10K">1K - 10K</SelectItem>
                                            <SelectItem value="10K - 50K">10K - 50K</SelectItem>
                                            <SelectItem value="50K - 100K">50K - 100K</SelectItem>
                                            <SelectItem value="100K - 500K">100K - 500K</SelectItem>
                                            <SelectItem value="500K+">500K+</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Durum Filtresi */}
                                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilterType)}>
                                        <SelectTrigger className="w-36 h-9 rounded-lg text-sm">
                                            <SelectValue placeholder="Durum" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tümü</SelectItem>
                                            <SelectItem value="available">Teklif Yapılmamış</SelectItem>
                                            <SelectItem value="offered">Teklif Yapılmış</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Influencer Listesi */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {loading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
                                    </div>
                                ) : filteredInfluencers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <Users size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            Influencer Bulunamadı
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Filtreleri değiştirerek tekrar deneyin.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredInfluencers.map((influencer) => {
                                            const offer = getOfferStatus(influencer.id);
                                            const isSelected = selectedInfluencer?.id === influencer.id;

                                            return (
                                                <motion.div
                                                    key={influencer.id}
                                                    whileHover={{ scale: 1.01 }}
                                                    onClick={() => !offer && setSelectedInfluencer(influencer)}
                                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                            : offer
                                                                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed'
                                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-800'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-3">
                                                            {/* Avatar */}
                                                            {influencerProfiles[influencer.id]?.profilePhotoURL ? (
                                                                <img
                                                                    src={influencerProfiles[influencer.id].profilePhotoURL}
                                                                    alt={influencer.fullName}
                                                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                                                    {influencer.fullName.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}

                                                            {/* Info */}
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                                                    {influencer.fullName}
                                                                </h4>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                    {influencer.email}
                                                                </p>

                                                                {/* Platformlar */}
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {renderPlatforms(influencer.platforms)}
                                                                </div>

                                                                {/* Kategoriler & Takipçi */}
                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                        <Users size={12} />
                                                                        <span>{influencer.followerRange}</span>
                                                                    </div>
                                                                    {influencer.categories && influencer.categories.length > 0 && (
                                                                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                            <Tag size={12} />
                                                                            <span>{influencer.categories.slice(0, 2).join(', ')}</span>
                                                                            {influencer.categories.length > 2 && (
                                                                                <span className="text-purple-600">+{influencer.categories.length - 2}</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Sağ taraf - Teklif durumu veya seçim */}
                                                        <div className="flex items-center gap-2">
                                                            {offer ? (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {renderOfferBadge(offer)}
                                                                    <span className="text-xs text-gray-500">
                                                                        {new Intl.NumberFormat('tr-TR', {
                                                                            style: 'currency',
                                                                            currency: 'TRY',
                                                                            minimumFractionDigits: 0,
                                                                        }).format(offer.price)}
                                                                    </span>
                                                                </div>
                                                            ) : isSelected ? (
                                                                <Badge className="bg-purple-600 text-white">Seçildi</Badge>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">Teklif için tıkla</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Alt bilgi */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Toplam {filteredInfluencers.length} influencer
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {existingOffers.length} teklif gönderilmiş
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sağ Panel - Teklif Formu */}
                        <div className="w-96 flex flex-col bg-gray-50 dark:bg-gray-800/30">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Teklif Oluştur
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Seçili influencer'a teklif gönderin
                                </p>
                            </div>

                            <div className="flex-1 p-4 overflow-y-auto">
                                {selectedInfluencer ? (
                                    <div className="space-y-6">
                                        {/* Seçili Influencer */}
                                        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                {influencerProfiles[selectedInfluencer.id]?.profilePhotoURL ? (
                                                    <img
                                                        src={influencerProfiles[selectedInfluencer.id].profilePhotoURL}
                                                        alt={selectedInfluencer.fullName}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                                        {selectedInfluencer.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                                        {selectedInfluencer.fullName}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {selectedInfluencer.followerRange} takipçi
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setSelectedInfluencer(null)}
                                                    className="ml-auto rounded-full h-8 w-8"
                                                >
                                                    <X size={16} />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Teklif Fiyatı */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Teklif Tutarı (₺) *
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <Input
                                                    type="number"
                                                    placeholder="Örn: 5000"
                                                    value={offerPrice}
                                                    onChange={(e) => setOfferPrice(e.target.value)}
                                                    className="pl-10 rounded-xl"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Kampanya bütçesi: {new Intl.NumberFormat('tr-TR', {
                                                    style: 'currency',
                                                    currency: 'TRY',
                                                    minimumFractionDigits: 0,
                                                }).format(campaign.budget.total)}
                                            </p>
                                        </div>

                                        {/* Mesaj */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Mesaj (Opsiyonel)
                                            </label>
                                            <Textarea
                                                placeholder="Influencer'a iletmek istediğiniz mesajı yazın..."
                                                value={offerMessage}
                                                onChange={(e) => setOfferMessage(e.target.value)}
                                                className="rounded-xl resize-none"
                                                rows={4}
                                            />
                                        </div>

                                        {/* Tracking Link Bölümü */}
                                        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Link2 className="text-purple-600 dark:text-purple-400" size={18} />
                                                <label className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                                                    İzlenebilir Link Oluştur
                                                </label>
                                            </div>
                                            
                                            {!trackingLink ? (
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                                                            Hedef URL (Hepsiburada, Trendyol vb.)
                                                        </label>
                                                        <Input
                                                            type="url"
                                                            placeholder="https://www.hepsiburada.com/urun123"
                                                            value={targetUrl}
                                                            onChange={(e) => setTargetUrl(e.target.value)}
                                                            className="rounded-lg text-sm"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-purple-600 dark:text-purple-400">
                                                        Teklif gönderildiğinde bu URL için otomatik olarak izlenebilir link oluşturulacak.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                                                                    İzlenebilir Link
                                                                </p>
                                                                <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                                                                    {trackingLink.trackingUrl}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={async () => {
                                                                    try {
                                                                        await navigator.clipboard.writeText(trackingLink.trackingUrl);
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
                                                    <p className="text-xs text-purple-600 dark:text-purple-400">
                                                        Bu link influencer'a otomatik olarak gönderilecek.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Kampanya Özeti */}
                                        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                                                Kampanya Özeti
                                            </h4>
                                            <div className="space-y-1 text-sm text-purple-700 dark:text-purple-300">
                                                <p>• Platformlar: {campaign.platforms.join(', ')}</p>
                                                <p>• İçerik: {campaign.contentFormats.join(', ')}</p>
                                                {campaign.duration.period && (
                                                    <p>• Süre: {campaign.duration.period}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <User size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            Influencer Seçin
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Sol taraftaki listeden teklif göndermek istediğiniz influencer'ı seçin.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Gönder Butonu */}
                            {selectedInfluencer && (
                                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                                    <Button
                                        onClick={handleSendOffer}
                                        disabled={!offerPrice || sendingOffer}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 flex items-center justify-center gap-2"
                                    >
                                        {sendingOffer ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Teklif Gönder
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
