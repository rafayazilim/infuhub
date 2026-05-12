import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  LayoutDashboard,
  Megaphone,
  Wallet,
  Users,
  MessageSquare,
  Link2,
  FileText,
  Settings,
  X,
  TrendingUp,
  Clock,
  Target,
  MousePointerClick,
  CheckCircle2,
  Package,
  Video,
  Waypoints,
  UserRound,
  HeartHandshake,
  MapPin,
  WalletCards,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Save,
  Image,
  Smartphone,
  Search,
  Plus,
  Trash2,
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
import { CampaignsContent } from '@/components/brand/CampaignsContent';
import { BrandOffersContent } from '@/components/brand/BrandOffersContent';
import { BrandTrackingLinksContent } from '@/components/brand/BrandTrackingLinksContent';
import { MessagesPanel } from '@/components/shared/MessagesPanel';
import { DashboardMessagesWidget } from '@/components/shared/DashboardMessagesWidget';
import { BudgetSpendingContent } from '@/components/brand/BudgetSpendingContent';
import {
  FirebaseCampaign,
  createCampaign,
  getBrandCampaigns,
  getCampaignSummary,
  getEffectiveCampaignStatus,
  updateCampaign,
} from '@/services/firebaseCampaignService';
import { getOfferStats, getOffersByBrand } from '@/services/firebaseOfferService';
import { getTrackingLinksByBrand, sumClicks } from '@/services/firebaseTrackingService';
import { getUserData, isUserVerified, logoutUser } from '@/services/firebaseAuthService';
import { getInfluencerProfile } from '@/services/firebaseInfluencerService';
import { auth, database } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { uploadCampaignImage, uploadFile } from '@/services/firebaseStorageService';
import { useToast } from '@/hooks/use-toast';
import { submitVerificationRequest } from '@/services/firebaseVerificationService';
import {
  ensureBrandWallet,
  getBrandWalletTransactions,
  processPendingBrandWalletDebitsForBrand,
} from '@/services/firebaseBrandWalletService';
import { processStaleEscrowRefundsForBrandOffers } from '@/services/firebaseOfferEscrowService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/utils/metaPixel';
import {
  BRAND_DASHBOARD_CENTERED_CLASS,
  BRAND_DASHBOARD_MAIN_CLASS,
  BRAND_DASHBOARD_HERO_BLEED_OUTSET,
  BRAND_HERO_CONTENT_INSET,
} from '@/constants/brandDashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  BrandDashboardHero,
  BrandDashboardQuickActions,
  type BrandDashboardQuickActionId,
} from '@/components/brand/BrandDashboardHero';
import { BrandProfileEditDialog } from '@/components/brand/BrandProfileEditDialog';
import { BrandSorumluEditDialog } from '@/components/brand/BrandSorumluEditDialog';
import { BrandDashboardOptimization } from '@/components/brand/BrandDashboardOptimization';
import { BrandSettingsContent } from '@/components/brand/BrandSettingsContent';
import { InfluencerOffersModal } from '@/components/brand/InfluencerOffersModal';
import { BrandInfluencerDiscoverContent } from '@/components/brand/BrandInfluencerDiscoverContent';
import { CATEGORY_TREE, TOP_CATEGORY_KEYS } from '@/constants/sectorCategoryTree';
import { TURKIYE_81_IL_ALFABE } from '@/constants/turkiyeIller';
import { CAMPAIGN_GOAL_OPTIONS, formatCampaignGoalLabel } from '@/constants/campaignGoals';
import { getCampaignModelLabel } from '@/lib/campaignModelLabels';
import { REGISTRATION_PLATFORM_DEFS } from '@/constants/registrationPlatforms';
import { RegistrationPlatformIcon } from '@/components/shared/RegistrationPlatformIcon';
import {
  UGC_ASPECT_RATIOS,
  UGC_DURATION_PRESETS,
  newContentLineId,
  formatDurationShort,
  buildLegacyFromCollabLines,
  formatContentLinesSummary,
} from '@/lib/campaignContentLines';
import { mapFirebaseCampaignToBrandForm } from '@/lib/mapFirebaseCampaignToBrandForm';
import {
  markAllAppNotificationsRead,
  markAppNotificationRead,
  subscribeAppNotifications,
  type AppNotification,
} from '@/services/firebaseNotificationService';

/** Kampanya oluşturma önizlemesi — görsel seçilmediğinde (public/pics) */
const DEFAULT_CAMPAIGN_PREVIEW_IMAGE = '/pics/defaultkampanya.png';

