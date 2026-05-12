import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Activity, AlertCircle, Award, BarChart3, BadgeCheck, Bell, Banknote, Briefcase, Camera, CheckCircle2, ChevronLeft, ChevronRight, Clock, Compass, Edit, Instagram, LayoutDashboard, Lightbulb, ListChecks, MapPin, Maximize2, Minimize2, MessageSquare, Plus, ShieldCheck, Target, Trash2, TrendingUp, Upload, User, X, XCircle, Youtube, Zap, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { SiPinterest, SiSnapchat, SiTwitch, SiKick, SiLinkedin } from 'react-icons/si';
import { useIsMobile } from '@/hooks/use-mobile';
import { InfluencerProfile, updateInfluencerProfile, uploadProfilePhoto } from '@/services/firebaseInfluencerService';
import { uploadPortfolioFile, deletePortfolioFile } from '@/services/firebaseStorageService';
import { InfluencerProfileEditForm } from './InfluencerProfileEditForm';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { submitVerificationRequest } from '@/services/firebaseVerificationService';
import { isUserVerified } from '@/services/firebaseAuthService';
import { ActiveCampaign, getAllActiveCampaigns } from '@/services/firebaseCampaignService';
import { CampaignsContent } from './CampaignsContent';
import { DashboardMessagesWidget } from '@/components/shared/DashboardMessagesWidget';
import { CollapsibleWidget } from '@/components/shared/CollapsibleWidget';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCampaignModelLabel } from '@/lib/campaignModelLabels';
import { isAudienceMatchComplete } from '@/lib/influencerAudienceMatch';

const TikTokIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>;
const TwitterIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>;

interface ProfileHeroStats { completedCampaigns:number; totalEarnings:number; totalEngagement:number; pendingOffers:number; acceptedOffers:number; revisionRequests:number; }
interface ProfileHeroProps {
  profileData: InfluencerProfile | null;
  stats: ProfileHeroStats;
  onProfileUpdate?: () => void;
  onNotificationClick?: (t: 'pending' | 'content' | 'revision') => void;
  onOpenMessages?: () => void;
  /** Hedef kitle anketi (diyalog üst düzeyde; ayarlar / profil düzenle bu callback ile açar) */
  onOpenAudienceMatch?: () => void;
  canOperate?: boolean;
  isMobile?: boolean;
  /** Ayarlar vb. dışından aynı “Profili Düzenle” diyaloğunu açmak için (ikisi birden verilirse kontrollü mod) */
  profileEditDialogOpen?: boolean;
  onProfileEditDialogOpenChange?: (open: boolean) => void;
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram size={16} />,
  tiktok: <TikTokIcon />,
  youtube: <Youtube size={16} />,
  twitter: <TwitterIcon />,
  pinterest: <SiPinterest size={16} />,
  snapchat: <SiSnapchat size={16} />,
  twitch: <SiTwitch size={16} />,
  kick: <SiKick size={16} />,
  linkedin: <SiLinkedin size={16} />,
};

const fmtN = (n:number)=> n>=1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n>=1_000 ? (n/1_000).toFixed(1)+'K' : `${n}`;
const fmtP = (n:number)=> new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',minimumFractionDigits:0}).format(n);

