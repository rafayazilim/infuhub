import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Upload,
  Banknote,
  MessageSquare,
  Settings,
  Menu,
  Clock,
  Wallet,
  X,
  LogOut,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getInfluencerProfile, InfluencerProfile } from '@/services/firebaseInfluencerService';
import {
  getOffersByInfluencer,
  isGenuineInfluencerCampaignAcceptance,
  type FirebaseOffer,
} from '@/services/firebaseOfferService';
import { processStaleEscrowRefundsForInfluencerOffers } from '@/services/firebaseOfferEscrowService';
import { grossEarningsFromOffers } from '@/services/firebaseInfluencerPayoutService';
import { isRevisionResponsePending } from '@/lib/offerRevisionState';
import { getTrackingLinkByOfferId } from '@/services/trackingLinkService';
import { OffersContent } from '@/components/influencer/OffersContent';
import { CampaignsContent } from '@/components/influencer/CampaignsContent';
import { DeliveriesContent } from '@/components/influencer/DeliveriesContent';
import { EarningsContent } from '@/components/influencer/EarningsContent';
import { InfluencerSettingsContent } from '@/components/influencer/InfluencerSettingsContent';
import { InfluencerProfileContent } from '@/components/influencer/InfluencerProfileContent';
import { ProfileHero } from '@/components/influencer/ProfileHero';
import { InfluencerAudienceMatchDialog } from '@/components/influencer/InfluencerAudienceMatchDialog';
import { MessagesPanel } from '@/components/shared/MessagesPanel';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { isUserVerified, logoutUser } from '@/services/firebaseAuthService';
import { isAudienceMatchComplete } from '@/lib/influencerAudienceMatch';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  trend?: string;
  highlight?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  value,
  description,
  trend,
  highlight,
}) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
    className="aspect-[4/3]"
  >
    <Card
      className={`h-full p-6 border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between ${highlight
        ? 'border-[#08afd5]/50 dark:border-[#08afd5]/50 bg-[#08afd5]/10 dark:bg-[#08afd5]/20'
        : 'border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900'
        }`}
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-2.5 rounded-[10px] ${highlight
              ? 'bg-[#08afd5]/20 dark:bg-[#08afd5]/35 text-[#08afd5] dark:text-[#7ce7ff]'
              : 'bg-[#08afd5]/15 dark:bg-[#08afd5]/25 text-[#08afd5] dark:text-[#7ce7ff]'
              }`}
          >
            {icon}
          </div>
          {trend && (
            <Badge
              variant="secondary"
              className={`text-xs rounded-md ${highlight ? 'bg-[#08afd5]/15 dark:bg-[#08afd5]/25' : ''
                }`}
            >
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

/** Ana dashboard (ProfileHero) dışındaki panellerde sağ/sol nefes payı */
const INFLUENCER_PANEL_GUTTER_X = 'px-4 sm:px-5 md:px-8 lg:px-10 xl:px-12';
const INFLUENCER_SUBPAGE_SHELL = `w-full max-w-none min-w-0 ${INFLUENCER_PANEL_GUTTER_X} py-4 md:py-6`;

export default function InfluencerDashboardNew() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const validMenuIds = React.useMemo(
    () =>
      new Set([
        'dashboard',
        'offers',
        'campaigns',
        'deliveries',
        'earnings',
        'messages',
        'profile',
        'settings',
      ]),
    []
  );
  const activeMenu = React.useMemo(() => {
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
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  /** Tekliflerden "İçerik Yükle" → İçerik Teslimleri sekmesi + ilgili teklif için yükleme modalı */
  const openDeliveriesForOffer = React.useCallback(
    (offerId: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'deliveries');
        next.set('offerId', offerId);
        return next;
      });
      if (isMobile) setMobileMenuOpen(false);
    },
    [setSearchParams, isMobile]
  );
  const [profileData, setProfileData] = useState<InfluencerProfile | null>(null);
  /** Ayarlardan “Profili düzenle” — ProfileHero portallı diyalog (hero gizliyken de açılabilir) */
  const [profileEditDialogOpen, setProfileEditDialogOpen] = useState(false);
  const [audienceMatchDialogOpen, setAudienceMatchDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [influencerId, setInfluencerId] = useState<string | null>(null);
  const [offers, setOffers] = useState<FirebaseOffer[]>([]);
  const [totalClicks, setTotalClicks] = useState<number>(0);
  const isVerified = isUserVerified(profileData?.status);
  const audienceSetupComplete = isAudienceMatchComplete(profileData);
  const canOperate = isVerified && audienceSetupComplete;

  // Firebase Auth'dan giriş yapan kullanıcının ID'sini al
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setInfluencerId(user.uid);
      } else {
        setInfluencerId(null);
        setProfileData(null);
        setOffers([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Profil ve teklifleri yükle
  useEffect(() => {
    if (influencerId) {
      loadProfileData();
      loadOffers();
    }
  }, [influencerId]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const profile = await getInfluencerProfile(influencerId!);
      setProfileData(profile);
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      if (influencerId) {
        const offersData = await getOffersByInfluencer(influencerId);
        await processStaleEscrowRefundsForInfluencerOffers(offersData).catch(() => undefined);
        setOffers(offersData);
        
        // Kabul edilmiş tekliflerin tracking link'lerini çek ve toplam tıklama sayısını hesapla
        const acceptedOffers = offersData.filter((o) => isGenuineInfluencerCampaignAcceptance(o));
        let totalClicksCount = 0;
        
        for (const offer of acceptedOffers) {
          try {
            const trackingLink = await getTrackingLinkByOfferId(offer.id);
            if (trackingLink && trackingLink.clickCount) {
              totalClicksCount += trackingLink.clickCount;
            }
          } catch (error) {
            console.error(`Tracking link yükleme hatası (offer ${offer.id}):`, error);
          }
        }
        
        setTotalClicks(totalClicksCount);
      }
    } catch (error) {
      console.error('Teklifler yükleme hatası:', error);
    }
  };

  // Teklif istatistikleri
  const offerStats = {
    pending: offers.filter((o) => o.status === 'beklemede').length,
    accepted: offers.filter((o) => isGenuineInfluencerCampaignAcceptance(o)).length,
    revisionRequested: offers.filter((o) => isRevisionResponsePending(o)).length,
    total: offers.length,
  };

  // ProfileHero için istatistikler
  const profileHeroStats = {
    completedCampaigns: 0, // TODO: Tamamlanan kampanya sayısı
    totalEarnings: grossEarningsFromOffers(offers),
    totalEngagement: totalClicks, // Toplam tıklama sayısı
    pendingOffers: offerStats.pending,
    acceptedOffers: offerStats.accepted,
    revisionRequests: offerStats.revisionRequested,
  };

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'offers', icon: <FileText size={18} />, label: 'Teklifler' },
    { id: 'campaigns', icon: <Briefcase size={18} />, label: 'Kampanyalar' },
    { id: 'deliveries', icon: <Upload size={18} />, label: 'İçerik Teslimleri' },
    { id: 'earnings', icon: <Banknote size={18} />, label: 'Kazançlar' },
    { id: 'messages', icon: <MessageSquare size={18} />, label: 'Mesajlar' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Ayarlar' },
  ];

  const metrics = [
    {
      icon: <Briefcase size={20} />,
      title: 'Aktif Kampanyalar',
      value: offerStats.accepted.toString(),
      description: 'Üzerinde çalıştığın',
      trend: offerStats.accepted > 0 ? 'Aktif' : 'Henüz yok',
    },
    {
      icon: <Clock size={20} />,
      title: 'Bekleyen Teklifler',
      value: offerStats.pending.toString(),
      description: 'Yanıt bekleniyor',
      trend: offerStats.pending > 0 ? 'Yeni!' : 'Yok',
      highlight: offerStats.pending > 0,
    },
    {
      icon: <Banknote size={20} />,
      title: 'Toplam Kazanç',
      value: '₺0',
      description: 'Bugüne kadar',
      trend: 'Başlangıç',
    },
    {
      icon: <Wallet size={20} />,
      title: 'Ödenecek Tutar',
      value: '₺0',
      description: 'Çekilebilir bakiye',
      trend: 'Hazır',
    },
  ];

  const handleNotificationClick = (type: 'pending' | 'content' | 'revision') => {
    if (type === 'pending' || type === 'content' || type === 'revision') {
      setActiveMenu('offers');
    }
  };

  const handleSecureLogout = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await logoutUser();
      setMobileMenuOpen(false);
      navigate('/influencerlar', { replace: true });
    } catch (e) {
      console.error('Çıkış hatası:', e);
    } finally {
      setLogoutBusy(false);
    }
  };

  const renderSidebar = () => (
    <>
      <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center mb-6">
        <img src="/pics/infulogoy.png.png" alt="Infuhub" className="w-full h-full object-contain" />
      </div>
      <nav className="flex-1 flex flex-col items-center gap-3 min-h-0 overflow-y-auto py-0.5 [scrollbar-width:thin]">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMenu(item.id)}
            title={item.label}
            className={`w-11 h-11 shrink-0 rounded-2xl inline-flex items-center justify-center transition-all duration-200 ${
              activeMenu === item.id
                ? 'bg-[#08afd5]/15 dark:bg-[#08afd5]/25 text-[#08afd5] dark:text-[#6edff3] shadow-inner'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-800/70'
            }`}
          >
            {item.icon}
          </button>
        ))}
      </nav>
      <div className="flex flex-col items-center gap-2.5 mt-auto pt-2 shrink-0">
        <button
          type="button"
          onClick={handleSecureLogout}
          disabled={logoutBusy}
          title="Güvenli çıkış — Ana siteye dön"
          aria-label="Güvenli çıkış"
          className="w-11 h-11 rounded-2xl inline-flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors disabled:opacity-50"
        >
          <LogOut size={20} />
        </button>
        <button
          type="button"
          onClick={() => setActiveMenu('profile')}
          title="Profilim"
          aria-label="Profilim"
          aria-current={activeMenu === 'profile' ? 'page' : undefined}
          className={`relative w-11 h-11 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5] flex items-center justify-center transition-all ${
            activeMenu === 'profile'
              ? 'ring-[#08afd5] dark:ring-[#6edff3] ring-offset-[#08afd5]/20 shadow-[0_0_0_3px_rgba(8,175,213,0.2)]'
              : 'ring-[#08afd5]/35 dark:ring-[#6edff3]/40 bg-gray-200/80 dark:bg-gray-700/80 hover:opacity-90'
          }`}
        >
          {profileData?.profilePhotoURL ? (
            <img
              src={profileData.profilePhotoURL}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden />
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="mac-app-shell transition-colors duration-300 w-full min-w-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[78px] mac-sidebar z-50 flex-col items-center py-5">
        {renderSidebar()}
      </aside>

      {/* Mobile Hamburger Menu */}
      {isMobile && (
        <div className="fixed top-0 left-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-800/60 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="h-10 w-10 shrink-0" aria-hidden />
            <button
              type="button"
              onClick={() => {
                setActiveMenu('dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-24 h-10 md:w-8 md:h-8 rounded-xl overflow-hidden flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <img src="/pics/infulogo.png" alt="Infuhub" className="w-full h-full object-contain" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Menüyü Aç"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0 mac-sidebar [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigasyon Menüsü</SheetTitle>
            <SheetDescription>Ana menü seçenekleri</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col h-full py-5 px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center">
                <img src="/pics/infulogo.png" alt="Infuhub" className="w-full h-full object-contain" />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Menüyü Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 flex flex-col gap-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full px-4 py-3 rounded-xl inline-flex items-center gap-3 transition-all duration-200 ${
                    activeMenu === item.id
                      ? 'bg-[#08afd5]/15 dark:bg-[#08afd5]/25 text-[#08afd5] dark:text-[#6edff3] shadow-inner'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-800/70'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="pt-4 mt-2 border-t border-gray-200/70 dark:border-gray-700/60">
              <button
                type="button"
                onClick={handleSecureLogout}
                disabled={logoutBusy}
                className="w-full px-4 py-3 rounded-xl inline-flex items-center justify-center gap-2 font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors disabled:opacity-50"
              >
                <LogOut size={18} />
                {logoutBusy ? 'Çıkılıyor…' : 'Güvenli çıkış'}
              </button>
              <div className="flex justify-center mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('profile');
                    setMobileMenuOpen(false);
                  }}
                  title="Profilim"
                  aria-label="Profilim"
                  aria-current={activeMenu === 'profile' ? 'page' : undefined}
                  className={`relative w-12 h-12 rounded-full ring-2 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5] flex items-center justify-center transition-all ${
                    activeMenu === 'profile'
                      ? 'ring-[#08afd5] dark:ring-[#6edff3] shadow-[0_0_0_3px_rgba(8,175,213,0.2)]'
                      : 'ring-[#08afd5]/35 dark:ring-[#6edff3]/40 bg-gray-200/80 dark:bg-gray-700/80'
                  }`}
                >
                  {profileData?.profilePhotoURL ? (
                    <img
                      src={profileData.profilePhotoURL}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-500 dark:text-gray-400" aria-hidden />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-center text-gray-500 dark:text-gray-500 mt-3 px-1">
                Oturum kapatılır ve ana siteye yönlendirilirsiniz.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main className="w-full min-w-0 max-w-none md:pl-[78px] p-0 pt-[64px] md:pt-0">
        {influencerId && (
          <div className={activeMenu === 'dashboard' ? undefined : 'hidden'} aria-hidden={activeMenu !== 'dashboard'}>
            <ProfileHero
              profileData={profileData}
              stats={profileHeroStats}
              onProfileUpdate={loadProfileData}
              onNotificationClick={handleNotificationClick}
              onOpenMessages={() => setActiveMenu('messages')}
              onOpenAudienceMatch={() => setAudienceMatchDialogOpen(true)}
              canOperate={canOperate}
              isMobile={isMobile}
              profileEditDialogOpen={profileEditDialogOpen}
              onProfileEditDialogOpenChange={setProfileEditDialogOpen}
            />
          </div>
        )}

        {activeMenu === 'offers' && influencerId && (
          <div className={INFLUENCER_SUBPAGE_SHELL}>
            <OffersContent
              influencerId={influencerId}
              onOfferAccepted={loadOffers}
              onOpenDeliveriesForOffer={openDeliveriesForOffer}
              canOperate={canOperate}
            />
          </div>
        )}

        {activeMenu === 'campaigns' && (
          <div className={INFLUENCER_SUBPAGE_SHELL}>
            <CampaignsContent influencerId={influencerId} canOperate={canOperate} />
          </div>
        )}

        {activeMenu === 'deliveries' && influencerId && (
          <div className={INFLUENCER_SUBPAGE_SHELL}>
            <DeliveriesContent influencerId={influencerId} canOperate={canOperate} />
          </div>
        )}

        {activeMenu === 'earnings' && influencerId && (
          <div className={INFLUENCER_SUBPAGE_SHELL}>
            <EarningsContent
              influencerId={influencerId}
              profile={profileData}
              offers={offers}
              canOperate={canOperate}
              onRefresh={async () => {
                await loadProfileData();
                await loadOffers();
              }}
            />
          </div>
        )}

        {activeMenu === 'messages' && influencerId && (
          <div className={`w-full max-w-none min-w-0 ${INFLUENCER_PANEL_GUTTER_X} pt-4 md:pt-6`}>
            <MessagesPanel
              userId={influencerId}
              userType="influencer"
              onOpenOffer={() => {
                setActiveMenu('offers');
              }}
            />
          </div>
        )}

        {activeMenu === 'settings' && influencerId && (
          <div className={INFLUENCER_SUBPAGE_SHELL}>
            <InfluencerSettingsContent
              influencerId={influencerId}
              profile={profileData}
              onOpenProfileEdit={() => setProfileEditDialogOpen(true)}
              onOpenAudienceMatch={() => setAudienceMatchDialogOpen(true)}
              onGoToEarnings={() => setActiveMenu('earnings')}
              onLogout={handleSecureLogout}
              logoutBusy={logoutBusy}
            />
          </div>
        )}

        {activeMenu === 'profile' && influencerId && (
          <div className={INFLUENCER_SUBPAGE_SHELL}>
            <InfluencerProfileContent
              influencerId={influencerId}
              profile={profileData}
              onOpenAudienceMatch={() => setAudienceMatchDialogOpen(true)}
              onRefresh={() => void loadProfileData()}
            />
          </div>
        )}

        {activeMenu !== 'dashboard' &&
          activeMenu !== 'offers' &&
          activeMenu !== 'campaigns' &&
          activeMenu !== 'messages' &&
          activeMenu !== 'deliveries' &&
          activeMenu !== 'earnings' &&
          activeMenu !== 'profile' &&
          activeMenu !== 'settings' && (
          <div className={`w-full mt-10 ${INFLUENCER_PANEL_GUTTER_X}`}>
            <div className="max-w-2xl mx-auto text-center">
            <div className="mac-surface aspect-[4/3] max-w-md mx-auto p-12 flex flex-col items-center justify-center">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-[#08afd5]/15 dark:bg-[#08afd5]/25 flex items-center justify-center">
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
          </div>
        )}
      </main>

      {influencerId && (
        <InfluencerAudienceMatchDialog
          open={audienceMatchDialogOpen}
          onOpenChange={setAudienceMatchDialogOpen}
          profile={profileData}
          onSaved={() => {
            void loadProfileData();
          }}
        />
      )}
    </div>
  );
}