/** YYYY-MM-DD (yerel takvim) — geçerliliği kontrol ederek gün ekler veya çıkarır */
function ymdAddDays(ymd: string, deltaDays: number): string | null {
  const t = ymd.trim();
  if (!t) return null;
  const parts = t.split('-').map((s) => parseInt(s, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Son başvuru en geç: son paylaşım bitişinin bir gün öncesi */
function maxApplicationDeadlineFromPublishEnd(publishEndYmd: string): string | null {
  return ymdAddDays(publishEndYmd, -1);
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  trend?: string;
}

interface ActiveInfluencerItem {
  id: string;
  name: string;
  photoURL?: string;
  paid: number;
  engagement: number;
  email?: string;
  bio?: string;
  categories?: string[];
  followerRange?: string;
  platforms?: Record<string, { username?: string; followers?: number }> | Array<{ id: string; username?: string; followers?: number }>;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, description, trend }) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
    className="aspect-[4/3]"
  >
    <Card className="h-full p-6 border border-gray-200/50 dark:border-gray-800/50 rounded-xl bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-[10px] bg-[#08afd5]/15 dark:bg-[#08afd5]/20 text-[#08afd5] dark:text-[#6edff3]">
            {icon}
          </div>
          {trend && (
            <Badge variant="secondary" className="text-xs rounded-md">
              {trend}
            </Badge>
          )}
        </div>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{value}</h3>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500">{description}</p>
      </div>
    </Card>
  </motion.div>
);

/** Ana içerik tam ekran yayılmasın; ortalanmış sabit üst genişlik bandı */
const BRAND_CENTERED_SHELL = BRAND_DASHBOARD_CENTERED_CLASS;

export default function BrandDashboardNew() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validMenuIds = useMemo(
    () =>
      new Set([
        'dashboard',
        'discover',
        'campaigns',
        'budget',
        'offers',
        'messages',
        'tracking',
        'settings',
      ]),
    []
  );
  const activeMenu = useMemo(() => {
    const fromUrl = searchParams.get('tab');
    return fromUrl && validMenuIds.has(fromUrl) ? fromUrl : 'dashboard';
  }, [searchParams, validMenuIds]);
  const setActiveMenu = (menu: string) => {
    const normalized = validMenuIds.has(menu) ? menu : 'dashboard';
    const current = searchParams.get('tab') || 'dashboard';
    if (current === normalized) return;
    const next = new URLSearchParams(searchParams);
    if (normalized === 'dashboard') {
      next.delete('tab');
    } else {
      next.set('tab', normalized);
    }
    setSearchParams(next);
  };
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [campaignStats, setCampaignStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    draftCampaigns: 0,
  });
  const [offerStats, setOfferStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
  });
  const [campaigns, setCampaigns] = useState<FirebaseCampaign[]>([]);
  /** Kampanyalar sekmesi açıkken yeni kampanya sonrası listeyi yenilemek için */
  const [campaignLibraryRefreshKey, setCampaignLibraryRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  /** Influencer Keşfet → InfluencerOffersModal ile aynı teklif akışı */
  const [discoverOffersModalOpen, setDiscoverOffersModalOpen] = useState(false);
  const [discoverOffersModalCampaign, setDiscoverOffersModalCampaign] =
    useState<FirebaseCampaign | null>(null);
  const [discoverOffersInfluencerId, setDiscoverOffersInfluencerId] = useState<string | null>(null);
  const [campaignSlideIndex, setCampaignSlideIndex] = useState(0);
  const [activeInfluencers, setActiveInfluencers] = useState<ActiveInfluencerItem[]>([]);
  const [influencerProfileOpen, setInfluencerProfileOpen] = useState(false);
  const [influencerProfileLoading, setInfluencerProfileLoading] = useState(false);
  const [expandedInfluencer, setExpandedInfluencer] = useState<ActiveInfluencerItem | null>(null);
  const [influencerSlideIndex, setInfluencerSlideIndex] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [walletOverview, setWalletOverview] = useState({
    balance: 0,
    loadedTotal: 0,
    spentTotal: 0,
  });
  const [latestWalletTx, setLatestWalletTx] = useState<{ type: string; amount: number; createdAt: string } | null>(null);
  const [brandProfile, setBrandProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileEditDialogOpen, setProfileEditDialogOpen] = useState(false);
  const [sorumluDialogOpen, setSorumluDialogOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const verificationInputRef = useRef<HTMLInputElement>(null);
  const [verificationUploading, setVerificationUploading] = useState(false);
  const [campaignStep, setCampaignStep] = useState<'detail' | 'audience' | 'content'>('detail');
  const [authReady, setAuthReady] = useState(false);
  /** Kampanya düzenleme modu — kabul edilmiş teklif yokken açılabilir */
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editingCampaignImageUrl, setEditingCampaignImageUrl] = useState<string | null>(null);
  const [editingCampaignStatus, setEditingCampaignStatus] = useState<FirebaseCampaign['status'] | null>(null);
  const [campaignData, setCampaignData] = useState({
    campaignModel: 'ugc_video' as 'ugc_video' | 'collaboration',
    campaignName: '',
    campaignDescription: '',
    campaignGoal: '',
    visibilityOpen: true,
    fixedOffer: false,
    gender: 'all' as 'female' | 'male' | 'all',
    minAge: '',
    maxAge: '',
    /** Kayıt alt kategorilerinden ürün / niş */
    productSubcategories: [] as string[],
    location: [] as string[],
    contentDetails: '',
    influencerBudget: '',
    applicationDeadline: '',
    publishStartDate: '',
    publishEndDate: '',
    platforms: [] as string[],
    contentFormatCounts: {
      Story: 0,
      Reels: 0,
      Post: 0,
      Video: 0,
    } as Record<string, number>,
  });

  /** UGC: oran + süre sepeti (influencer başına satır = 1 video) */
  const [ugcLineBasket, setUgcLineBasket] = useState<
    { id: string; kind: 'ugc'; aspectRatio: string; durationSec: number }[]
  >([]);
  const [ugcAspectDraft, setUgcAspectDraft] = useState<string>(UGC_ASPECT_RATIOS[1]);
  const [ugcDurationDraftSec, setUgcDurationDraftSec] = useState<number>(30);

  /** İşbirliği: platform + format sepeti */
  const [collabLineBasket, setCollabLineBasket] = useState<
    { id: string; kind: 'collab'; platform: string; contentFormat: string }[]
  >([]);
  const [collabPlatformDraft, setCollabPlatformDraft] = useState(REGISTRATION_PLATFORM_DEFS[0].label);
  const [collabFormatDraft, setCollabFormatDraft] = useState('Reels');

  const [campaignImageFile, setCampaignImageFile] = useState<File | null>(null);
  const [campaignProductTopCategory, setCampaignProductTopCategory] = useState('');
  const [campaignProductSubSearch, setCampaignProductSubSearch] = useState('');
  const focusedOfferId = searchParams.get('offerId');
  const campaignImagePreview = useMemo(() => (
    campaignImageFile ? URL.createObjectURL(campaignImageFile) : ''
  ), [campaignImageFile]);

  const campaignTopCategoryOptions = useMemo(
    () => [...TOP_CATEGORY_KEYS].sort((a, b) => a.localeCompare(b, 'tr')),
    []
  );

  const campaignProductFilteredSubs = useMemo(() => {
    const subs = campaignProductTopCategory ? (CATEGORY_TREE[campaignProductTopCategory] ?? []) : [];
    const q = campaignProductSubSearch.trim().toLocaleLowerCase('tr');
    if (!q) return subs;
    return subs.filter((s) => s.toLocaleLowerCase('tr').includes(q));
  }, [campaignProductTopCategory, campaignProductSubSearch]);

  useEffect(() => {
    return () => {
      if (campaignImagePreview) {
        URL.revokeObjectURL(campaignImagePreview);
      }
    };
  }, [campaignImagePreview]);

  const getBrandId = () => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return '';
      const user = JSON.parse(raw);
      return user?.id || '';
    } catch {
      return '';
    }
  };
  const brandId = getBrandId();
  const isVerified = isUserVerified(brandProfile?.status);
  const isVerificationPending = brandProfile?.verificationRequestStatus === 'beklemede';
  const isVerificationRejected = brandProfile?.verificationRequestStatus === 'reddedildi';
  const isCampaignLive = (campaign: FirebaseCampaign) => getEffectiveCampaignStatus(campaign) === 'aktif';
  const notifyCampaignCreationRequiresVerification = () => {
    toast({
      title: 'Profil doğrulaması gerekli',
      description: 'Kampanya oluşturmak için marka profilinizin admin tarafından onaylanması gerekir.',
      variant: 'destructive',
    });
  };

  // Kampanya istatistiklerini yükle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authReady && auth.currentUser && brandId) {
      loadBrandProfile();
    }
  }, [authReady, brandId]);

  useEffect(() => {
    if (!authReady || !auth.currentUser || !brandId) {
      setNotifications([]);
      return;
    }
    return subscribeAppNotifications('brand', brandId, setNotifications);
  }, [authReady, brandId]);

  useEffect(() => {
    if (authReady && auth.currentUser && brandId && activeMenu === 'dashboard') {
      loadDashboardStats();
    }
  }, [authReady, brandId, activeMenu]);

  useEffect(() => {
    if (campaigns.length === 0) {
      setCampaignSlideIndex(0);
      return;
    }
    if (campaignSlideIndex > campaigns.length - 1) {
      setCampaignSlideIndex(0);
    }
  }, [campaigns, campaignSlideIndex]);

  useEffect(() => {
    if (activeInfluencers.length === 0) {
      setInfluencerSlideIndex(0);
      return;
    }
    if (influencerSlideIndex > activeInfluencers.length - 1) {
      setInfluencerSlideIndex(0);
    }
  }, [activeInfluencers, influencerSlideIndex]);

  const loadDashboardStats = async () => {
    try {
      await processPendingBrandWalletDebitsForBrand(brandId);
      await processStaleEscrowRefundsForBrandOffers(await getOffersByBrand(brandId));
      const [stats, offers, trackingLinks, campaignList, wallet, walletTx] = await Promise.all([
        getCampaignSummary(brandId),
        getOfferStats(brandId),
        getTrackingLinksByBrand(brandId),
        getBrandCampaigns(brandId),
        ensureBrandWallet(brandId),
        getBrandWalletTransactions(brandId, 1),
      ]);

      const offersList = await getOffersByBrand(brandId);

      setCampaignStats(stats);
      setOfferStats(offers);
      setCampaigns(campaignList);
      const clicks = sumClicks(trackingLinks);
      setTotalClicks(clicks);
      const rate = offers.total > 0 ? (offers.accepted / offers.total) * 100 : 0;
      setConversionRate(rate);
      setWalletOverview(wallet);
      setLatestWalletTx(walletTx[0] || null);

      const campaignMap = new Map(campaignList.map((c) => [c.id, c]));
      const acceptedByInfluencer = offersList
        .filter((o) => o.status === 'kabul')
        .filter((o) => {
          const campaign = campaignMap.get(o.campaignId);
          if (!campaign) return false;
          return isCampaignLive(campaign);
        })
        .reduce<Record<string, number>>((acc, offer) => {
          acc[offer.influencerId] = (acc[offer.influencerId] || 0) + (offer.price || 0);
          return acc;
        }, {});

      const engagementByInfluencer = trackingLinks.reduce<Record<string, number>>((acc, link) => {
        const influencerId = link.influencerId;
        if (!influencerId) return acc;
        acc[influencerId] = (acc[influencerId] || 0) + sumClicks([link]);
        return acc;
      }, {});

      const influencerIds = Object.keys(acceptedByInfluencer);
      const influencerList = await Promise.all(
        influencerIds.map(async (id) => {
          const [user, profile] = await Promise.all([
            getUserData(id, 'influencer').catch(() => null),
            getInfluencerProfile(id).catch(() => null),
          ]);
          return {
            id,
            name: (user as any)?.fullName || 'Influencer',
            photoURL: profile?.profilePhotoURL,
            paid: acceptedByInfluencer[id] || 0,
            engagement: engagementByInfluencer[id] || 0,
            email: (user as any)?.email || '',
            bio: profile?.bio || '',
            categories: profile?.categories || [],
            followerRange: profile?.followerRange || '',
            platforms: profile?.platforms as any,
          };
        })
      );
      setActiveInfluencers(influencerList.sort((a, b) => b.paid - a.paid));
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const openDiscoverInfluencerOfferModal = (campaign: FirebaseCampaign, influencerId: string) => {
    setDiscoverOffersModalCampaign(campaign);
    setDiscoverOffersInfluencerId(influencerId);
    setDiscoverOffersModalOpen(true);
  };

  const closeDiscoverInfluencerOfferModal = () => {
    setDiscoverOffersModalOpen(false);
    setDiscoverOffersModalCampaign(null);
    setDiscoverOffersInfluencerId(null);
    void loadDashboardStats();
  };

  const loadBrandProfile = async () => {
    try {
      setProfileLoading(true);
      const profile = await getUserData(brandId, 'brand');
      setBrandProfile(profile);
    } catch (error) {
      console.error('Marka profili yüklenemedi:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePhotoClick = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brandId) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    try {
      setPhotoUploading(true);
      const photoURL = await uploadFile(file, `brand-photos/${brandId}`);
      await update(ref(database, `brands/${brandId}`), {
        profilePhotoURL: photoURL,
        updatedAt: new Date().toISOString(),
      });
      setBrandProfile((prev: any) => ({
        ...(prev || {}),
        profilePhotoURL: photoURL,
      }));
    } catch (error) {
      console.error('Profil fotoğrafı yüklenemedi:', error);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleVerificationClick = () => {
    verificationInputRef.current?.click();
  };

  const handleVerificationFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brandId || !brandProfile) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Hata',
        description: 'Lütfen geçerli bir görsel dosyası seçin.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Hata',
        description: 'Dosya boyutu 5MB\'dan küçük olmalıdır.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setVerificationUploading(true);
      await submitVerificationRequest({
        userId: brandId,
        userType: 'brand',
        fullNameOrBrandName: brandProfile.brandName || 'Marka',
        email: brandProfile.email || '',
        file,
      });
      setBrandProfile((prev: any) => ({
        ...(prev || {}),
        verificationRequestStatus: 'beklemede',
      }));
      toast({
        title: 'Başarılı',
        description: 'Profil doğrulama isteğin admin paneline iletildi.',
      });
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message || 'Doğrulama isteği gönderilemedi.',
        variant: 'destructive',
      });
    } finally {
      setVerificationUploading(false);
      if (verificationInputRef.current) verificationInputRef.current.value = '';
    }
  };

  // ESC tuşu ile modal kapatma
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreateCampaignOpen) {
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isCreateCampaignOpen]);

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'discover', icon: <Compass size={18} />, label: 'Influencer Keşfi' },
    { id: 'campaigns', icon: <Megaphone size={18} />, label: 'Kampanyalar' },
    { id: 'budget', icon: <Wallet size={18} />, label: 'Bütçe & Harcamalar' },
    { id: 'offers', icon: <Users size={18} />, label: 'Influencer Teklifleri' },
    { id: 'messages', icon: <MessageSquare size={18} />, label: 'Mesajlar' },
    { id: 'tracking', icon: <Link2 size={18} />, label: 'Takip Linkleri' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Ayarlar' },
  ];

  const goToMenu = (menu: string) => {
    setActiveMenu(menu);
    setMobileMenuOpen(false);
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.read) {
      void markAppNotificationRead('brand', brandId, notification.id);
    }
    const tab = notification.actionTab || (notification.metadata?.eventType?.includes('content') ? 'campaigns' : 'offers');
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (notification.metadata?.offerId) next.set('offerId', notification.metadata.offerId);
    if (notification.metadata?.campaignId) next.set('campaignId', notification.metadata.campaignId);
    setSearchParams(next);
    setMobileMenuOpen(false);
  };

  const handleMarkAllNotificationsRead = () => {
    if (!brandId) return;
    void markAllAppNotificationsRead('brand', brandId);
  };

  const handleSecureLogout = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await logoutUser();
      setMobileMenuOpen(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('isVerified');
      navigate('/markalar-icin', { replace: true });
    } catch (e) {
      console.error('Çıkış hatası:', e);
      toast({
        title: 'Çıkış yapılamadı',
        description: 'Lütfen bir süre sonra tekrar deneyin.',
        variant: 'destructive',
      });
    } finally {
      setLogoutBusy(false);
    }
  };

  const renderBrandSidebar = () => (
    <>
      <div className="mb-6 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200/60 bg-white/90 shadow-[0_10px_24px_rgba(8,175,213,0.2)] dark:border-gray-700/60 dark:bg-gray-900/80">
        <img src="/pics/infulogoy.png.png" alt="INFUHUB" className="h-full w-full object-contain" />
      </div>
      <nav className="flex min-h-0 flex-1 flex-col items-center gap-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goToMenu(item.id)}
            title={item.label}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
              activeMenu === item.id
                ? 'bg-[#08afd5]/20 text-[#08afd5] shadow-[inset_0_0_0_1px_rgba(8,175,213,0.4)] dark:bg-[#08afd5]/25 dark:text-[#6edff3]'
                : 'text-gray-600 hover:bg-white/60 dark:text-gray-300 dark:hover:bg-gray-800/70'
            }`}
          >
            {item.icon}
          </button>
        ))}
      </nav>
      <div className="mt-auto flex shrink-0 flex-col items-center pt-2">
        <button
          type="button"
          onClick={handleSecureLogout}
          disabled={logoutBusy}
          title="Güvenli çıkış — Markalar sayfasına dön"
          aria-label="Güvenli çıkış"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/15"
        >
          <LogOut size={20} />
        </button>
      </div>
    </>
  );

  const handleDashboardQuickAction = (id: BrandDashboardQuickActionId) => {
    if (id === 'create-campaign') {
      if (!isVerified) {
        notifyCampaignCreationRequiresVerification();
        goToMenu('settings');
        return;
      }
      setCampaignStep('detail');
      setCampaignProductTopCategory('');
      setCampaignProductSubSearch('');
      setIsCreateCampaignOpen(true);
      return;
    }
    const tabMap: Record<Exclude<BrandDashboardQuickActionId, 'create-campaign'>, string> = {
      campaigns: 'campaigns',
      offers: 'offers',
      budget: 'budget',
      messages: 'messages',
      tracking: 'tracking',
    };
    goToMenu(tabMap[id]);
  };

  const metrics = [
    {
      icon: <Megaphone size={20} />,
      title: 'Toplam Kampanya',
      value: campaignStats.totalCampaigns.toString(),
      description: 'Tüm kampanyalar',
      trend: campaignStats.totalCampaigns > 0 ? `${campaignStats.totalCampaigns} kampanya` : 'Henüz yok',
    },
    {
      icon: <TrendingUp size={20} />,
      title: 'Aktif Kampanya',
      value: campaignStats.activeCampaigns.toString(),
      description: 'Şu anda çalışan',
      trend: campaignStats.activeCampaigns > 0 ? 'Devam ediyor' : 'Henüz yok',
    },
    {
      icon: <Clock size={20} />,
      title: 'Taslak Kampanya',
      value: campaignStats.draftCampaigns.toString(),
      description: 'Hazırlık aşamasında',
      trend: campaignStats.draftCampaigns > 0 ? `${campaignStats.draftCampaigns} taslak` : 'Henüz yok',
    },
    {
      icon: <CheckCircle2 size={20} />,
      title: 'Tamamlanan',
      value: campaignStats.completedCampaigns.toString(),
      description: 'Başarıyla tamamlandı',
      trend: campaignStats.completedCampaigns > 0 ? `${campaignStats.completedCampaigns} kampanya` : 'Henüz yok',
    },
    {
      icon: <MousePointerClick size={20} />,
      title: 'Toplam Tiklama',
      value: totalClicks.toLocaleString('tr-TR'),
      description: 'Takip linklerinden',
      trend: totalClicks > 0 ? `${totalClicks.toLocaleString('tr-TR')} tiklama` : 'Henuz yok',
    },
    {
      icon: <Target size={20} />,
      title: 'Donusum Orani',
      value: `${conversionRate.toFixed(1)}%`,
      description: 'Teklif kabul orani',
      trend: offerStats.total > 0 ? `${offerStats.accepted}/${offerStats.total} kabul` : 'Henuz yok',
    },
  ];

  const contentFormats = ['Story', 'Reels', 'Post', 'Video'];
  const campaignGoals = [...CAMPAIGN_GOAL_OPTIONS];

  const budgetLabels = ['?5.000', '?25.000', '?50.000', '?100.000', '?250.000+'];
  const campaignModels = [
    {
      id: 'ugc_video' as const,
      label: 'UGC Video',
      description: 'Marka için kullanıcı üretimi video içeriği üretilir ve yayınlanır.',
      hoverDetail:
        'İçerik üreticisi marka için bir ürün tanıtım video içeriği oluşturur. Marka ister kendi hesaplarında ister influencerın hesaplarında bu videoyu paylaşır.',
      icon: <Video size={16} />,
    },
    {
      id: 'collaboration' as const,
      label: 'İşbirliği',
      description: 'Marka ile içerik üreticisi arasında süreç ve teslimatlar birlikte yürütülür.',
      hoverDetail:
        'İçerik üreticisi videoyu çeker ve kendi hesabında paylaşır. Markaya ve ürüne yönlendirme yapar.',
      icon: <HeartHandshake size={16} />,
    },
  ];
  /** Kampanya hedefi: Türkiye geneli veya 81 il; en fazla 3 seçim */
  const campaignLocationChoices = useMemo(
    () => ['Türkiye Geneli', ...TURKIYE_81_IL_ALFABE],
    []
  );
  const MAX_PRODUCT_SUBCATEGORIES = 3;
  const MAX_LOCATION_PICKS = 3;

  const isCampaignDetailStepComplete = useMemo(
    () => Boolean(campaignData.campaignName?.trim()) && Boolean(campaignData.campaignGoal),
    [campaignData.campaignName, campaignData.campaignGoal]
  );

  const isCampaignAudienceStepComplete = useMemo(() => {
    if (!String(campaignData.minAge).trim() || !String(campaignData.maxAge).trim()) return false;
    if (Number(campaignData.minAge) > Number(campaignData.maxAge)) return false;
    if (campaignData.productSubcategories.length === 0) return false;
    if (campaignData.productSubcategories.length > MAX_PRODUCT_SUBCATEGORIES) return false;
    if (campaignData.location.length === 0) return false;
    if (campaignData.location.length > MAX_LOCATION_PICKS) return false;
    return true;
  }, [campaignData.minAge, campaignData.maxAge, campaignData.productSubcategories, campaignData.location]);

  const isCampaignContentStepComplete = useMemo(() => {
    if (!campaignData.contentDetails?.trim()) return false;
    if (!String(campaignData.influencerBudget).trim()) return false;
    if (!campaignData.applicationDeadline || !campaignData.publishStartDate || !campaignData.publishEndDate) {
      return false;
    }
    if (campaignData.campaignModel === 'ugc_video') {
      if (ugcLineBasket.length === 0) return false;
    } else {
      if (collabLineBasket.length === 0) return false;
    }
    if (new Date(campaignData.publishStartDate) > new Date(campaignData.publishEndDate)) return false;
    const latestDeadline = maxApplicationDeadlineFromPublishEnd(campaignData.publishEndDate);
    if (
      latestDeadline &&
      campaignData.applicationDeadline &&
      campaignData.applicationDeadline > latestDeadline
    ) {
      return false;
    }
    return true;
  }, [
    campaignData.contentDetails,
    campaignData.influencerBudget,
    campaignData.applicationDeadline,
    campaignData.publishStartDate,
    campaignData.publishEndDate,
    campaignData.campaignModel,
    ugcLineBasket.length,
    collabLineBasket.length,
  ]);

  const isCampaignFormFullyValid = useMemo(
    () =>
      isCampaignDetailStepComplete && isCampaignAudienceStepComplete && isCampaignContentStepComplete,
    [isCampaignDetailStepComplete, isCampaignAudienceStepComplete, isCampaignContentStepComplete]
  );

  const canNavigateToCampaignAudience =
    isCampaignDetailStepComplete || campaignStep === 'audience' || campaignStep === 'content';
  const canNavigateToCampaignContent =
    (isCampaignDetailStepComplete && isCampaignAudienceStepComplete) || campaignStep === 'content';

  const addUgcToBasket = () => {
    setUgcLineBasket((prev) => [
      ...prev,
      {
        id: newContentLineId(),
        kind: 'ugc' as const,
        aspectRatio: ugcAspectDraft,
        durationSec: ugcDurationDraftSec,
      },
    ]);
  };

  const removeUgcFromBasket = (id: string) => {
    setUgcLineBasket((prev) => prev.filter((r) => r.id !== id));
  };

  const addCollabToBasket = () => {
    setCollabLineBasket((prev) => [
      ...prev,
      {
        id: newContentLineId(),
        kind: 'collab' as const,
        platform: collabPlatformDraft,
        contentFormat: collabFormatDraft,
      },
    ]);
  };

  const removeCollabFromBasket = (id: string) => {
    setCollabLineBasket((prev) => prev.filter((r) => r.id !== id));
  };

  const addCampaignLocation = (loc: string) => {
    if (!loc.trim()) return;
    setCampaignData((prev) => {
      if (prev.location.includes(loc)) return prev;
      if (prev.location.length >= MAX_LOCATION_PICKS) {
        toast({
          title: 'En fazla 3 seçim',
          description: 'Ülke / şehir için en fazla 3 konum seçebilirsiniz.',
          variant: 'destructive',
        });
        return prev;
      }
      return { ...prev, location: [...prev.location, loc] };
    });
  };

  const removeCampaignLocation = (loc: string) => {
    setCampaignData((prev) => ({
      ...prev,
      location: prev.location.filter((l) => l !== loc),
    }));
  };

  const toggleProductSubcategory = (sub: string) => {
    setCampaignData((prev) => {
      const has = prev.productSubcategories.includes(sub);
      if (has) {
        return { ...prev, productSubcategories: prev.productSubcategories.filter((s) => s !== sub) };
      }
      if (prev.productSubcategories.length >= MAX_PRODUCT_SUBCATEGORIES) {
        toast({
          title: 'En fazla 3 seçim',
          description: 'Ürün (alt kategori) için en fazla 3 seçim yapabilirsiniz.',
          variant: 'destructive',
        });
        return prev;
      }
      return { ...prev, productSubcategories: [...prev.productSubcategories, sub] };
    });
  };

  const handleCampaignImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Geçersiz dosya',
        description: 'Lütfen bir görsel dosyası seçin.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: 'Dosya çok büyük',
        description: 'Kampanya görseli 8MB altında olmalıdır.',
        variant: 'destructive',
      });
      return;
    }
    setCampaignImageFile(file);
  };

  const resetNewCampaignForm = () => {
    setEditingCampaignId(null);
    setEditingCampaignImageUrl(null);
    setEditingCampaignStatus(null);
    setCampaignData({
      campaignModel: 'ugc_video',
      campaignName: '',
      campaignDescription: '',
      campaignGoal: '',
      visibilityOpen: true,
      fixedOffer: false,
      gender: 'all',
      minAge: '',
      maxAge: '',
      productSubcategories: [],
      location: [],
      contentDetails: '',
      influencerBudget: '',
      applicationDeadline: '',
      publishStartDate: '',
      publishEndDate: '',
      platforms: [],
      contentFormatCounts: {
        Story: 0,
        Reels: 0,
        Post: 0,
        Video: 0,
      },
    });
    setUgcLineBasket([]);
    setCollabLineBasket([]);
    setUgcAspectDraft(UGC_ASPECT_RATIOS[1]);
    setUgcDurationDraftSec(30);
    setCollabPlatformDraft(REGISTRATION_PLATFORM_DEFS[0].label);
    setCollabFormatDraft('Reels');
    setCampaignImageFile(null);
    setCampaignProductTopCategory('');
    setCampaignProductSubSearch('');
    setCampaignStep('detail');
  };

  const openEditCampaignModal = (campaign: FirebaseCampaign) => {
    const { campaignData: mapped, ugcLineBasket: ugcRows, collabLineBasket: collabRows } =
      mapFirebaseCampaignToBrandForm(campaign);
    setCampaignData(mapped);
    setUgcLineBasket(ugcRows);
    setCollabLineBasket(collabRows);
    if (ugcRows.length > 0) {
      const last = ugcRows[ugcRows.length - 1];
      setUgcAspectDraft(last.aspectRatio);
      setUgcDurationDraftSec(last.durationSec);
    } else {
      setUgcAspectDraft(UGC_ASPECT_RATIOS[1]);
      setUgcDurationDraftSec(30);
    }
    if (collabRows.length > 0) {
      const last = collabRows[collabRows.length - 1];
      setCollabPlatformDraft(last.platform);
      setCollabFormatDraft(last.contentFormat);
    } else {
      setCollabPlatformDraft(REGISTRATION_PLATFORM_DEFS[0].label);
      setCollabFormatDraft('Reels');
    }
    setCampaignImageFile(null);
    setEditingCampaignId(campaign.id);
    setEditingCampaignImageUrl(campaign.campaignImageURL || null);
    setEditingCampaignStatus(campaign.status);
    setCampaignProductTopCategory('');
    setCampaignProductSubSearch('');
    setCampaignStep('detail');
    setIsCreateCampaignOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!editingCampaignId && !isVerified) {
      notifyCampaignCreationRequiresVerification();
      return;
    }

    if (!isCampaignFormFullyValid) {
      alert('Önce tüm adımları sırayla tamamlayın: Kampanya Detayı → Hedef Kitle → İçerik.');
      return;
    }

    // Validation
    if (
      !campaignData.campaignName ||
      !campaignData.campaignGoal ||
      !campaignData.contentDetails ||
      !campaignData.influencerBudget ||
      !campaignData.applicationDeadline ||
      !campaignData.publishStartDate ||
      !campaignData.publishEndDate ||
      !campaignData.minAge ||
      !campaignData.maxAge ||
      campaignData.productSubcategories.length === 0 ||
      campaignData.location.length === 0
    ) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }
    if (campaignData.campaignModel === 'ugc_video' && ugcLineBasket.length === 0) {
      alert('En az bir video (oran + süre) ekleyin.');
      return;
    }
    if (campaignData.campaignModel === 'collaboration' && collabLineBasket.length === 0) {
      alert('En az bir platform + içerik formatı satırı ekleyin.');
      return;
    }

    if (campaignData.productSubcategories.length > MAX_PRODUCT_SUBCATEGORIES) {
      alert(`Ürün (alt kategori) için en fazla ${MAX_PRODUCT_SUBCATEGORIES} seçim yapabilirsiniz.`);
      return;
    }
    if (campaignData.location.length > MAX_LOCATION_PICKS) {
      alert(`Ülke / şehir için en fazla ${MAX_LOCATION_PICKS} konum seçebilirsiniz.`);
      return;
    }

    if (Number(campaignData.minAge) > Number(campaignData.maxAge)) {
      alert('Yaş aralığında minimum yaş, maksimum yaştan büyük olamaz.');
      return;
    }
    if (new Date(campaignData.publishStartDate) > new Date(campaignData.publishEndDate)) {
      alert('Son paylaşım tarih aralığında başlangıç, bitişten büyük olamaz.');
      return;
    }
    const latestDeadline = maxApplicationDeadlineFromPublishEnd(campaignData.publishEndDate);
    if (
      latestDeadline &&
      campaignData.applicationDeadline &&
      campaignData.applicationDeadline > latestDeadline
    ) {
      alert(
        'Son başvuru tarihi, son paylaşım bitiş tarihinden en az bir gün önce olmalıdır (ör. bitiş 26 ise başvuru en geç 25).'
      );
      return;
    }

    setIsSaving(true);

    try {
      const contentLines =
        campaignData.campaignModel === 'ugc_video'
          ? ugcLineBasket.map((r) => ({
              id: r.id,
              kind: 'ugc' as const,
              aspectRatio: r.aspectRatio,
              durationSec: r.durationSec,
            }))
          : collabLineBasket.map((r) => ({
              id: r.id,
              kind: 'collab' as const,
              platform: r.platform,
              contentFormat: r.contentFormat,
            }));

      const legacy =
        campaignData.campaignModel === 'collaboration'
          ? buildLegacyFromCollabLines(collabLineBasket)
          : { platforms: [] as string[], contentFormats: [] as string[], contentFormatQuantities: {} as Record<string, number> };

      const campaignPayload = {
        campaignModel: campaignData.campaignModel,
        title: campaignData.campaignName,
        campaignName: campaignData.campaignName,
        productInfo: campaignData.campaignDescription || campaignData.campaignName,
        productDescription: campaignData.campaignDescription,
        campaignDescription: campaignData.campaignDescription,
        campaignGoal: campaignData.campaignGoal,
        visibility: campaignData.visibilityOpen ? ('public' as const) : ('invite_only' as const),
        isFixedOffer: campaignData.fixedOffer,
        contentDetails: campaignData.contentDetails,
        applicationDeadline: campaignData.applicationDeadline,
        publishWindow: {
          start: campaignData.publishStartDate,
          end: campaignData.publishEndDate,
        },
        targetAudience: {
          ageRange: `${campaignData.minAge}-${campaignData.maxAge}`,
          interests: campaignData.productSubcategories.join(', '),
          productSubcategories: [...campaignData.productSubcategories],
          location: campaignData.location.join(', '),
          gender: campaignData.gender,
        },
        budget: {
          total: parseFloat(campaignData.influencerBudget),
          perInfluencer: parseFloat(campaignData.influencerBudget),
        },
        duration: {
          start: campaignData.publishStartDate,
          end: campaignData.publishEndDate,
        },
        platforms: legacy.platforms,
        contentFormats: legacy.contentFormats,
        contentFormatQuantities: legacy.contentFormatQuantities,
        contentLines,
      };

      if (editingCampaignId) {
        const imagePatch: { campaignImageURL?: string } = {};
        if (campaignImageFile) {
          imagePatch.campaignImageURL = await uploadCampaignImage(brandId, editingCampaignId, campaignImageFile);
        }
        await updateCampaign(brandId, editingCampaignId, { ...campaignPayload, ...imagePatch });
        toast({
          title: 'Kampanya güncellendi',
          description: 'Değişiklikler başarıyla kaydedildi.',
        });
      } else {
        const newCampaign = await createCampaign(brandId, campaignPayload);
        const imageURL = campaignImageFile
          ? await uploadCampaignImage(brandId, newCampaign.id, campaignImageFile)
          : DEFAULT_CAMPAIGN_PREVIEW_IMAGE;
        await updateCampaign(brandId, newCampaign.id, {
          campaignImageURL: imageURL,
        });
        toast({
          title: 'Kampanya oluşturuldu',
          description: 'Kampanyanız başarıyla taslak olarak kaydedildi.',
        });
        trackEvent('CreateCampaign');
      }

      resetNewCampaignForm();
      setIsCreateCampaignOpen(false);
      await loadDashboardStats();
      setCampaignLibraryRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error('Kampanya kaydetme hatası:', error);
      toast({
        title: 'Kampanya kaydedilemedi',
        description: error.message || 'Kampanya kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    const hasData =
      editingCampaignId !== null ||
      campaignImageFile !== null ||
      campaignData.campaignName !== '' ||
      campaignData.campaignDescription !== '' ||
      campaignData.campaignGoal !== '' ||
      campaignData.contentDetails !== '' ||
      campaignData.minAge !== '' ||
      campaignData.maxAge !== '' ||
      campaignData.location.length > 0 ||
      campaignData.influencerBudget !== '' ||
      campaignData.applicationDeadline !== '' ||
      campaignData.publishStartDate !== '' ||
      campaignData.publishEndDate !== '' ||
      campaignData.platforms.length > 0 ||
      campaignData.productSubcategories.length > 0 ||
      Object.values(campaignData.contentFormatCounts).some((count) => count > 0) ||
      ugcLineBasket.length > 0 ||
      collabLineBasket.length > 0;

    const close = () => {
      setIsCreateCampaignOpen(false);
      resetNewCampaignForm();
    };

    if (hasData) {
      if (window.confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?')) {
        close();
      }
    } else {
      close();
    }
  };

  const dashboardCampaigns = campaigns.filter((c) => c.status === 'aktif' || c.status === 'taslak');
  const currentCampaign = dashboardCampaigns[campaignSlideIndex] || null;
  const currentInfluencer = activeInfluencers[influencerSlideIndex] || null;
  const budgetLimits = [5000, 25000, 50000, 100000, 250000];
  const selectedBudgetIndex = typeof brandProfile?.budget === 'number' ? brandProfile.budget : 2;
  const selectedBudgetLimit = budgetLimits[selectedBudgetIndex] || 50000;
  const plannedBudget = Math.max(selectedBudgetLimit, walletOverview.loadedTotal || 0);
  const budgetUsagePercent = walletOverview.loadedTotal > 0
    ? Math.min(100, Math.round((walletOverview.spentTotal / walletOverview.loadedTotal) * 100))
    : 0;
  const budgetRemaining = Math.max(0, walletOverview.balance);
  const formatTRY = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(value || 0);

  const normalizeInfluencerPlatforms = (platforms: ActiveInfluencerItem['platforms']) => {
    if (!platforms) return [] as Array<{ id: string; username?: string; followers?: number }>;
    if (Array.isArray(platforms)) return platforms;
    return Object.entries(platforms).map(([id, info]) => ({
      id,
      username: info?.username,
      followers: info?.followers,
    }));
  };

  const openInfluencerProfile = async (item: ActiveInfluencerItem) => {
    setInfluencerProfileOpen(true);
    setInfluencerProfileLoading(true);
    try {
      const profile = await getInfluencerProfile(item.id);
      setExpandedInfluencer({
        ...item,
        photoURL: profile?.profilePhotoURL || item.photoURL,
        bio: profile?.bio || item.bio,
        categories: profile?.categories || item.categories || [],
        followerRange: profile?.followerRange || item.followerRange || '',
        platforms: profile?.platforms as any,
      });
    } finally {
      setInfluencerProfileLoading(false);
    }
  };

  if (!brandId) {
    return (
      <div className="mac-app-shell transition-colors duration-200 w-full min-w-0">
        <main className="w-full min-w-0 px-4 py-8 sm:px-6 md:px-8 md:py-10">
          <div className={BRAND_CENTERED_SHELL}>
            <div className="max-w-md mx-auto">
            <Card className="p-5 border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Lütfen giriş yapın. Kullanıcı bilgisi bulunamadı.
              </p>
            </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="mac-app-shell transition-colors duration-200 w-full min-w-0">
      <aside className="mac-sidebar fixed left-0 top-0 z-50 hidden h-screen w-[78px] flex-col items-center py-5 md:flex">
        {renderBrandSidebar()}
      </aside>

      {isMobile && (
        <div className="fixed left-0 top-0 z-50 w-full border-b border-gray-200/70 bg-white/80 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/80 md:hidden">
          <div className="flex items-center justify-between px-3 py-3 sm:px-4">
            <div className="h-10 w-10 shrink-0" aria-hidden />
            <button
              type="button"
              onClick={() => {
                goToMenu('dashboard');
              }}
              className="flex h-10 w-24 items-center justify-center overflow-hidden rounded-xl transition-opacity hover:opacity-80"
            >
              <img src="/pics/infulogo.png" alt="Infuhub" className="h-full w-full object-contain" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Menüyü Aç"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      )}

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="mac-sidebar w-[280px] p-0 [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigasyon Menüsü</SheetTitle>
            <SheetDescription>Ana menü seçenekleri</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col px-4 py-5">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl">
                <img src="/pics/infulogo.png" alt="Infuhub" className="h-full w-full object-contain" />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Menüyü Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToMenu(item.id)}
                  className={`inline-flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                    activeMenu === item.id
                      ? 'bg-[#08afd5]/15 text-[#08afd5] shadow-inner dark:bg-[#08afd5]/25 dark:text-[#6edff3]'
                      : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-gray-800/70'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-2 shrink-0 border-t border-gray-200/70 pt-4 dark:border-gray-700/60">
              <button
                type="button"
                onClick={handleSecureLogout}
                disabled={logoutBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/15"
              >
                <LogOut size={18} />
                {logoutBusy ? 'Çıkılıyor…' : 'Güvenli çıkış'}
              </button>
              <p className="mt-2 px-1 text-center text-[11px] text-gray-500 dark:text-gray-500">
                Oturum kapatılır ve markalar sayfasına yönlendirilirsiniz.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main
        className={cn(
          BRAND_DASHBOARD_MAIN_CLASS,
          activeMenu === 'discover' &&
            'max-w-none px-0 pb-0 pt-16 sm:px-0 md:pb-0 md:pt-0 md:pl-[78px] md:pr-0 lg:pr-0 xl:pr-0'
        )}
      >
        {activeMenu === 'dashboard' && (
          <div className={BRAND_DASHBOARD_HERO_BLEED_OUTSET}>
            <BrandDashboardHero
              fullBleed
              brandProfile={(brandProfile ?? null) as Record<string, unknown> | null}
              profileLoading={profileLoading}
              photoUploading={photoUploading}
              isVerified={isVerified}
              isVerificationPending={isVerificationPending}
              isVerificationRejected={isVerificationRejected}
              verificationUploading={verificationUploading}
              offerPendingCount={offerStats.pending}
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              walletBalance={walletOverview.balance}
              formatTry={formatTRY}
              onLogoClick={handlePhotoClick}
              onVerificationClick={handleVerificationClick}
              onOpenProfileEdit={() => setProfileEditDialogOpen(true)}
              onOpenSorumluEdit={() => setSorumluDialogOpen(true)}
              onSecureLogout={handleSecureLogout}
              logoutBusy={logoutBusy}
              onNavigate={goToMenu}
              snapshot={{
                activeCampaigns: campaignStats.activeCampaigns,
                draftCampaigns: campaignStats.draftCampaigns,
                pendingOffers: offerStats.pending,
                acceptedOffers: offerStats.accepted,
                totalClicks,
              }}
            />
          </div>
        )}

        <div
          className={cn(
            activeMenu === 'discover' ? 'w-full min-w-0 max-w-none' : BRAND_CENTERED_SHELL,
            activeMenu === 'discover' ? '' : BRAND_HERO_CONTENT_INSET,
            activeMenu !== 'dashboard' && activeMenu !== 'discover' && 'pt-5 md:pt-6'
          )}
        >
        {/* Dashboard Content */}
        {activeMenu === 'dashboard' && (
          <div className="w-full space-y-5 md:space-y-6">
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            <input ref={verificationInputRef} type="file" accept="image/*" onChange={handleVerificationFileChange} className="hidden" />

            <BrandDashboardQuickActions onAction={handleDashboardQuickAction} />

            {!isVerified && (
              <Card className="mac-surface border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-800/50 dark:bg-amber-950/25">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">Profil doğrulama</p>
                <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                  {isVerificationPending
                    ? 'Doğrulama talebiniz inceleniyor. Onay sonrası tüm işlemleri kullanabilirsiniz.'
                    : isVerificationRejected
                      ? 'Doğrulama talebiniz reddedildi. Güncel vergi levhası ile yeniden talep gönderebilirsiniz.'
                      : 'Vergi levhası ile doğrulama talebi gönderebilirsiniz. Detay için hesap menüsündeki seçeneği kullanın.'}
                </p>
                {!isVerificationPending && (
                  <Button className="mt-3 w-full sm:w-auto" variant="outline" onClick={handleVerificationClick} disabled={verificationUploading}>
                    {verificationUploading ? 'Yükleniyor...' : isVerificationRejected ? 'Yeniden belge yükle' : 'Belge yükle'}
                  </Button>
                )}
              </Card>
            )}

            <div className="grid min-h-0 grid-cols-1 gap-4 sm:gap-4 lg:grid-cols-2 lg:grid-rows-2 lg:auto-rows-[1fr] lg:gap-4 lg:min-h-[min(36rem,70vh)]">
                <BrandDashboardOptimization
                  className="min-h-0"
                  brandProfile={(brandProfile ?? null) as Record<string, unknown> | null}
                  isVerified={isVerified}
                  activeCampaigns={campaignStats.activeCampaigns}
                  draftCampaigns={campaignStats.draftCampaigns}
                  offerTotal={offerStats.total}
                  offerAccepted={offerStats.accepted}
                  walletLoadedTotal={walletOverview.loadedTotal}
                  totalClicks={totalClicks}
                  onNavigateToSection={setActiveMenu}
                />

                <Card className="flex h-full min-h-0 flex-col p-4 mac-surface transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(8,175,213,0.14)]">
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">Aktif ve Taslak Kampanyalar</h4>
                    <button className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-600 dark:text-gray-300"><Maximize2 size={14} /></button>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">
                  {currentCampaign ? (
                    <>
                      <div className="relative rounded-2xl overflow-hidden border border-gray-200/70 dark:border-gray-800/70 h-[220px]">
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundImage: currentCampaign.campaignImageURL
                              ? `url('${currentCampaign.campaignImageURL}')`
                              : 'linear-gradient(135deg, rgba(8,175,213,0.2), rgba(227,68,124,0.25))',
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/15" />
                        <div className="relative h-full p-4 flex flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-wider text-white/75 truncate">
                                {brandProfile?.brandName || 'MARKA'}
                              </p>
                              <p className="text-xl font-bold text-white leading-tight truncate">
                                {currentCampaign.title || currentCampaign.productInfo}
                              </p>
                            </div>
                            <Badge
                              className={
                                currentCampaign.status === 'aktif'
                                  ? 'bg-green-500/20 text-green-200 border border-green-300/30'
                                  : 'bg-amber-500/20 text-amber-200 border border-amber-300/30'
                              }
                            >
                              {isCampaignLive(currentCampaign) ? 'Aktif' : 'Taslak'}
                            </Badge>
                          </div>

                          <p className="mt-1 text-sm text-white/85 line-clamp-2">
                            {currentCampaign.campaignDescription || currentCampaign.productInfo || 'Aciklama girilmemis.'}
                          </p>

                          <div className="mt-auto grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-white/20 bg-black/35 px-3 py-2">
                              <p className="text-[10px] uppercase text-white/60">Butce</p>
                              <p className="text-sm font-semibold text-white">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(currentCampaign.budget?.total || 0)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/20 bg-black/35 px-3 py-2">
                              <p className="text-[10px] uppercase text-white/60">Ilgi</p>
                              <p className="text-sm font-semibold text-white truncate">
                                {(Array.isArray(currentCampaign.targetAudience?.productSubcategories) &&
                                currentCampaign.targetAudience.productSubcategories.length > 0
                                  ? currentCampaign.targetAudience.productSubcategories.join(', ')
                                  : currentCampaign.targetAudience?.interests) || '-'}
                              </p>
                            </div>
                          </div>

                          <Button
                            className="w-full mt-2 h-9 bg-[#08afd5] hover:bg-[#079bbd] text-white"
                            onClick={() => goToMenu('campaigns')}
                          >
                            Kampanya Detayini Ac
                          </Button>
                        </div>
                      </div>
                      {dashboardCampaigns.length > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-3">
                          <button type="button" onClick={() => setCampaignSlideIndex((p) => (p - 1 + dashboardCampaigns.length) % dashboardCampaigns.length)} className="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800 text-gray-500 dark:text-gray-400 transition-transform duration-200 hover:scale-110"><ChevronLeft size={16} className="mx-auto" /></button>
                          <button type="button" onClick={() => setCampaignSlideIndex((p) => (p + 1) % dashboardCampaigns.length)} className="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800 text-gray-500 dark:text-gray-400 transition-transform duration-200 hover:scale-110"><ChevronRight size={16} className="mx-auto" /></button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex min-h-[12rem] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      Aktif veya taslak kampanya bulunamadı.
                    </div>
                  )}
                  </div>
                </Card>

                <Card className="flex h-full min-h-0 flex-col p-4 mac-surface transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(8,175,213,0.14)]">
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">Aktif Çalışan Influencerlar</h4>
                    <button className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-600 dark:text-gray-300"><Maximize2 size={14} /></button>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">
                  {currentInfluencer ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openInfluencerProfile(currentInfluencer)}
                        className="w-full text-left rounded-2xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-gradient-to-br from-white to-[#08afd5]/10 dark:from-gray-900/80 dark:to-[#08afd5]/10 hover:border-[#08afd5]/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          {currentInfluencer.photoURL ? (
                            <img src={currentInfluencer.photoURL} alt={currentInfluencer.name} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-white flex items-center justify-center font-bold">{currentInfluencer.name.charAt(0).toUpperCase()}</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{currentInfluencer.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentInfluencer.email || 'Aktif is birligi'}</p>
                          </div>
                          <Badge className="bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/25 dark:text-[#6edff3]">Profil</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-900">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Ödenen Tutar</p>
                            <p className="font-bold text-[#08afd5] dark:text-[#6edff3]">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(currentInfluencer.paid)}</p>
                          </div>
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-900">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Etkileşim</p>
                            <p className="font-bold text-cyan-600 dark:text-cyan-400">{currentInfluencer.engagement.toLocaleString('tr-TR')}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(currentInfluencer.categories || []).slice(0, 3).map((cat) => (
                            <span key={cat} className="px-2.5 py-1 rounded-full text-[11px] bg-[#e3447c]/10 text-[#e3447c] dark:bg-[#e3447c]/20 dark:text-[#f59ab8]">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </button>
                      {activeInfluencers.length > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-3">
                          <button type="button" onClick={() => setInfluencerSlideIndex((p) => (p - 1 + activeInfluencers.length) % activeInfluencers.length)} className="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800 text-gray-500 dark:text-gray-400 transition-transform duration-200 hover:scale-110"><ChevronLeft size={16} className="mx-auto" /></button>
                          <button type="button" onClick={() => setInfluencerSlideIndex((p) => (p + 1) % activeInfluencers.length)} className="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800 text-gray-500 dark:text-gray-400 transition-transform duration-200 hover:scale-110"><ChevronRight size={16} className="mx-auto" /></button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex min-h-[12rem] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      Aktif çalışan influencer bulunamadı.
                    </div>
                  )}
                  </div>
                </Card>

                <Card className="flex h-full min-h-0 flex-col p-4 mac-surface transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(8,175,213,0.14)]">
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">Bütçe</h4>
                    <button className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-600 dark:text-gray-300"><Maximize2 size={14} /></button>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200/70 bg-white/90 p-4 dark:border-gray-800/70 dark:bg-gray-900/60">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-gray-200/70 dark:border-gray-700/70 bg-white dark:bg-gray-900 p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Güncel Bakiye</p>
                        <p className="text-xl font-bold text-[#08afd5] dark:text-[#6edff3]">{formatTRY(walletOverview.balance)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200/70 dark:border-gray-700/70 bg-white dark:bg-gray-900 p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Toplam Yüklenen</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatTRY(walletOverview.loadedTotal)}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-gray-200/70 dark:border-gray-700/70 bg-white dark:bg-gray-900 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Planlanan Bütçe</p>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{formatTRY(plannedBudget)}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Kullanım</p>
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mt-1">
                        <div className="h-2 rounded-full bg-gradient-to-r from-[#08afd5] to-[#e3447c] transition-all" style={{ width: `${budgetUsagePercent}%` }} />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Harcama</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{formatTRY(walletOverview.spentTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Kalan</span>
                          <span className="font-semibold text-[#08afd5] dark:text-[#6edff3]">{formatTRY(budgetRemaining)}</span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Bütçe Kullanımı</span>
                        <span className="font-semibold text-[#08afd5] dark:text-[#6edff3]">%{budgetUsagePercent}</span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-3 py-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Son Hareket:</span>{' '}
                      {latestWalletTx ? (
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {latestWalletTx.type === 'topup' ? 'Bütçe yüklendi' : latestWalletTx.type === 'payment' ? 'Ödeme kesildi' : 'Düzeltme'} • {formatTRY(Math.abs(latestWalletTx.amount))}
                        </span>
                      ) : (
                        <span className="font-medium text-gray-700 dark:text-gray-200">Henüz hareket yok</span>
                      )}
                    </div>
                  </div>
                </Card>
            </div>

            <DashboardMessagesWidget
              userId={brandId}
              userType="brand"
              onExpand={() => goToMenu('messages')}
            />
          </div>
        )}
        <Dialog open={influencerProfileOpen} onOpenChange={setInfluencerProfileOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle>Influencer Profili</DialogTitle>
              <DialogDescription>Aktif iş birliği detayları</DialogDescription>
            </DialogHeader>
            {influencerProfileLoading ? (
              <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Profil yükleniyor...</div>
            ) : expandedInfluencer ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/70 overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-[#08afd5]/25 via-[#08afd5]/10 to-[#e3447c]/20" />
                  <div className="px-4 pb-4 -mt-8">
                    <div className="flex items-end gap-3">
                      {expandedInfluencer.photoURL ? (
                        <img src={expandedInfluencer.photoURL} alt={expandedInfluencer.name} className="w-16 h-16 rounded-full object-cover border-4 border-white dark:border-gray-950" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-white flex items-center justify-center font-bold border-4 border-white dark:border-gray-950">
                          {expandedInfluencer.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{expandedInfluencer.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{expandedInfluencer.email || '-'}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                      {expandedInfluencer.bio?.trim() || 'Henüz biyografi eklenmemiş.'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/90 dark:bg-gray-900/70">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Bu İş Birliğinde Ödenen</p>
                    <p className="text-lg font-bold text-[#08afd5] dark:text-[#6edff3]">{formatTRY(expandedInfluencer.paid)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/90 dark:bg-gray-900/70">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Toplam Etkileşim</p>
                    <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{expandedInfluencer.engagement.toLocaleString('tr-TR')}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/90 dark:bg-gray-900/70">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Kategoriler</p>
                  <div className="flex flex-wrap gap-2">
                    {(expandedInfluencer.categories || []).length > 0 ? (
                      (expandedInfluencer.categories || []).map((cat) => (
                        <span key={cat} className="px-2.5 py-1 rounded-full text-xs bg-[#08afd5]/10 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#6edff3]">
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Kategori bilgisi yok</span>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/90 dark:bg-gray-900/70">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sosyal Medya</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {normalizeInfluencerPlatforms(expandedInfluencer.platforms).length > 0 ? (
                      normalizeInfluencerPlatforms(expandedInfluencer.platforms).map((p) => (
                        <div key={p.id} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{p.id}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">@{p.username || '-'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{(p.followers || 0).toLocaleString('tr-TR')} takipci</p>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Platform bilgisi yok</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Campaigns Content */}
        {activeMenu === 'campaigns' && (
          <CampaignsContent
            onCreateCampaign={() => {
              if (!isVerified) {
                notifyCampaignCreationRequiresVerification();
                goToMenu('settings');
                return;
              }
              resetNewCampaignForm();
              setCampaignProductTopCategory('');
              setCampaignProductSubSearch('');
              setIsCreateCampaignOpen(true);
            }}
            onEditCampaign={openEditCampaignModal}
            brandId={brandId}
            canOperate={isVerified}
            libraryRefreshKey={campaignLibraryRefreshKey}
          />
        )}

        {activeMenu === 'discover' && (
          <BrandInfluencerDiscoverContent
            brandId={brandId}
            campaigns={campaigns}
            canOperate={isVerified}
            onOpenInfluencerOfferModal={openDiscoverInfluencerOfferModal}
          />
        )}

        {/* Offers Content */}
        {activeMenu === 'offers' && (
          <BrandOffersContent brandId={brandId} canOperate={isVerified} focusOfferId={focusedOfferId} />
        )}

        {/* Tracking Links Content */}
        {activeMenu === 'tracking' && (
          <BrandTrackingLinksContent brandId={brandId} />
        )}

        {activeMenu === 'budget' && (
          <BudgetSpendingContent brandId={brandId} canOperate={isVerified} />
        )}

        {activeMenu === 'messages' && (
          <MessagesPanel
            userId={brandId}
            userType="brand"
            onOpenOffer={() => {
              setActiveMenu('offers');
            }}
          />
        )}

        {activeMenu === 'settings' && (
          <BrandSettingsContent
            brandId={brandId}
            brandProfile={(brandProfile ?? null) as Record<string, unknown> | null}
            onEditProfile={() => setProfileEditDialogOpen(true)}
            onEditSorumlu={() => setSorumluDialogOpen(true)}
            onLogout={handleSecureLogout}
            logoutBusy={logoutBusy}
          />
        )}

        {/* Empty State for other sections */}
        {activeMenu !== 'dashboard' &&
          activeMenu !== 'campaigns' &&
          activeMenu !== 'discover' &&
          activeMenu !== 'offers' &&
          activeMenu !== 'budget' &&
          activeMenu !== 'tracking' &&
          activeMenu !== 'messages' &&
          activeMenu !== 'settings' && (
            <div className="mt-12 max-w-2xl mx-auto text-center">
              <div className="aspect-[4/3] max-w-md mx-auto p-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm flex flex-col items-center justify-center">
                <div className="w-16 h-16 mb-4 rounded-[12px] bg-[#08afd5]/15 dark:bg-[#08afd5]/20 flex items-center justify-center">
                  <LayoutDashboard className="text-[#08afd5] dark:text-[#6edff3]" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {menuItems.find((item) => item.id === activeMenu)?.label}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Bu bölüm yakında aktif olacak
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {brandId ? (
        <>
          <BrandProfileEditDialog
            open={profileEditDialogOpen}
            onOpenChange={setProfileEditDialogOpen}
            brandId={brandId}
            brandProfile={(brandProfile ?? null) as Record<string, unknown> | null}
            onSaved={loadBrandProfile}
          />
          <BrandSorumluEditDialog
            open={sorumluDialogOpen}
            onOpenChange={setSorumluDialogOpen}
            brandId={brandId}
            brandProfile={(brandProfile ?? null) as Record<string, unknown> | null}
            onSaved={loadBrandProfile}
          />
          {discoverOffersModalCampaign ? (
            <InfluencerOffersModal
              isOpen={discoverOffersModalOpen}
              onClose={closeDiscoverInfluencerOfferModal}
              campaign={discoverOffersModalCampaign}
              brandId={brandId}
              initialSelectedInfluencerId={discoverOffersInfluencerId}
              canOperate={isVerified}
            />
          ) : null}
        </>
      ) : null}

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {isCreateCampaignOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[16px] border border-gray-200/50 bg-white shadow-2xl dark:border-gray-800/50 dark:bg-gray-900">
                {/* Modal Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-200/50 px-4 py-2.5 dark:border-gray-800/50 sm:px-5 sm:py-3">
                  <div className="min-w-0 pr-2">
                    <h3 className="text-lg font-bold leading-snug text-gray-900 dark:text-white sm:text-xl">
                      {editingCampaignId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya Oluştur'}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                      {editingCampaignId
                        ? 'Kayıtlı kampanya bilgilerini güncelleyin'
                        : 'Kampanya detaylarını girin'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X size={18} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="mac-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200/60 dark:border-gray-800/60 p-2 bg-white/80 dark:bg-gray-900/70 mb-4">
                        {([
                          { key: 'detail' as const, label: 'Kampanya Detayı', icon: <FileText size={16} /> },
                          { key: 'audience' as const, label: 'Hedef Kitle', icon: <UserRound size={16} /> },
                          { key: 'content' as const, label: 'İçerik', icon: <Image size={16} /> },
                        ] as const).map((step) => {
                          const enabled =
                            step.key === 'detail' ||
                            (step.key === 'audience' && canNavigateToCampaignAudience) ||
                            (step.key === 'content' && canNavigateToCampaignContent);
                          const stepDone =
                            (step.key === 'detail' && isCampaignDetailStepComplete) ||
                            (step.key === 'audience' && isCampaignAudienceStepComplete) ||
                            (step.key === 'content' && isCampaignContentStepComplete);
                          const blockedReason =
                            step.key === 'audience' && !canNavigateToCampaignAudience
                              ? 'Önce Kampanya Detayı adımını tamamlayın.'
                              : step.key === 'content' && !canNavigateToCampaignContent
                                ? 'Önce Kampanya Detayı ve Hedef Kitle adımlarını tamamlayın.'
                                : undefined;
                          return (
                            <button
                              key={step.key}
                              type="button"
                              disabled={!enabled}
                              title={!enabled ? blockedReason : stepDone ? 'Tamamlandı' : undefined}
                              onClick={() => {
                                if (!enabled) return;
                                setCampaignStep(step.key);
                              }}
                              className={`px-4 h-9 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none ${campaignStep === step.key
                                ? 'bg-[#08afd5] text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                                }`}
                            >
                              {step.icon}
                              {step.label}
                              {stepDone && campaignStep !== step.key ? (
                                <CheckCircle2 className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`${campaignStep === 'detail' ? '' : 'hidden'} p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900/60 space-y-4`}>
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Package size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
                            Kampanya Bilgileri
                          </h4>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Kampanya Adı *
                            </label>
                            <input
                              type="text"
                              value={campaignData.campaignName}
                              onChange={(e) =>
                                setCampaignData({ ...campaignData, campaignName: e.target.value })
                              }
                              className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
                              placeholder="Örn: Yaz Lansman Kampanyası"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Kampanya Açıklaması
                            </label>
                            <textarea
                              value={campaignData.campaignDescription}
                              onChange={(e) =>
                                setCampaignData({
                                  ...campaignData,
                                  campaignDescription: e.target.value,
                                })
                              }
                              rows={4}
                              className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all resize-none"
                              placeholder="Kampanyanın hedefi, içerik beklentisi ve mesaj notları"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Hedef *
                            </label>
                            <Select
                              value={campaignData.campaignGoal}
                              onValueChange={(value) =>
                                setCampaignData((prev) => ({ ...prev, campaignGoal: value }))
                              }
                            >
                              <SelectTrigger className="h-10 rounded-[10px]">
                                <SelectValue placeholder="Kampanya hedefi seç" />
                              </SelectTrigger>
                              <SelectContent>
                                {campaignGoals.map((goal) => (
                                  <SelectItem key={goal} value={goal}>
                                    {goal}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Kampanya görseli{' '}
                              <span className="font-normal text-gray-500 dark:text-gray-400">(isteğe bağlı)</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCampaignImageChange}
                              className="w-full px-4 py-2 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-[#08afd5]/15 file:text-[#08afd5] dark:file:bg-[#08afd5]/20 dark:file:text-[#6edff3]"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              JPG/PNG, maksimum 8MB. Yüklemezseniz varsayılan kampanya görseli kullanılır.
                            </p>
                          </div>
                        </div>

                        <div className={`${campaignStep === 'detail' ? '' : 'hidden'} p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900/60 space-y-4`}>
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Waypoints size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
                            Kampanya Modeli
                          </h4>
                          <div className="space-y-2">
                            {campaignModels.map((model) => (
                              <Tooltip key={model.id} delayDuration={200}>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCampaignData((prev) => {
                                        if (prev.campaignModel === model.id) return prev;
                                        return {
                                          ...prev,
                                          campaignModel: model.id,
                                          platforms: [],
                                          contentFormatCounts: {
                                            Story: 0,
                                            Reels: 0,
                                            Post: 0,
                                            Video: 0,
                                          },
                                        };
                                      });
                                      setUgcLineBasket([]);
                                      setCollabLineBasket([]);
                                    }}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${campaignData.campaignModel === model.id
                                      ? 'border-[#08afd5] bg-[#08afd5]/10 dark:bg-[#08afd5]/20'
                                      : 'border-gray-200 dark:border-gray-700 hover:border-[#08afd5]/60 dark:hover:border-[#08afd5]/60'
                                      }`}
                                  >
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                      {model.icon}
                                      {model.label}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {model.description}
                                    </p>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  align="center"
                                  sideOffset={10}
                                  className="max-w-[min(320px,calc(100vw-48px))] border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 px-3 py-2 text-xs leading-relaxed"
                                >
                                  {model.hoverDetail}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Görünürlük</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Açık olursa influencer keşfette görünür.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCampaignData((prev) => ({ ...prev, visibilityOpen: !prev.visibilityOpen }))}
                                className={`w-12 h-7 rounded-full p-1 transition ${campaignData.visibilityOpen ? 'bg-[#08afd5]' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                <span className={`block h-5 w-5 rounded-full bg-white transition ${campaignData.visibilityOpen ? 'translate-x-5' : ''}`} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Sabit Teklif</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Açık olursa karşı teklif kapalı olur.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCampaignData((prev) => ({ ...prev, fixedOffer: !prev.fixedOffer }))}
                                className={`w-12 h-7 rounded-full p-1 transition ${campaignData.fixedOffer ? 'bg-[#08afd5]' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                <span className={`block h-5 w-5 rounded-full bg-white transition ${campaignData.fixedOffer ? 'translate-x-5' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className={`${campaignStep === 'audience' ? 'md:col-span-2' : 'hidden'} p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900/60 space-y-4`}>
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <UserRound size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
                            Hedef Kitle
                          </h4>
                          <div className="space-y-3 max-w-3xl">
                            <div>
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Users size={16} className="text-[#08afd5]" />
                                Cinsiyet *
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { label: 'Kadın', value: 'female' },
                                  { label: 'Erkek', value: 'male' },
                                  { label: 'Herkes', value: 'all' },
                                ].map((g) => (
                                  <button
                                    type="button"
                                    key={g.value}
                                    onClick={() => setCampaignData((prev) => ({ ...prev, gender: g.value as 'female' | 'male' | 'all' }))}
                                    className={`px-3 py-1.5 rounded-[10px] text-sm border ${campaignData.gender === g.value ? 'bg-[#08afd5] border-[#08afd5] text-white' : 'bg-white dark:bg-gray-800 border-gray-300/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300'}`}
                                  >
                                    {g.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Yaş Aralığı *
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                                <input
                                  type="number"
                                  min={13}
                                  value={campaignData.minAge}
                                  onChange={(e) =>
                                    setCampaignData({ ...campaignData, minAge: e.target.value })
                                  }
                                  className="w-full h-10 px-3 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
                                  placeholder="Min yaş"
                                />
                                <input
                                  type="number"
                                  min={13}
                                  value={campaignData.maxAge}
                                  onChange={(e) =>
                                    setCampaignData({ ...campaignData, maxAge: e.target.value })
                                  }
                                  className="w-full h-10 px-3 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
                                  placeholder="Max yaş"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Ürün (alt kategori) *
                              </label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Önce üst kategoriyi seçin; ardından bu alandaki alt kategorilerden en fazla{' '}
                                {MAX_PRODUCT_SUBCATEGORIES} tanesini işaretleyin. Arama yalnızca seçili üst kategorinin alt
                                listesinde filtre uygular.
                              </p>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                                    Üst kategori *
                                  </label>
                                  <Select
                                    value={campaignProductTopCategory || undefined}
                                    onValueChange={(v) => {
                                      setCampaignProductTopCategory(v);
                                      setCampaignProductSubSearch('');
                                    }}
                                  >
                                    <SelectTrigger className="h-10 max-w-xl rounded-[10px]">
                                      <SelectValue placeholder="Üst kategori seçin" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[min(280px,50vh)]">
                                      {campaignTopCategoryOptions.map((top) => (
                                        <SelectItem key={top} value={top}>
                                          {top}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label
                                    className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block flex items-center gap-1.5"
                                    htmlFor="campaign-product-sub-search"
                                  >
                                    <Search className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                    Alt kategorilerde ara
                                  </label>
                                  <input
                                    id="campaign-product-sub-search"
                                    type="search"
                                    autoComplete="off"
                                    disabled={!campaignProductTopCategory}
                                    placeholder={
                                      campaignProductTopCategory
                                        ? 'Örn: makyaj, akıllı telefon…'
                                        : 'Önce üst kategori seçin'
                                    }
                                    value={campaignProductSubSearch}
                                    onChange={(e) => setCampaignProductSubSearch(e.target.value)}
                                    className="w-full max-w-xl h-10 px-3 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </div>
                                {campaignData.productSubcategories.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {campaignData.productSubcategories.map((sub) => (
                                      <span
                                        key={sub}
                                        className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg text-xs font-medium border border-[#08afd5]/50 bg-[#08afd5]/15 text-[#0790b3] dark:text-[#6edff3]"
                                      >
                                        {sub}
                                        <button
                                          type="button"
                                          onClick={() => toggleProductSubcategory(sub)}
                                          className="p-0.5 rounded-md hover:bg-[#08afd5]/25"
                                          aria-label={`${sub} kaldır`}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/50 dark:bg-gray-950/40 p-2 mac-scrollbar">
                                  {!campaignProductTopCategory ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center px-2">
                                      Alt kategorileri görmek için üst kategori seçin.
                                    </p>
                                  ) : campaignProductFilteredSubs.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center px-2">
                                      Bu arama veya üst kategori için sonuç yok.
                                    </p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {campaignProductFilteredSubs.map((sub) => {
                                        const selected = campaignData.productSubcategories.includes(sub);
                                        const atProductCap =
                                          campaignData.productSubcategories.length >= MAX_PRODUCT_SUBCATEGORIES &&
                                          !selected;
                                        return (
                                          <button
                                            key={sub}
                                            type="button"
                                            onClick={() => toggleProductSubcategory(sub)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left max-w-full ${selected
                                              ? 'bg-[#08afd5] border-[#08afd5] text-white'
                                              : atProductCap
                                                ? 'opacity-45 cursor-not-allowed border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-500'
                                                : 'bg-white dark:bg-gray-800/90 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-[#08afd5]/50'
                                              }`}
                                          >
                                            {sub}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                {campaignData.productSubcategories.length} / {MAX_PRODUCT_SUBCATEGORIES} alt kategori seçildi
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Ülkeler / Şehirler *
                              </label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Türkiye geneli veya illerden seçin (en fazla {MAX_LOCATION_PICKS} konum). Listede 81 il yer
                                alır.
                              </p>
                              <select
                                className="w-full max-w-xl h-10 px-3 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent disabled:opacity-60"
                                value=""
                                disabled={campaignData.location.length >= MAX_LOCATION_PICKS}
                                aria-label="Konum ekle"
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v) {
                                    addCampaignLocation(v);
                                    e.target.value = '';
                                  }
                                }}
                              >
                                <option value="">
                                  {campaignData.location.length >= MAX_LOCATION_PICKS
                                    ? 'En fazla 3 konum seçildi'
                                    : 'Konum ekleyin...'}
                                </option>
                                {campaignLocationChoices
                                  .filter((item) => !campaignData.location.includes(item))
                                  .map((item) => (
                                    <option key={item} value={item}>
                                      {item}
                                    </option>
                                  ))}
                              </select>
                              {campaignData.location.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {campaignData.location.map((loc) => (
                                    <span
                                      key={loc}
                                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-[10px] text-sm border border-gray-300/50 dark:border-gray-600 bg-white/80 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200"
                                    >
                                      {loc}
                                      <button
                                        type="button"
                                        onClick={() => removeCampaignLocation(loc)}
                                        className="p-0.5 rounded-md hover:bg-gray-200/80 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                        aria-label={`${loc} kaldır`}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                {campaignData.location.length} / {MAX_LOCATION_PICKS} konum seçildi
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className={`${campaignStep === 'content' ? '' : 'hidden'} p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900/60 space-y-4`}>
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <WalletCards size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
                            İçerik ve Zamanlama
                          </h4>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              İçerik Detayları *
                            </label>
                            <textarea
                              value={campaignData.contentDetails}
                              onChange={(e) =>
                                setCampaignData((prev) => ({ ...prev, contentDetails: e.target.value }))
                              }
                              rows={4}
                              className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                              placeholder="İçerik detaylarını yazın"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Ortalama Influencer Bütçesi (₺) *
                            </label>
                            <input
                              type="number"
                              value={campaignData.influencerBudget}
                              onChange={(e) =>
                                setCampaignData({ ...campaignData, influencerBudget: e.target.value })
                              }
                              className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
                              placeholder="Örn: 5000"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Son Başvuru Tarihi *
                            </label>
                            <input
                              type="date"
                              value={campaignData.applicationDeadline}
                              max={
                                maxApplicationDeadlineFromPublishEnd(campaignData.publishEndDate) ?? undefined
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                setCampaignData((prev) => {
                                  const cap = maxApplicationDeadlineFromPublishEnd(prev.publishEndDate);
                                  const nextDeadline =
                                    cap && v && v > cap ? cap : v;
                                  return { ...prev, applicationDeadline: nextDeadline };
                                });
                              }}
                              className="w-full px-3 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                            {campaignData.publishEndDate ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                En geç: son paylaşım bitişinden bir gün önce (bitiş{' '}
                                {campaignData.publishEndDate.replace(/^\d{4}-(\d{2})-(\d{2})$/, '$2.$1')} → başvuru
                                en geç{' '}
                                {maxApplicationDeadlineFromPublishEnd(
                                  campaignData.publishEndDate
                                )?.replace(/^\d{4}-(\d{2})-(\d{2})$/, '$2.$1') ?? '—'}
                                ).
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                Son paylaşım bitiş tarihini seçtikten sonra üst sınır uygulanır.
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Son Paylaşım Başlangıç *
                              </label>
                              <input
                                type="date"
                                value={campaignData.publishStartDate}
                                onChange={(e) =>
                                  setCampaignData({ ...campaignData, publishStartDate: e.target.value })
                                }
                                className="w-full px-3 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Son Paylaşım Bitiş *
                              </label>
                              <input
                                type="date"
                                value={campaignData.publishEndDate}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCampaignData((prev) => {
                                    const next = { ...prev, publishEndDate: v };
                                    const cap = maxApplicationDeadlineFromPublishEnd(v);
                                    if (cap && next.applicationDeadline && next.applicationDeadline > cap) {
                                      next.applicationDeadline = cap;
                                    }
                                    return next;
                                  });
                                }}
                                className="w-full px-3 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        <div className={`${campaignStep === 'content' ? 'md:col-start-2 self-start space-y-3' : 'hidden'}`}>
                          {campaignData.campaignModel === 'ugc_video' ? (
                            <div className="p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900/60 space-y-4">
                              <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Video size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
                                Video talepleri
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Görüntü oranı ve süreyi seçin, &quot;Ekle&quot; ile sepete atın. Her satır, bir influencer
                                için istenen bir videoyu temsil eder; farklı oran / sürelerle tekrarlayın.
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Görüntü oranı</label>
                                  <select
                                    value={ugcAspectDraft}
                                    onChange={(e) => setUgcAspectDraft(e.target.value)}
                                    className="w-full h-9 px-2 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                                  >
                                    {UGC_ASPECT_RATIOS.map((r) => (
                                      <option key={r} value={r}>
                                        {r}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Süre</label>
                                  <select
                                    value={ugcDurationDraftSec}
                                    onChange={(e) => setUgcDurationDraftSec(Number(e.target.value))}
                                    className="w-full h-9 px-2 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                                  >
                                    {UGC_DURATION_PRESETS.map((p) => (
                                      <option key={p.sec} value={p.sec}>
                                        {p.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={addUgcToBasket}
                                className="w-full brand-btn-primary text-white h-9 gap-2"
                              >
                                <Plus size={16} /> Ekle
                              </Button>
                              {ugcLineBasket.length > 0 && (
                                <ul className="space-y-2 text-sm">
                                  {ugcLineBasket.map((row) => (
                                    <li
                                      key={row.id}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5 bg-gray-50/80 dark:bg-gray-800/50"
                                    >
                                      <span className="text-gray-800 dark:text-gray-200">
                                        {row.aspectRatio} · {formatDurationShort(row.durationSec)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => removeUgcFromBasket(row.id)}
                                        className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                                        aria-label="Kaldır"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="p-3 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900/60 space-y-3">
                                <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  <Smartphone size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
                                  Video talepleri (platform + format)
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Platform ve içerik formatını seçin, &quot;Ekle&quot; ile sepete ekleyin. Örn. bir satır
                                  Instagram Reels, başka satır YouTube Video.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Platform</label>
                                    <select
                                      value={collabPlatformDraft}
                                      onChange={(e) => setCollabPlatformDraft(e.target.value)}
                                      className="w-full h-9 px-2 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                                    >
                                      {REGISTRATION_PLATFORM_DEFS.map(({ id, label }) => (
                                        <option key={id} value={label}>
                                          {label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">İçerik formatı</label>
                                    <select
                                      value={collabFormatDraft}
                                      onChange={(e) => setCollabFormatDraft(e.target.value)}
                                      className="w-full h-9 px-2 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                                    >
                                      {contentFormats.map((f) => (
                                        <option key={f} value={f}>
                                          {f}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  onClick={addCollabToBasket}
                                  className="w-full brand-btn-primary text-white h-9 gap-2"
                                >
                                  <Plus size={16} /> Ekle
                                </Button>
                                {collabLineBasket.length > 0 && (
                                  <ul className="space-y-2 text-sm">
                                    {collabLineBasket.map((row) => {
                                      const pid = REGISTRATION_PLATFORM_DEFS.find((p) => p.label === row.platform)?.id ?? 'instagram';
                                      return (
                                        <li
                                          key={row.id}
                                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5 bg-gray-50/80 dark:bg-gray-800/50"
                                        >
                                          <span className="flex items-center gap-2 min-w-0 text-gray-800 dark:text-gray-200">
                                            <RegistrationPlatformIcon platformId={pid} size={14} />
                                            <span className="truncate">
                                              {row.platform} — {row.contentFormat}
                                            </span>
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => removeCollabFromBasket(row.id)}
                                            className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 shrink-0"
                                            aria-label="Kaldır"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900/60 p-4 h-fit xl:sticky xl:top-0">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                        Kampanya Önizleme
                      </h4>
                      <div className="rounded-xl overflow-hidden border border-gray-200/70 dark:border-gray-700/70 bg-gray-100 dark:bg-gray-800">
                        <div className="relative aspect-[4/3]">
                          <img
                            src={
                              campaignImagePreview ||
                              editingCampaignImageUrl ||
                              DEFAULT_CAMPAIGN_PREVIEW_IMAGE
                            }
                            alt="Kampanya önizleme"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-white text-lg font-semibold line-clamp-1">
                                {campaignData.campaignName || 'Kampanya Adı'}
                              </h5>
                              <Badge className="bg-[#08afd5]/90 text-white border-0">
                                {editingCampaignId && editingCampaignStatus
                                  ? editingCampaignStatus === 'aktif'
                                    ? 'Aktif'
                                    : editingCampaignStatus === 'taslak'
                                      ? 'Taslak'
                                      : editingCampaignStatus === 'tamamlandı'
                                        ? 'Tamamlandı'
                                        : editingCampaignStatus === 'iptal'
                                          ? 'İptal'
                                          : editingCampaignStatus
                                  : 'Taslak'}
                              </Badge>
                            </div>
                            <p className="text-white/85 text-xs mt-1 line-clamp-2">
                              {campaignData.campaignDescription || 'Kampanya açıklaması burada görünecek.'}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 space-y-2 bg-white/95 dark:bg-gray-900/95">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                              <p className="text-gray-500 dark:text-gray-400">Model</p>
                              <p className="font-semibold text-gray-800 dark:text-gray-100">
                                {getCampaignModelLabel(campaignData.campaignModel)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                              <p className="text-gray-500 dark:text-gray-400">Bütçe</p>
                              <p className="font-semibold text-gray-800 dark:text-gray-100">
                                {campaignData.influencerBudget
                                  ? new Intl.NumberFormat('tr-TR', {
                                    style: 'currency',
                                    currency: 'TRY',
                                    minimumFractionDigits: 0,
                                  }).format(Number(campaignData.influencerBudget))
                                  : 'Belirtilmedi'}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-xs">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Hedef ve Ayarlar</p>
                            <p className="text-gray-800 dark:text-gray-100 line-clamp-1">
                              Hedef:{' '}
                              {formatCampaignGoalLabel(campaignData.campaignGoal) || 'Belirtilmedi'}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">Görünürlük: {campaignData.visibilityOpen ? 'Açık' : 'Kapalı'}</p>
                            <p className="text-gray-800 dark:text-gray-100">Sabit teklif: {campaignData.fixedOffer ? 'Açık' : 'Kapalı'}</p>
                          </div>
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-xs">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Hedef Kitle</p>
                            <p className="text-gray-800 dark:text-gray-100">
                              Yaş: {campaignData.minAge || '-'} / {campaignData.maxAge || '-'}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              Cinsiyet: {campaignData.gender === 'female' ? 'Kadın' : campaignData.gender === 'male' ? 'Erkek' : 'Herkes'}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100 line-clamp-1">
                              Lokasyon: {campaignData.location.join(', ') || 'Belirtilmedi'}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100 line-clamp-2 mt-1">
                              Ürün:{' '}
                              {campaignData.productSubcategories.length > 0
                                ? campaignData.productSubcategories.join(', ')
                                : 'Belirtilmedi'}
                            </p>
                          </div>
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-xs">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">
                              {campaignData.campaignModel === 'ugc_video' ? 'Video talepleri' : 'Platform + içerik'}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100 line-clamp-2">
                              {formatContentLinesSummary({
                                campaignModel: campaignData.campaignModel,
                                contentLines:
                                  campaignData.campaignModel === 'ugc_video' ? ugcLineBasket : collabLineBasket,
                              }) || 'Henüz eklenmedi'}
                            </p>
                          </div>
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-xs">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">İçerik ve Tarih</p>
                            <p className="text-gray-800 dark:text-gray-100">Son başvuru: {campaignData.applicationDeadline || '-'}</p>
                            <p className="text-gray-800 dark:text-gray-100 line-clamp-1">
                              Paylaşım: {campaignData.publishStartDate || '-'} - {campaignData.publishEndDate || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200/50 px-4 py-2.5 dark:border-gray-800/50 sm:gap-3 sm:px-5 sm:py-3">
                  <Button
                    onClick={handleCloseModal}
                    variant="outline"
                    className="h-10 w-10 shrink-0 rounded-[10px] p-0"
                    title="İptal"
                    disabled={isSaving}
                  >
                    <X size={18} />
                  </Button>
                  <Button
                    onClick={handleSaveCampaign}
                    disabled={isSaving || !isCampaignFormFullyValid}
                    title={
                      !isCampaignFormFullyValid
                        ? 'Kayıt için üç adımın da eksiksiz doldurulması gerekir'
                        : editingCampaignId
                          ? 'Değişiklikleri Kaydet'
                          : 'Kampanyayı Kaydet'
                    }
                    className="brand-btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] p-0 text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={20} />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MacOS Style Scrollbar */}
      <style>{`
        .mac-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .mac-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .mac-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .dark .mac-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .mac-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
          background-clip: padding-box;
        }
        .dark .mac-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
          background-clip: padding-box;
        }
      `}</style>
    </div>
  );
}