export function ProfileHero({
  profileData,
  stats,
  onProfileUpdate,
  onNotificationClick,
  onOpenMessages,
  canOperate = true,
  isMobile: isMobileProp,
  profileEditDialogOpen: profileEditDialogOpenProp,
  onProfileEditDialogOpenChange,
  onOpenAudienceMatch,
}: ProfileHeroProps) {
  const { toast } = useToast();
  const isMobileHook = useIsMobile();
  const isMobile = isMobileProp ?? isMobileHook;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verificationInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const [isUploading,setIsUploading]=useState(false);
  const [verificationUploading,setVerificationUploading]=useState(false);
  const [verificationModalOpen,setVerificationModalOpen]=useState(false);
  const [verificationPreview,setVerificationPreview]=useState<string|null>(null);
  const [isEditing,setIsEditing]=useState(false);
  const [aboutText,setAboutText]=useState('');
  const [portfolioItems,setPortfolioItems]=useState<Array<{url: string; type: 'image' | 'pdf'; name: string; storagePath?: string}>>([]);
  const [portfolioUploading,setPortfolioUploading]=useState(false);
  const [isSaving,setIsSaving]=useState(false);
  const [profileTab,setProfileTab]=useState<'about'|'social'|'portfolio'>('about');
  const [generalEditOpenUncontrolled, setGeneralEditOpenUncontrolled] = useState(false);
  const profileEditControlled =
    profileEditDialogOpenProp !== undefined && onProfileEditDialogOpenChange !== undefined;
  const generalEditOpen = profileEditControlled ? profileEditDialogOpenProp! : generalEditOpenUncontrolled;
  const setGeneralEditOpen = (open: boolean) => {
    if (profileEditControlled) {
      onProfileEditDialogOpenChange!(open);
    } else {
      setGeneralEditOpenUncontrolled(open);
    }
  };
  const [expandedPanel,setExpandedPanel]=useState<'tab'|'discover'|'stats'|'analytics'|null>(null);
  const [discoverCampaigns, setDiscoverCampaigns] = useState<ActiveCampaign[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverIndex, setDiscoverIndex] = useState(0);
  const [analyticsRange, setAnalyticsRange] = useState<'7g' | '30g' | '90g'>('30g');
  const [notificationsCollapsed, setNotificationsCollapsed] = useState(false);
  const [widgetCollapsed, setWidgetCollapsed] = useState<Record<string, boolean>>({});
  const [optimizationModalOpen, setOptimizationModalOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  const isVerified = isUserVerified(profileData?.status);
  const isVerificationPending = profileData?.verificationRequestStatus === 'beklemede';
  const isVerificationRejected = profileData?.verificationRequestStatus === 'reddedildi';
  const audienceMatchComplete = isAudienceMatchComplete(profileData);
  const hasProfilePhoto = Boolean(profileData?.profilePhotoURL);
  const setupComplete = hasProfilePhoto && isVerified && audienceMatchComplete;

  // Optimizasyon skoru hesaplama
  const calculateOptimizationScore = useMemo(() => {
    if (!profileData) return { 
      score: 0, 
      message: 'Profil yükleniyor...', 
      suggestions: [],
      metrics: []
    };
    
    let score = 0;
    const maxScore = 100;
    const suggestions: string[] = [];
    const metrics: Array<{
      name: string;
      maxPoints: number;
      points: number;
      completed: boolean;
      description: string;
      status: string;
    }> = [];
    
    // 1. Profil doğrulama (20 puan)
    const verificationPoints = isVerified ? 20 : 0;
    score += verificationPoints;
    metrics.push({
      name: 'Profil Doğrulama',
      maxPoints: 20,
      points: verificationPoints,
      completed: isVerified,
      description: isVerified ? 'Doğrulanmış: +20' : 'Doğrulanmamış: +0',
      status: isVerified ? 'Tamamlandı' : 'Tamamlanmadı',
    });
    if (!isVerified) {
      suggestions.push('Profil doğrulaması yaparak güvenilirliğini artır');
    }
    
    // 2. Profil fotoğrafı (10 puan)
    const hasPhoto = !!profileData.profilePhotoURL;
    const photoPoints = hasPhoto ? 10 : 0;
    score += photoPoints;
    metrics.push({
      name: 'Profil Fotoğrafı',
      maxPoints: 10,
      points: photoPoints,
      completed: hasPhoto,
      description: hasPhoto ? 'Var: +10' : 'Yok: +0',
      status: hasPhoto ? 'Tamamlandı' : 'Tamamlanmadı',
    });
    if (!hasPhoto) {
      suggestions.push('Profil fotoğrafı ekle');
    }
    
    // 3. Bio/Hakkında (10 puan)
    const bioLength = profileData.bio?.trim().length || 0;
    const bioPoints = bioLength > 50 ? 10 : 0;
    score += bioPoints;
    metrics.push({
      name: 'Bio/Hakkında',
      maxPoints: 10,
      points: bioPoints,
      completed: bioLength > 50,
      description: bioLength > 50 ? '50+ karakter: +10' : 'Yok/kısa: +0',
      status: bioLength > 50 ? 'Tamamlandı' : bioLength > 0 ? 'Kısmen tamamlandı' : 'Tamamlanmadı',
    });
    if (bioLength <= 50) {
      suggestions.push('Hakkında bölümünü doldur (en az 50 karakter)');
    }
    
    // 4. Platformlar (15 puan)
    const platforms = profileData.platforms;
    const platformCount = Array.isArray(platforms) 
      ? platforms.length 
      : platforms && typeof platforms === 'object' 
        ? Object.keys(platforms).length 
        : 0;
    let platformPoints = 0;
    if (platformCount >= 2) {
      platformPoints = 15;
    } else if (platformCount === 1) {
      platformPoints = 8;
    }
    score += platformPoints;
    metrics.push({
      name: 'Platformlar',
      maxPoints: 15,
      points: platformPoints,
      completed: platformCount >= 2,
      description: platformCount >= 2 ? '2+ platform: +15' : platformCount === 1 ? '1 platform: +8' : 'Yok: +0',
      status: platformCount >= 2 ? 'Tamamlandı' : platformCount === 1 ? 'Kısmen tamamlandı' : 'Tamamlanmadı',
    });
    if (platformCount < 2) {
      suggestions.push(platformCount === 1 ? 'En az 2 platform ekle' : 'Sosyal medya platformlarını ekle');
    }
    
    // 5. Kategoriler (10 puan)
    const categoryCount = profileData.categories?.length || 0;
    let categoryPoints = 0;
    if (categoryCount >= 3) {
      categoryPoints = 10;
    } else if (categoryCount >= 1) {
      categoryPoints = 5;
    }
    score += categoryPoints;
    metrics.push({
      name: 'Kategoriler',
      maxPoints: 10,
      points: categoryPoints,
      completed: categoryCount >= 3,
      description: categoryCount >= 3 ? '3+ kategori: +10' : categoryCount >= 1 ? '1-2 kategori: +5' : 'Yok: +0',
      status: categoryCount >= 3 ? 'Tamamlandı' : categoryCount >= 1 ? 'Kısmen tamamlandı' : 'Tamamlanmadı',
    });
    if (categoryCount < 3) {
      suggestions.push(categoryCount >= 1 ? 'En az 3 kategori seç' : 'İlgi alanı kategorilerini seç');
    }
    
    // 6. Portfolyo (15 puan)
    const portfolioCount = profileData.portfolio?.length || 0;
    let portfolioPoints = 0;
    if (portfolioCount >= 3) {
      portfolioPoints = 15;
    } else if (portfolioCount >= 1) {
      portfolioPoints = 8;
    }
    score += portfolioPoints;
    metrics.push({
      name: 'Portfolyo',
      maxPoints: 15,
      points: portfolioPoints,
      completed: portfolioCount >= 3,
      description: portfolioCount >= 3 ? '3+ örnek: +15' : portfolioCount >= 1 ? '1-2 örnek: +8' : 'Yok: +0',
      status: portfolioCount >= 3 ? 'Tamamlandı' : portfolioCount >= 1 ? 'Kısmen tamamlandı' : 'Tamamlanmadı',
    });
    if (portfolioCount < 3) {
      suggestions.push(portfolioCount >= 1 ? 'Daha fazla portfolyo örneği ekle (en az 3)' : 'Portfolyo örnekleri ekle');
    }
    
    // 7. Ücretler/Fiyatlandırma (15 puan)
    const pricing = profileData.contentPricing;
    const hasPricing = pricing && (
      (pricing.post && pricing.post > 0) ||
      (pricing.story && pricing.story > 0) ||
      (pricing.reels && pricing.reels > 0) ||
      (pricing.video && pricing.video > 0)
    );
    let pricingPoints = 0;
    if (hasPricing) {
      const pricingCount = [
        pricing?.post,
        pricing?.story,
        pricing?.reels,
        pricing?.video,
      ].filter(p => p && p > 0).length;
      
      if (pricingCount >= 3) {
        pricingPoints = 15;
      } else if (pricingCount >= 2) {
        pricingPoints = 10;
      } else {
        pricingPoints = 5;
      }
    }
    score += pricingPoints;
    const pricingCount = hasPricing ? [
      pricing?.post,
      pricing?.story,
      pricing?.reels,
      pricing?.video,
    ].filter(p => p && p > 0).length : 0;
    metrics.push({
      name: 'Ücretler/Fiyatlandırma',
      maxPoints: 15,
      points: pricingPoints,
      completed: pricingCount >= 3,
      description: pricingCount >= 3 ? '3+ format: +15' : pricingCount === 2 ? '2 format: +10' : pricingCount === 1 ? '1 format: +5' : 'Yok: +0',
      status: pricingCount >= 3 ? 'Tamamlandı' : pricingCount >= 1 ? 'Kısmen tamamlandı' : 'Tamamlanmadı',
    });
    if (pricingCount < 3) {
      suggestions.push(pricingCount >= 1 ? 'Tüm içerik formatları için ücret belirle' : 'İçerik ücretlerini belirle');
    }
    
    // 8. Platform takipçi sayıları (5 puan)
    let hasFollowers = false;
    if (Array.isArray(platforms)) {
      hasFollowers = platforms.some(p => p.followers && p.followers > 0);
    } else if (platforms && typeof platforms === 'object') {
      hasFollowers = Object.values(platforms).some((p: any) => p?.followers && p.followers > 0);
    }
    const followersPoints = hasFollowers ? 5 : 0;
    score += followersPoints;
    metrics.push({
      name: 'Takipçi Sayıları',
      maxPoints: 5,
      points: followersPoints,
      completed: hasFollowers,
      description: hasFollowers ? 'En az bir platformda var: +5' : 'Yok: +0',
      status: hasFollowers ? 'Tamamlandı' : 'Tamamlanmadı',
    });
    if (!hasFollowers) {
      suggestions.push('Platform takipçi sayılarını ekle');
    }
    
    // Skor mesajı belirleme
    let message = '';
    if (score >= 90) {
      message = 'Mükemmel! Profilin tamamen optimize edilmiş.';
    } else if (score >= 75) {
      message = 'Güçlü profil, küçük iyileştirmelerle daha da iyi olabilir.';
    } else if (score >= 60) {
      message = 'İyi başlangıç, eksikleri tamamlayarak skorunu artırabilirsin.';
    } else if (score >= 40) {
      message = 'Profil eksikleri var, önerileri takip ederek geliştirebilirsin.';
    } else {
      message = 'Profil henüz tamamlanmamış, eksikleri tamamlaman gerekiyor.';
    }
    
    return {
      score: Math.min(score, maxScore),
      message,
      suggestions: suggestions.slice(0, 3), // En fazla 3 öneri göster
      metrics,
    };
  }, [profileData, isVerified]);

  useEffect(()=>{ 
    setAboutText(profileData?.bio||''); 
    // Portfolio verilerini yükle - eski string[] formatını da destekle
    if (profileData?.portfolio) {
      if (Array.isArray(profileData.portfolio)) {
        const portfolio = profileData.portfolio as any[];
        // Eğer string array ise (eski format), yeni formata çevir
        if (portfolio.length > 0 && typeof portfolio[0] === 'string') {
          setPortfolioItems([]); // Eski formatı temizle
        } else {
          setPortfolioItems(portfolio as Array<{url: string; type: 'image' | 'pdf'; name: string; storagePath?: string}>);
        }
      }
    } else {
      setPortfolioItems([]);
    }
  },[profileData?.bio, profileData?.portfolio]);
  useEffect(() => {
    const loadDiscoverCampaigns = async () => {
      try {
        setDiscoverLoading(true);
        const campaigns = await getAllActiveCampaigns();
        setDiscoverCampaigns(campaigns.slice(0, 3));
      } catch {
        setDiscoverCampaigns([]);
      } finally {
        setDiscoverLoading(false);
      }
    };
    loadDiscoverCampaigns();
  }, []);
  useEffect(() => {
    if (discoverCampaigns.length === 0) {
      setDiscoverIndex(0);
      return;
    }
    if (discoverIndex > discoverCampaigns.length - 1) {
      setDiscoverIndex(0);
    }
  }, [discoverCampaigns, discoverIndex]);

  const heroCoverImage =
    profileData?.profilePhotoURL ||
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80';

  const totalOffers = stats.pendingOffers + stats.acceptedOffers;
  const acceptanceRate = totalOffers > 0 ? Math.round((stats.acceptedOffers / totalOffers) * 100) : 0;
  const completionRate = totalOffers > 0 ? Math.round((stats.completedCampaigns / totalOffers) * 100) : 0;
  const engagementPerCampaign =
    stats.completedCampaigns > 0 ? Math.round(stats.totalEngagement / stats.completedCampaigns) : stats.totalEngagement;
  const compareEngagement = Math.min(100, Math.max(8, Math.round((stats.totalEngagement / 100000) * 100)));
  const compareCampaigns = Math.min(100, Math.max(8, Math.round((stats.completedCampaigns / 20) * 100)));
  const compareEarnings = Math.min(100, Math.max(8, Math.round((stats.totalEarnings / 100000) * 100)));
  const chartMap: Record<'7g' | '30g' | '90g', string> = {
    '7g': '8,76 20,58 32,62 44,39 56,52 68,33 80,41 92,21',
    '30g': '8,74 20,55 32,60 44,42 56,48 68,29 80,36 92,24',
    '90g': '8,70 20,64 32,58 44,46 56,40 68,31 80,28 92,26',
  };
  const chartPoints = chartMap[analyticsRange];

  const notifications = [
    {
      key: 'pending',
      count: stats.pendingOffers,
      icon: <Clock size={16} />,
      color:
        'border-amber-300/70 text-amber-500 bg-amber-50/70 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-300',
    },
    {
      key: 'content',
      count: stats.acceptedOffers,
      icon: <Upload size={16} />,
      color:
        'border-cyan-300/70 text-cyan-500 bg-cyan-50/70 dark:bg-cyan-500/15 dark:border-cyan-500/40 dark:text-cyan-300',
    },
    {
      key: 'revision',
      count: stats.revisionRequests,
      icon: <AlertCircle size={16} />,
      color:
        'border-pink-300/70 text-pink-500 bg-pink-50/70 dark:bg-pink-500/15 dark:border-pink-500/40 dark:text-pink-300',
    },
  ];
  const totalNotifications = notifications.reduce((sum, item) => sum + item.count, 0);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileData?.id) return;
    setIsUploading(true);
    try {
      await uploadProfilePhoto(profileData.id, file);
      toast({ title: 'Başarılı', description: 'Profil fotoğrafı güncellendi.' });
      onProfileUpdate?.();
    } catch (error: any) {
      toast({ title: 'Hata', description: error?.message || 'Profil fotoğrafı yüklenemedi.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleVerificationFileSelect = async (file: File | null) => {
    if (!file || !profileData?.id) return;
    setVerificationUploading(true);
    try {
      await submitVerificationRequest({
        userId: profileData.id,
        userType: 'influencer',
        fullNameOrBrandName: profileData.fullName || 'Influencer',
        email: profileData.email || '',
        file,
      });
      toast({ title: 'Gönderildi', description: 'Doğrulama talebiniz incelemeye alındı.' });
      setVerificationModalOpen(false);
      setVerificationPreview(null);
      onProfileUpdate?.();
    } catch (error: any) {
      toast({ title: 'Hata', description: error?.message || 'Doğrulama talebi gönderilemedi.', variant: 'destructive' });
    } finally {
      setVerificationUploading(false);
    }
  };

  const handleVerificationFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Preview oluştur
    const reader = new FileReader();
    reader.onloadend = () => {
      setVerificationPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerificationSubmit = () => {
    if (!verificationInputRef.current?.files?.[0]) return;
    handleVerificationFileSelect(verificationInputRef.current.files[0]);
  };

  const handlePortfolioFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileData?.id) return;
    
    // Dosya tipi kontrolü
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    
    if (!isImage && !isPDF) {
      toast({
        title: 'Hata',
        description: 'Sadece PDF ve görsel dosyaları yüklenebilir.',
        variant: 'destructive',
      });
      return;
    }
    
    setPortfolioUploading(true);
    try {
      const { url, storagePath } = await uploadPortfolioFile(profileData.id, file);
      setPortfolioItems((prev) => [
        ...prev,
        {
          url,
          type: isImage ? 'image' : 'pdf',
          name: file.name,
          storagePath,
        },
      ]);
      toast({
        title: 'Başarılı',
        description: 'Portfolyo dosyası yüklendi.',
      });
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error?.message || 'Portfolyo dosyası yüklenemedi.',
        variant: 'destructive',
      });
    } finally {
      setPortfolioUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleDeletePortfolioItem = async (index: number) => {
    const item = portfolioItems[index];
    if (!item) return;
    
    // Storage'dan sil
    if (item.storagePath) {
      try {
        await deletePortfolioFile(item.storagePath);
      } catch (error: any) {
        console.error('Portfolyo dosyası silme hatası:', error);
        // Devam et, listeden kaldır
      }
    }
    
    setPortfolioItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProfile = async () => {
    if (!profileData?.id) return;
    setIsSaving(true);
    try {
      await updateInfluencerProfile(profileData.id, {
        bio: aboutText,
        portfolio: portfolioItems,
      });
      setIsEditing(false);
      toast({ title: 'Başarılı', description: 'Profil bilgileri kaydedildi.' });
      onProfileUpdate?.();
    } catch (error: any) {
      toast({ title: 'Hata', description: error?.message || 'Profil kaydedilemedi.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderPrimary = (isExpanded: boolean) => {
    if (profileTab === 'about') {
      if (isEditing) {
        return (
          <textarea
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            className={`w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 resize-none ${isExpanded ? 'min-h-[280px]' : 'min-h-[160px]'}`}
            placeholder="Hakkınızda yazısı ekleyin..."
          />
        );
      }
      return (
        <div
          className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 p-3 text-gray-700 dark:text-gray-200 text-sm ${isExpanded ? 'max-h-[320px]' : 'max-h-[220px]'} overflow-y-auto mac-scrollbar`}
        >
          {aboutText?.trim() || 'Henüz bir hakkımızda metni eklenmemiş.'}
        </div>
      );
    }

    if (profileTab === 'social') {
      const rawPlatforms = profileData?.platforms;
      const normalized = Array.isArray(rawPlatforms)
        ? rawPlatforms
        : rawPlatforms && typeof rawPlatforms === 'object'
          ? Object.entries(rawPlatforms).map(([id, item]) => ({
              id,
              username: (item as any)?.username || '',
              followers: (item as any)?.followers || 0,
            }))
          : [];

      if (!normalized.length) {
        return (
          <div
            className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400"
          >
            Henüz platform bağlantısı bulunmuyor.
          </div>
        );
      }

      return (
        <div
          className={`grid gap-2 ${isExpanded ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
        >
          {normalized.map((platform) => (
            <div key={platform.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 p-3">
              <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <span className="text-[#08afd5]">{platformIcons[platform.id] || <User size={14} />}</span>
                <span className="font-medium text-sm capitalize">{platform.id}</span>
              </div>
              <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">@{platform.username || '-'}</p>
              <p className="text-sm mt-1 font-semibold text-gray-900 dark:text-gray-100">
                {fmtN(Number(platform.followers || 0))} Takipçi
              </p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handlePortfolioFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => portfolioInputRef.current?.click()}
            disabled={portfolioUploading}
            className="flex-1"
          >
            {portfolioUploading ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Yükleniyor...
              </>
            ) : (
              <>
                <Upload size={14} className="mr-2" />
                PDF veya Görsel Yükle
              </>
            )}
          </Button>
        </div>
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 mac-scrollbar">
          {portfolioItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3 text-sm text-gray-500 dark:text-gray-400">
              Henüz portfolyo eklenmemiş.
            </div>
          )}
          {portfolioItems.map((item, idx) => (
            <div
              key={`${item.url}-${idx}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 p-2.5 flex items-center gap-3"
            >
              {item.type === 'image' ? (
                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-red-600 dark:text-red-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 dark:text-gray-200 truncate hover:text-[#08afd5] dark:hover:text-[#7ce7ff] block"
                >
                  {item.name}
                </a>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.type === 'image' ? 'Görsel' : 'PDF'}</p>
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleDeletePortfolioItem(idx)}
                  className="h-7 w-7 rounded-md border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-red-500 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:0.45}} className="mb-0 w-full max-w-none min-w-0 -mt-0">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
      <input ref={verificationInputRef} type="file" accept="image/*" onChange={handleVerificationFileInputChange} className="hidden" />

      <div className="w-full max-w-none min-w-0 rounded-none overflow-hidden border-x-0 border-gray-200/70 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/55 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
        <div
          className="sticky top-0 z-20 h-[180px] md:h-[235px]"
          style={{
            backgroundImage: `linear-gradient(110deg, rgba(2,6,23,0.58), rgba(2,6,23,0.24)), url('${heroCoverImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/20" />
          <div className="relative h-full px-4 md:px-6 lg:px-10 pt-4 md:pt-7 pb-3 md:pb-5 flex items-end">
            <div className="flex items-end gap-3 md:gap-6 w-full">
              <button
                onClick={()=>fileInputRef.current?.click()}
                className="relative rounded-full overflow-hidden border-4 border-white/80 dark:border-gray-900/80 shadow-lg group h-[90px] w-[90px] md:h-[138px] md:w-[138px] flex-shrink-0"
              >
                {profileData?.profilePhotoURL ? (
                  <img src={profileData.profilePhotoURL} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] text-white flex items-center justify-center">
                    <User size={44} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  {isUploading ? <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Camera className="text-white" size={20} />}
                </div>
              </button>
              <div className="pb-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-white tracking-tight text-2xl md:text-4xl lg:text-5xl truncate">
                    {profileData?.fullName || 'Influencer Name'}
                  </h2>
                  {isVerified && (
                    <TooltipProvider delayDuration={180}>
                      <Tooltip>
                        <div className="group/badge inline-flex items-center gap-2 rounded-full border border-emerald-400/55 bg-gradient-to-r from-emerald-500/25 via-emerald-500/12 to-teal-500/18 pl-1.5 pr-3 py-1 text-[11px] font-semibold tracking-wide text-white shadow-[0_4px_28px_rgba(16,185,129,0.22)] backdrop-blur-md ring-1 ring-white/15 transition-shadow duration-200 hover:shadow-[0_6px_32px_rgba(16,185,129,0.35)]">
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-500/35 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:scale-105 hover:bg-emerald-500/45 hover:border-emerald-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
                              aria-label="Onay bilgisi"
                            >
                              <BadgeCheck className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                            </button>
                          </TooltipTrigger>
                          <span className="text-emerald-50/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                            Onaylı Profil
                          </span>
                        </div>
                        <TooltipContent
                          side="bottom"
                          align="start"
                          sideOffset={8}
                          className="max-w-[240px] border border-emerald-500/35 bg-gray-950/96 px-3 py-2 text-xs font-medium text-emerald-50 shadow-lg backdrop-blur-sm"
                        >
                          hesabınız onaylanmıştır
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {!isVerified && isVerificationPending && (
                    <span className="inline-flex items-center rounded-full border border-amber-300/80 bg-amber-500/12 px-2.5 py-1 text-[11px] font-medium text-amber-100 backdrop-blur-sm shadow-sm">
                      <Clock size={14} className="mr-1 text-amber-200" />
                      Onay bekleniyor
                    </span>
                  )}
                  {!isVerified && !isVerificationPending && isVerificationRejected && (
                    <span className="inline-flex items-center rounded-full border border-rose-300/80 bg-rose-500/15 px-2.5 py-1 text-[11px] font-medium text-rose-50 backdrop-blur-sm shadow-sm max-w-[min(100%,20rem)] text-left leading-snug">
                      Talep reddedildi — yeniden doğrulama gönderebilirsiniz
                    </span>
                  )}
                  {!isVerified && !isVerificationPending && !isVerificationRejected && (
                    <span className="inline-flex items-center rounded-full border border-white/25 bg-black/25 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm shadow-sm">
                      Hesabınız doğrulanmadı
                    </span>
                  )}
                </div>
                {profileData?.email && (
                  <p className="text-white/85 text-xs md:text-sm mt-1 truncate">{profileData.email}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 md:gap-2">
                  {(profileData?.categories || []).slice(0, 3).map((category, index) => (
                    <span key={`${category}-${index}`} className="px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-white/20 text-white backdrop-blur-sm border border-white/30">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
              <div className="absolute right-4 md:right-6 bottom-3 md:bottom-5 flex items-center gap-2">
                {isMobile ? (
                  <div className="flex items-center gap-2">
                    {!setupComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-white/15 text-white border-white/40 hover:bg-white/25 text-xs px-2 h-7 inline-flex items-center gap-1"
                        onClick={() => setSetupModalOpen(true)}
                      >
                        <ListChecks size={12} />
                        Kurulum
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white/15 text-white border-white/40 hover:bg-white/25 text-xs px-2 h-7"
                      onClick={() => setGeneralEditOpen(true)}
                    >
                      <Edit size={12} />
                      <span className="ml-1">Düzenle</span>
                    </Button>
                  </div>
                ) : (
                  <>
                    {!setupComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-[#08afd5]/25 text-white border-[#7ce7ff]/45 hover:bg-[#08afd5]/35 inline-flex items-center gap-1.5"
                        onClick={() => setSetupModalOpen(true)}
                      >
                        <ListChecks size={14} className="shrink-0" />
                        Kurulumu tamamla
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white/15 text-white border-white/40 hover:bg-white/25"
                      onClick={() => setGeneralEditOpen(true)}
                    >
                      <Edit size={14} />
                      Profili Düzenle
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 md:px-5 pb-4 pt-4 space-y-3 md:space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <div className="w-fit rounded-xl md:rounded-2xl border border-gray-200/60 dark:border-gray-800/60 px-2 md:px-3 h-12 md:h-14 bg-white/70 dark:bg-gray-900/70 flex items-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={()=>setNotificationsCollapsed((v)=>!v)}
                    className="h-9 w-9 md:h-10 md:w-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-800 inline-flex items-center justify-center relative text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title={notificationsCollapsed ? 'Bildirimleri Aç' : 'Bildirimleri Kapat'}
                  >
                    <Bell size={14} className="md:w-[15px] md:h-[15px]" />
                    {notificationsCollapsed && (
                      <span className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 text-[10px] min-w-[16px] h-4 px-1 bg-red-500 text-white rounded-full inline-flex items-center justify-center leading-none">
                        {totalNotifications}
                      </span>
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {!notificationsCollapsed && (
                      <motion.div
                        key="notification-items"
                        initial={{ opacity: 0, width: 0, x: -8 }}
                        animate={{ opacity: 1, width: 'auto', x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -8 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="flex items-center gap-2"
                      >
                        {notifications.map((n)=><button key={n.key} onClick={()=>onNotificationClick?.(n.key as any)} className={`h-9 w-9 md:h-10 md:w-10 rounded-full border inline-flex items-center justify-center relative ${n.color}`}>{React.cloneElement(n.icon as React.ReactElement, { size: 14, className: "md:w-[16px] md:h-[16px]" })}<span className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 text-[9px] md:text-[10px] min-w-[14px] md:min-w-[16px] h-3.5 md:h-4 px-0.5 md:px-1 bg-red-500 text-white rounded-full inline-flex items-center justify-center leading-none">{n.count}</span></button>)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <motion.div 
            layout
            className="grid w-full min-w-0 grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(0,2.5fr)_minmax(280px,1fr)] items-start gap-3 px-0 md:px-0"
          >
            <motion.div layout className="xl:order-2 flex flex-col gap-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-3">
                <CollapsibleWidget
                  id="dashboard"
                  icon={<LayoutDashboard size={20} className="text-[#e3447c] dark:text-[#ff8eb3]" />}
                  title="Dashboard"
                  className="bg-gradient-to-br from-white/90 to-[#e3447c]/10 dark:from-gray-900/80 dark:to-[#e3447c]/15"
                  onExpand={() => setExpandedPanel('stats')}
                  defaultCollapsed={widgetCollapsed['dashboard']}
                  onCollapseChange={(id, collapsed) => setWidgetCollapsed((prev) => ({ ...prev, [id]: collapsed }))}
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    <motion.div whileHover={{ y: -2 }} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm"><div className="flex items-center justify-between"><Briefcase size={14} className="text-[#e3447c]" /><span className="text-[10px] text-gray-500 dark:text-gray-400">Çalışılan</span></div><p className="text-xs mt-1">Aktif</p><p className="font-bold text-xl">{stats.completedCampaigns}</p></motion.div>
                    <motion.div whileHover={{ y: -2 }} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm"><div className="flex items-center justify-between"><Clock size={14} className="text-amber-500" /><span className="text-[10px] text-gray-500 dark:text-gray-400">Yanıt</span></div><p className="text-xs mt-1">Bekleyen</p><p className="font-bold text-xl">{stats.pendingOffers}</p></motion.div>
                    <motion.div whileHover={{ y: -2 }} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm"><div className="flex items-center justify-between"><CheckCircle2 size={14} className="text-[#08afd5]" /><span className="text-[10px] text-gray-500 dark:text-gray-400">Onaylanan</span></div><p className="text-xs mt-1">Kabul</p><p className="font-bold text-xl">{stats.acceptedOffers}</p></motion.div>
                    <motion.div whileHover={{ y: -2 }} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm"><div className="flex items-center justify-between"><Banknote size={14} className="text-[#08afd5]" /><span className="text-[10px] text-gray-500 dark:text-gray-400">Toplam</span></div><p className="text-xs mt-1">Kazanç</p><p className="font-bold text-base lg:text-lg">{fmtP(stats.totalEarnings)}</p></motion.div>
                  </div>
                </CollapsibleWidget>

                <CollapsibleWidget
                  id="discover"
                  icon={<Compass size={20} className="text-[#08afd5] dark:text-[#7ce7ff]" />}
                  title="Keşfet"
                  className="bg-gradient-to-br from-white/90 to-[#08afd5]/10 dark:from-gray-900/80 dark:to-[#08afd5]/15"
                  onExpand={() => setExpandedPanel('discover')}
                  defaultCollapsed={widgetCollapsed['discover']}
                  onCollapseChange={(id, collapsed) => setWidgetCollapsed((prev) => ({ ...prev, [id]: collapsed }))}
                >
                  <div className="space-y-3">
                    {discoverLoading ? (
                      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">Kampanyalar yükleniyor...</div>
                    ) : discoverCampaigns.length > 0 ? (
                      <>
                        <div className="rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 p-3 shadow-sm flex flex-col">
                          {(() => {
                            const campaign = discoverCampaigns[discoverIndex];
                            if (!campaign) return null;
                            return (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">{campaign.brandName || 'Marka'}</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-1">{campaign.title || 'Kampanya'}</p>
                                  </div>
                                  <span className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-[#08afd5]/15 dark:bg-[#08afd5]/25 text-[#08afd5] dark:text-[#7ce7ff]">
                                    {getCampaignModelLabel(campaign.campaignModel)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{campaign.productInfo || 'Kampanya açıklaması belirtilmemiş.'}</p>
                                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[12px] text-gray-700 dark:text-gray-300">
                                  <div className="flex items-center gap-1.5 min-w-0"><Banknote size={12} className="text-[#08afd5] dark:text-[#7ce7ff] shrink-0" /><span className="truncate">{fmtP(Number(campaign.budget?.perInfluencer || campaign.budget?.total || 0))}</span></div>
                                  <div className="flex items-center gap-1.5 min-w-0"><Clock size={12} className="text-gray-500 dark:text-gray-400 shrink-0" /><span className="truncate">{campaign.duration?.end || '-'}</span></div>
                                  <div className="flex items-center gap-1.5 min-w-0"><Instagram size={12} className="text-[#e3447c] shrink-0" /><span className="truncate">{(campaign.platforms || []).join(', ') || 'Platform yok'}</span></div>
                                  <div className="flex items-center gap-1.5 min-w-0"><MapPin size={12} className="text-gray-500 dark:text-gray-400 shrink-0" /><span className="truncate">{campaign.targetAudience?.location || 'Lokasyon yok'}</span></div>
                                </div>
                                <Button className="mt-3 w-full h-8 brand-btn-primary text-white text-xs" onClick={() => setExpandedPanel('discover')}>Kampanyayı Aç</Button>
                              </>
                            );
                          })()}
                        </div>
                        {discoverCampaigns.length > 1 && (
                          <div className="flex items-center justify-center gap-3 pt-1">
                            <button type="button" onClick={() => setDiscoverIndex((prev) => (prev - 1 + discoverCampaigns.length) % discoverCampaigns.length)} className="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Önceki kampanya"><ChevronLeft size={16} className="mx-auto" /></button>
                            <button type="button" onClick={() => setDiscoverIndex((prev) => (prev + 1) % discoverCampaigns.length)} className="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Sonraki kampanya"><ChevronRight size={16} className="mx-auto" /></button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">Şu an aktif kampanya bulunmuyor.</div>
                    )}
                  </div>
                </CollapsibleWidget>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-3">
                <CollapsibleWidget
                  id="smart-suggestions"
                  icon={<Lightbulb size={20} className="text-amber-500 dark:text-amber-400" />}
                  title="Akıllı Öneriler"
                  className="bg-gradient-to-b from-white/95 to-[#08afd5]/10 dark:from-gray-900/85 dark:to-[#08afd5]/15"
                  defaultCollapsed={widgetCollapsed['smart-suggestions']}
                  onCollapseChange={(id, collapsed) => setWidgetCollapsed((prev) => ({ ...prev, [id]: collapsed }))}
                >
                  <div className="space-y-3">
                    <div className="rounded-xl border border-[#08afd5]/25 bg-[#08afd5]/10 dark:bg-[#08afd5]/15 p-3"><p className="text-sm font-semibold text-[#08afd5] dark:text-[#7ce7ff]">Bugünün Önerisi</p><p className="text-xs text-gray-700 dark:text-gray-300 mt-1">Teknoloji kategorisinde kısa Reels içerikler bu hafta daha hızlı kabul alıyor.</p></div>
                    <div className="rounded-xl border border-[#e3447c]/25 bg-[#e3447c]/10 dark:bg-[#e3447c]/15 p-3"><p className="text-sm font-semibold text-[#e3447c] dark:text-[#ff8eb3]">Fiyatlandırma Uyarısı</p><p className="text-xs text-gray-700 dark:text-gray-300 mt-1">Son 3 teklifte ortalama tutarın %14 üstündesin. Hızlı dönüş için daha dengeli karşı teklif önerilir.</p></div>
                    <div 
                      className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white/80 dark:bg-gray-900/80 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
                      onClick={() => setOptimizationModalOpen(true)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Optimizasyon Skoru</p>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div 
                          className="h-2 rounded-full bg-gradient-to-r from-[#08afd5] to-[#e3447c] transition-all duration-500" 
                          style={{ width: `${calculateOptimizationScore.score}%` }} 
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        %{calculateOptimizationScore.score} - {calculateOptimizationScore.message}
                      </p>
                      {calculateOptimizationScore.suggestions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {calculateOptimizationScore.suggestions.map((suggestion, idx) => (
                            <p key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                              <span className="text-[#08afd5] dark:text-[#7ce7ff] mt-0.5">•</span>
                              {suggestion}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleWidget>

                <CollapsibleWidget
                  id="earnings"
                  icon={<Banknote size={20} className="text-[#08afd5] dark:text-[#7ce7ff]" />}
                  title="Kazanç"
                  className="bg-gradient-to-br from-white/95 to-[#e3447c]/8 dark:from-gray-900/85 dark:to-[#e3447c]/15"
                  defaultCollapsed={widgetCollapsed['earnings']}
                  onCollapseChange={(id, collapsed) => setWidgetCollapsed((prev) => ({ ...prev, [id]: collapsed }))}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Toplam Kazanç</p><p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{fmtP(stats.totalEarnings)}</p></div>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Kampanya Başı</p><p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{fmtP(stats.completedCampaigns > 0 ? Math.round(stats.totalEarnings / stats.completedCampaigns) : 0)}</p></div>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2"><span>Kazanç Verimliliği</span><span>%{Math.max(10, acceptanceRate)}</span></div>
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"><div className="h-2 rounded-full bg-gradient-to-r from-[#08afd5] to-[#e3447c]" style={{ width: `${Math.max(10, acceptanceRate)}%` }} /></div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-[#08afd5]/10 dark:bg-[#08afd5]/20 py-2"><p className="text-[10px] text-gray-500 dark:text-gray-400">Bekleyen</p><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stats.pendingOffers}</p></div><div className="rounded-lg bg-[#e3447c]/10 dark:bg-[#e3447c]/20 py-2"><p className="text-[10px] text-gray-500 dark:text-gray-400">Kabul</p><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stats.acceptedOffers}</p></div><div className="rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 py-2"><p className="text-[10px] text-gray-500 dark:text-gray-400">Revizyon</p><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stats.revisionRequests}</p></div></div>
                    </div>
                  </div>
                </CollapsibleWidget>
              </div>
            </motion.div>

            <CollapsibleWidget
              id="statistics"
              icon={<BarChart3 size={20} className="text-[#08afd5] dark:text-[#7ce7ff]" />}
              title="İstatistikler"
              className="bg-gradient-to-br from-white/95 to-slate-100/70 dark:from-gray-900/85 dark:to-slate-900/30 xl:order-1"
              onExpand={() => setExpandedPanel('analytics')}
              defaultCollapsed={widgetCollapsed['statistics']}
              onCollapseChange={(id, collapsed) => setWidgetCollapsed((prev) => ({ ...prev, [id]: collapsed }))}
            >
              <div className="flex items-center justify-end gap-1 mb-2">{(['7g','30g','90g'] as const).map((r)=><button key={r} onClick={()=>setAnalyticsRange(r)} className={`px-2 py-1 rounded-md text-[11px] border ${analyticsRange===r?'bg-[#08afd5] text-white border-[#08afd5]':'bg-white/80 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{r}</button>)}</div>
              <div className="space-y-3">
                <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3"><div className="flex items-center justify-between mb-2"><p className="text-xs text-gray-500 dark:text-gray-400">Toplam Etkileşim</p><p className="text-xs font-semibold text-[#08afd5] dark:text-[#7ce7ff]">{fmtN(stats.totalEngagement)}</p></div><div className="h-24 rounded-lg bg-gradient-to-b from-[#08afd5]/10 to-white dark:from-[#08afd5]/20 dark:to-gray-900 p-2"><svg viewBox="0 0 100 100" className="w-full h-full"><polyline points={chartPoints} fill="none" stroke="rgb(16 185 129)" strokeWidth="2.8" strokeLinecap="round" /></svg></div></motion.div>
                <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3"><div className="flex items-center justify-between mb-2"><p className="text-xs text-gray-500 dark:text-gray-400">Tamamlanan Kampanya</p><p className="text-xs font-semibold text-[#e3447c] dark:text-[#ff8eb3]">{stats.completedCampaigns}</p></div><div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"><div className="h-2 rounded-full bg-[#e3447c]" style={{ width: `${completionRate}%` }} /></div><p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">Bekleyen: {stats.pendingOffers} | Kabul: {stats.acceptedOffers}</p></motion.div>
                <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3"><div className="flex items-center justify-between mb-2"><p className="text-xs text-gray-500 dark:text-gray-400">Toplam Kazanç</p><p className="text-xs font-semibold text-[#08afd5] dark:text-[#7ce7ff]">{fmtP(stats.totalEarnings)}</p></div><div className="grid grid-cols-3 gap-2 items-end h-20"><div className="rounded-lg bg-[#08afd5]/15 dark:bg-[#08afd5]/25 p-2 h-full flex flex-col justify-end"><div className="w-full rounded bg-[#08afd5]" style={{ height: `${compareEngagement}%` }} /><p className="mt-2 text-[10px] text-center text-gray-600 dark:text-gray-300">Etkileşim</p></div><div className="rounded-lg bg-[#e3447c]/15 dark:bg-[#e3447c]/25 p-2 h-full flex flex-col justify-end"><div className="w-full rounded bg-[#e3447c]" style={{ height: `${compareCampaigns}%` }} /><p className="mt-2 text-[10px] text-center text-gray-600 dark:text-gray-300">Kampanya</p></div><div className="rounded-lg bg-[#08afd5]/15 dark:bg-[#08afd5]/25 p-2 h-full flex flex-col justify-end"><div className="w-full rounded bg-[#08afd5]" style={{ height: `${compareEarnings}%` }} /><p className="mt-2 text-[10px] text-center text-gray-600 dark:text-gray-300">Kazanç</p></div></div></motion.div>
                
                {/* Yeni Eklenen Metrikler */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className="text-emerald-500 dark:text-emerald-400" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Kabul Oranı</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">%{acceptanceRate}</p>
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${acceptanceRate}%` }} />
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={14} className="text-[#08afd5] dark:text-[#7ce7ff]" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ortalama Etkileşim</p>
                    </div>
                    <p className="text-lg font-bold text-[#08afd5] dark:text-[#7ce7ff]">{fmtN(engagementPerCampaign)}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Kampanya başına</p>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Award size={14} className="text-[#e3447c] dark:text-[#ff8eb3]" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Aktif Kampanyalar</p>
                    </div>
                    <p className="text-lg font-bold text-[#e3447c] dark:text-[#ff8eb3]">{stats.acceptedOffers}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Devam eden</p>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={14} className="text-amber-500 dark:text-amber-400" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ortalama Kazanç</p>
                    </div>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{fmtP(stats.completedCampaigns > 0 ? Math.round(stats.totalEarnings / stats.completedCampaigns) : 0)}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Kampanya başına</p>
                  </motion.div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} className="text-amber-500 dark:text-amber-400" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Bekleyen Teklifler</p>
                    </div>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.pendingOffers}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Yanıt bekleniyor</p>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={14} className="text-purple-500 dark:text-purple-400" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Revizyon Talepleri</p>
                    </div>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.revisionRequests}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Aktif revizyonlar</p>
                  </motion.div>
                </div>
              </div>
            </CollapsibleWidget>

            <div className="lg:col-span-2 xl:col-span-1 xl:order-3">
              <CollapsibleWidget
                id="messages"
                icon={<MessageSquare size={20} className="text-[#08afd5] dark:text-[#7ce7ff]" />}
                title="Mesajlar"
                className=""
                onExpand={onOpenMessages}
                defaultCollapsed={widgetCollapsed['messages']}
                onCollapseChange={(id, collapsed) => setWidgetCollapsed((prev) => ({ ...prev, [id]: collapsed }))}
              >
                <DashboardMessagesWidget
                  userId={profileData?.id}
                  userType="influencer"
                  onExpand={onOpenMessages}
                  className=""
                />
              </CollapsibleWidget>
            </div>
          </motion.div>
        </div>
      </div>
      <Dialog open={expandedPanel!==null} onOpenChange={(o)=>!o&&setExpandedPanel(null)}>
        <DialogContent className="max-w-5xl h-[78vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col w-[calc(100%-24px)] md:w-full rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">{expandedPanel==='tab'?'Genel':expandedPanel==='discover'?'Keşfet':expandedPanel==='stats'?'Dashboard':'İstatistikler'}</DialogTitle>
            <DialogDescription>Detaylı görünüm</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 mac-scrollbar">
            {expandedPanel==='tab'&&(
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-[#08afd5]/10 dark:from-gray-900 dark:to-[#08afd5]/15 p-4">
                  {renderPrimary(true)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Aktif Teklifler</p><p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.acceptedOffers}</p></div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Bekleyen Teklifler</p><p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.pendingOffers}</p></div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Toplam Kazanç</p><p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmtP(stats.totalEarnings)}</p></div>
                </div>
              </div>
            )}

            {expandedPanel==='discover'&&(
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-[#08afd5]/10 to-[#e3447c]/10 dark:from-[#08afd5]/20 dark:to-[#e3447c]/15 p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-200">Kampanyalar menüsü bu popup içinde açık. Buradan aktif kampanyaları detaylı inceleyip teklif verebilirsin.</p>
                </div>
                <CampaignsContent influencerId={profileData?.id} canOperate={canOperate} />
              </div>
            )}

            {expandedPanel==='stats'&&(
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"><p className="text-xs text-gray-500 dark:text-gray-400">Tamamlanan</p><p className="text-2xl font-bold">{stats.completedCampaigns}</p></div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"><p className="text-xs text-gray-500 dark:text-gray-400">Bekleyen</p><p className="text-2xl font-bold">{stats.pendingOffers}</p></div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"><p className="text-xs text-gray-500 dark:text-gray-400">Kabul</p><p className="text-2xl font-bold">{stats.acceptedOffers}</p></div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"><p className="text-xs text-gray-500 dark:text-gray-400">Kazanç</p><p className="text-2xl font-bold">{fmtP(stats.totalEarnings)}</p></div>
              </div>
            )}

            {expandedPanel==='analytics'&&(
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Performans eğilimleri ve toplam metrik özeti</p>
                  <div className="flex items-center gap-1">
                    {(['7g','30g','90g'] as const).map((r)=><button key={r} onClick={()=>setAnalyticsRange(r)} className={`px-2.5 py-1 rounded-md text-xs border ${analyticsRange===r?'bg-[#08afd5] text-white border-[#08afd5]':'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{r}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                    <div className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-2">
                      <span>Toplam Etkileşim</span>
                      <span className="font-semibold">{fmtN(stats.totalEngagement)}</span>
                    </div>
                    <div className="h-36 rounded-xl bg-gradient-to-b from-[#08afd5]/10 to-white dark:from-[#08afd5]/20 dark:to-gray-900 p-3">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <polyline points={chartPoints} fill="none" stroke="rgb(16 185 129)" strokeWidth="2.8" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Seçili dönem: {analyticsRange}</p>
                  </div>
                  <div className="md:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                    <div className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-2">
                      <span>Tamamlanan Kampanya Oranı</span>
                      <span className="font-semibold">%{completionRate}</span>
                    </div>
                    <div className="h-36 grid grid-cols-[auto_1fr] gap-4 items-center">
                      <div className="relative h-24 w-24">
                        <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                          <circle cx="50" cy="50" r="38" stroke="rgb(229 231 235)" strokeWidth="10" fill="none" />
                          <circle cx="50" cy="50" r="38" stroke="rgb(139 92 246)" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${completionRate * 2.39} 999`} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-gray-900 dark:text-gray-100">%{completionRate}</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1"><span>Tamamlanan</span><span>{stats.completedCampaigns}</span></div>
                          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"><div className="h-2 rounded-full bg-[#e3447c]" style={{ width: `${completionRate}%` }} /></div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1"><span>Bekleyen</span><span>{stats.pendingOffers}</span></div>
                          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(8, 100-completionRate)}%` }} /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-5 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                    <div className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-2">
                      <span>Toplam Kazanç ve Genel Performans Karşılaştırması</span>
                      <span className="font-semibold">{fmtP(stats.totalEarnings)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 h-36">
                      <div className="rounded-xl border border-[#08afd5]/40 dark:border-[#08afd5]/45 bg-[#08afd5]/10 dark:bg-[#08afd5]/20 p-3 flex flex-col justify-end">
                        <div className="h-full flex items-end">
                          <div className="w-full rounded-md bg-[#08afd5] transition-all duration-500" style={{ height: `${compareEngagement}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-300">Etkileşim</p>
                        <p className="text-xs text-center font-semibold text-gray-900 dark:text-gray-100">{fmtN(stats.totalEngagement)}</p>
                      </div>
                      <div className="rounded-xl border border-[#e3447c]/40 dark:border-[#e3447c]/45 bg-[#e3447c]/10 dark:bg-[#e3447c]/20 p-3 flex flex-col justify-end">
                        <div className="h-full flex items-end">
                          <div className="w-full rounded-md bg-[#e3447c] transition-all duration-500" style={{ height: `${compareCampaigns}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-300">Kampanya</p>
                        <p className="text-xs text-center font-semibold text-gray-900 dark:text-gray-100">{stats.completedCampaigns}</p>
                      </div>
                      <div className="rounded-xl border border-[#08afd5]/40 dark:border-[#08afd5]/45 bg-[#08afd5]/10 dark:bg-[#08afd5]/20 p-3 flex flex-col justify-end">
                        <div className="h-full flex items-end">
                          <div className="w-full rounded-md bg-[#08afd5] transition-all duration-500" style={{ height: `${compareEarnings}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-300">Kazanç</p>
                        <p className="text-xs text-center font-semibold text-gray-900 dark:text-gray-100">{fmtP(stats.totalEarnings)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={generalEditOpen} onOpenChange={(o) => setGeneralEditOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[min(90dvh,92vh)] overflow-y-auto flex flex-col gap-0 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 w-[calc(100%-24px)] md:w-full rounded-lg p-0">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6">
            <DialogHeader>
              <DialogTitle>Profili Düzenle</DialogTitle>
              <DialogDescription>
                Hakkında, sosyal medya, portfolyo, temel bilgiler, telefon ve ücretleri güncelleyin
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 min-h-0">
            <InfluencerProfileEditForm
              profile={profileData}
              onUpdate={() => onProfileUpdate?.()}
              onOpenAudienceMatch={onOpenAudienceMatch}
              layout="dialog"
              onCancel={() => setGeneralEditOpen(false)}
              onMainProfileSave={() => setGeneralEditOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={setupModalOpen} onOpenChange={setSetupModalOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 w-[calc(100%-24px)] md:w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="text-[#08afd5]" size={22} />
              Kurulumu tamamla
            </DialogTitle>
            <DialogDescription>
              Markalarla eşleşmeye hazır olmak için bu adımları tamamlayın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setSetupModalOpen(false);
                fileInputRef.current?.click();
              }}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-left transition hover:border-[#08afd5]/55 hover:bg-[#08afd5]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5]/35"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#08afd5]/10 text-[#08afd5]">
                  <Camera size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Profil fotoğrafı ekle</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {hasProfilePhoto ? 'Profil fotoğrafı eklendi; isterseniz güncelleyebilirsiniz.' : 'Yüzünüzün net göründüğü bir profil fotoğrafı yükleyin.'}
                  </span>
                </span>
                {hasProfilePhoto ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                ) : (
                  <ChevronRight size={18} className="shrink-0 text-gray-400" />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isVerified || isVerificationPending) return;
                setSetupModalOpen(false);
                setVerificationModalOpen(true);
              }}
              disabled={isVerified || isVerificationPending || verificationUploading}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-left transition hover:border-[#08afd5]/55 hover:bg-[#08afd5]/5 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5]/35"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#08afd5]/10 text-[#08afd5]">
                  <ShieldCheck size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Kimlik doğrulama</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {isVerified
                      ? 'Profiliniz doğrulandı.'
                      : isVerificationPending
                        ? 'Doğrulama talebiniz inceleniyor.'
                        : 'Yüzünüzün belli olduğu bir selfie yükleyin.'}
                  </span>
                </span>
                {isVerified ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                ) : isVerificationPending ? (
                  <Clock size={18} className="shrink-0 text-amber-500" />
                ) : (
                  <ChevronRight size={18} className="shrink-0 text-gray-400" />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSetupModalOpen(false);
                onOpenAudienceMatch?.();
              }}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-left transition hover:border-[#08afd5]/55 hover:bg-[#08afd5]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5]/35"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#08afd5]/10 text-[#08afd5]">
                  <ListChecks size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Anket</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {audienceMatchComplete ? 'Hedef kitle anketi tamamlandı.' : 'Kitle bilgilerinizi tamamlayarak eşleşmeleri iyileştirin.'}
                  </span>
                </span>
                {audienceMatchComplete ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                ) : (
                  <ChevronRight size={18} className="shrink-0 text-gray-400" />
                )}
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Modal */}
      <Dialog open={verificationModalOpen} onOpenChange={(open) => {
        setVerificationModalOpen(open);
        if (!open) {
          setVerificationPreview(null);
          if (verificationInputRef.current) verificationInputRef.current.value = '';
        }
      }}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 w-[calc(100%-24px)] md:w-full rounded-lg flex flex-col max-h-[min(90dvh,calc(100vh-32px))] overflow-hidden gap-4">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="text-[#08afd5]" size={24} />
              Profil Doğrulama
            </DialogTitle>
            <DialogDescription>
              Profilinizi doğrulamak için yüzünüzün net göründüğü bir selfie fotoğrafı yükleyin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-1 pr-1 -mr-1 space-y-6">
            {/* Info Box */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Önemli Bilgiler:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                    <li>Fotoğrafta yüzünüz net ve anlaşılır görünmelidir</li>
                    <li>Kimlik kartı göstermeniz gerekmez</li>
                    <li>Fotoğraf yüksek kaliteli ve net olmalıdır</li>
                    <li>Doğrulama süreci 1-3 iş günü sürebilir</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className="space-y-4">
              {verificationPreview ? (
                <div className="relative rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-6">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="relative w-full max-w-md">
                      <img 
                        src={verificationPreview} 
                        alt="Önizleme" 
                        className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                      />
                      <button
                        onClick={() => {
                          setVerificationPreview(null);
                          if (verificationInputRef.current) verificationInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                        aria-label="Fotoğrafı Kaldır"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => verificationInputRef.current?.click()}
                      className="w-full max-w-md"
                    >
                      <Camera size={16} />
                      Fotoğrafı Değiştir
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => verificationInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-[#08afd5]', 'bg-[#08afd5]/5');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-[#08afd5]', 'bg-[#08afd5]/5');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-[#08afd5]', 'bg-[#08afd5]/5');
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setVerificationPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                      // Dosyayı input'a da ekle
                      const dataTransfer = new DataTransfer();
                      dataTransfer.items.add(file);
                      if (verificationInputRef.current) {
                        verificationInputRef.current.files = dataTransfer.files;
                      }
                    }
                  }}
                  className="relative rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-12 cursor-pointer hover:border-[#08afd5] hover:bg-[#08afd5]/5 transition-all duration-200"
                >
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#08afd5]/10 dark:bg-[#08afd5]/20 flex items-center justify-center">
                      <Upload className="text-[#08afd5]" size={32} />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Fotoğraf Yükleyin
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Tıklayarak seçin veya sürükleyip bırakın
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        PNG, JPG veya JPEG (Max 10MB)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-gray-200 dark:border-gray-800 pt-4 mt-0">
            <Button
              variant="outline"
              onClick={() => {
                setVerificationModalOpen(false);
                setVerificationPreview(null);
                if (verificationInputRef.current) verificationInputRef.current.value = '';
              }}
              disabled={verificationUploading}
              className="inline-flex items-center gap-2"
            >
              <XCircle size={16} />
              İptal
            </Button>
            <Button
              onClick={handleVerificationSubmit}
              disabled={!verificationPreview || verificationUploading}
              className="inline-flex items-center gap-2 bg-[#08afd5] hover:bg-[#07a0c4] text-white"
            >
              {verificationUploading ? (
                <>
                  <Clock size={16} className="animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Gönder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Optimizasyon Skoru Detay Modal */}
      <Dialog open={optimizationModalOpen} onOpenChange={setOptimizationModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 w-[calc(100%-24px)] md:w-full rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="text-[#08afd5]" size={24} />
              Optimizasyon Skoru Detayları
            </DialogTitle>
            <DialogDescription>
              Profil optimizasyon durumunuz ve iyileştirme önerileri
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 max-h-[60vh] overflow-y-auto pr-1 space-y-4 mac-scrollbar">
            {/* Genel Skor */}
            <div className="rounded-xl border border-[#08afd5]/25 bg-[#08afd5]/10 dark:bg-[#08afd5]/15 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Toplam Skor</p>
                <p className="text-2xl font-bold text-[#08afd5] dark:text-[#7ce7ff]">
                  %{calculateOptimizationScore.score}
                </p>
              </div>
              <div className="mt-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-[#08afd5] to-[#e3447c] transition-all duration-500" 
                  style={{ width: `${calculateOptimizationScore.score}%` }} 
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {calculateOptimizationScore.message}
              </p>
            </div>

            {/* Metrikler */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Detaylı Metrikler</p>
              {calculateOptimizationScore.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${
                    metric.completed
                      ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20'
                      : metric.points > 0
                        ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {metric.completed ? (
                          <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                        ) : metric.points > 0 ? (
                          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        ) : (
                          <XCircle size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {metric.name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                        {metric.description}
                      </p>
                      <p className={`text-xs mt-1 ml-6 ${
                        metric.completed
                          ? 'text-green-600 dark:text-green-400'
                          : metric.points > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {metric.status}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {metric.points}/{metric.maxPoints}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">puan</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Öneriler */}
            {calculateOptimizationScore.suggestions.length > 0 && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 p-4">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <Lightbulb size={16} />
                  İyileştirme Önerileri
                </p>
                <div className="space-y-1.5">
                  {calculateOptimizationScore.suggestions.map((suggestion, idx) => (
                    <p key={idx} className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                      {suggestion}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOptimizationModalOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
