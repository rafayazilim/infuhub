import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Upload,
  DollarSign,
  MessageSquare,
  BarChart3,
  Settings,
  Menu,
  Moon,
  Sun,
  Clock,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';
import { getInfluencerProfile, InfluencerProfile } from '@/services/firebaseInfluencerService';
import { getOffersByInfluencer, FirebaseOffer } from '@/services/firebaseOfferService';
import { getTrackingLinkByOfferId } from '@/services/trackingLinkService';
import { OffersContent } from '@/components/influencer/OffersContent';
import { ProfileHero } from '@/components/influencer/ProfileHero';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[10px] transition-all duration-150 ${active
      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
      }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

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
        ? 'border-purple-500/50 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-900/20'
        : 'border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900'
        }`}
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-2.5 rounded-[10px] ${highlight
              ? 'bg-purple-200 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300'
              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
              }`}
          >
            {icon}
          </div>
          {trend && (
            <Badge
              variant="secondary"
              className={`text-xs rounded-md ${highlight ? 'bg-purple-200 dark:bg-purple-800/50' : ''
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

interface ActionItemProps {
  title: string;
  description: string;
  type: 'offer' | 'content' | 'revision';
  count?: number;
}

const ActionItem: React.FC<ActionItemProps> = ({ title, description, type, count }) => {
  const icons = {
    offer: <FileText size={20} className="text-blue-600 dark:text-blue-400" />,
    content: <Upload size={20} className="text-orange-600 dark:text-orange-400" />,
    revision: <AlertCircle size={20} className="text-red-600 dark:text-red-400" />,
  };

  const colors = {
    offer: 'bg-blue-100 dark:bg-blue-900/30',
    content: 'bg-orange-100 dark:bg-orange-900/30',
    revision: 'bg-red-100 dark:bg-red-900/30',
  };

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="flex items-center gap-4 p-4 rounded-[10px] bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 cursor-pointer"
    >
      <div className={`p-2 rounded-[8px] ${colors[type]}`}>{icons[type]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      {count && (
        <Badge className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
          {count}
        </Badge>
      )}
    </motion.div>
  );
};

export default function InfluencerDashboardNew() {
  const { theme, setTheme } = useTheme();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileData, setProfileData] = useState<InfluencerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [influencerId, setInfluencerId] = useState<string | null>(null);
  const [offers, setOffers] = useState<FirebaseOffer[]>([]);
  const [totalClicks, setTotalClicks] = useState<number>(0);

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
        setOffers(offersData);
        
        // Kabul edilmiş tekliflerin tracking link'lerini çek ve toplam tıklama sayısını hesapla
        const acceptedOffers = offersData.filter(o => o.status === 'kabul');
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
    pending: offers.filter(o => o.status === 'beklemede').length,
    accepted: offers.filter(o => o.status === 'kabul').length,
    total: offers.length,
  };

  // ProfileHero için istatistikler
  const profileHeroStats = {
    completedCampaigns: 0, // TODO: Tamamlanan kampanya sayısı
    totalEarnings: offers
      .filter(o => o.status === 'kabul')
      .reduce((sum, o) => sum + o.price, 0),
    totalEngagement: totalClicks, // Toplam tıklama sayısı
    pendingOffers: offerStats.pending,
    acceptedOffers: offerStats.accepted,
  };

  // ESC tuşu ile sidebar kapatma
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSidebarOpen]);

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'offers', icon: <FileText size={18} />, label: 'Teklifler' },
    { id: 'campaigns', icon: <Briefcase size={18} />, label: 'Kampanyalarım' },
    { id: 'deliveries', icon: <Upload size={18} />, label: 'İçerik Teslimleri' },
    { id: 'earnings', icon: <DollarSign size={18} />, label: 'Kazançlar' },
    { id: 'messages', icon: <MessageSquare size={18} />, label: 'Mesajlar' },
    { id: 'performance', icon: <BarChart3 size={18} />, label: 'Performans' },
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
      icon: <DollarSign size={20} />,
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

  const actionItems: ActionItemProps[] = [
    {
      title: 'Onay Bekleyen Teklifler',
      description: 'Yeni kampanya teklifleri seni bekliyor',
      type: 'offer',
      count: offerStats.pending,
    },
    {
      title: 'İçerik Yüklemen Gereken Kampanyalar',
      description: 'Kabul ettiğin kampanyalar için içerik yükle',
      type: 'content',
      count: offerStats.accepted,
    },
    {
      title: 'Revizyon İsteyen Markalar',
      description: 'İçeriklerinde değişiklik talep edildi',
      type: 'revision',
      count: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Top Bar - MacOS Style */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-purple-600 dark:text-purple-400">İNFUHUB</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-gray-700 dark:text-gray-300" />
            ) : (
              <Moon size={18} className="text-gray-700 dark:text-gray-300" />
            )}
          </button>
        </div>
      </header>

      {/* Slide-over Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 mt-14"
            />

            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 p-4 z-40 overflow-y-auto mac-scrollbar"
            >
              <div className="mb-6">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Navigasyon
                </p>
              </div>

              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <MenuItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeMenu === item.id}
                    onClick={() => {
                      setActiveMenu(item.id);
                      setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-8">
        {/* Dashboard Content */}
        {activeMenu === 'dashboard' && (
          <>
            {/* Header */}
            <div className="mb-6 max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Hoş geldin{profileData?.fullName ? `, ${profileData.fullName}` : ''}! İşte senin için önemli bilgiler
              </p>
            </div>

            {/* Profile Hero Section */}
            <div className="max-w-7xl mx-auto">
              <ProfileHero
                profileData={profileData}
                stats={profileHeroStats}
                onProfileUpdate={loadProfileData}
              />
            </div>

            {/* Metrics Grid - Bekleyen Teklifler ve Aktif Kampanyalar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-8">
              {metrics.map((metric, index) => (
                <MetricCard key={index} {...metric} />
              ))}
            </div>

            {/* Action Items - Senden Beklenenler */}
            <div className="max-w-7xl mx-auto mb-8">
              <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-[10px] bg-purple-100 dark:bg-purple-900/30">
                    <AlertCircle className="text-purple-600 dark:text-purple-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Senden Beklenenler
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Acil aksiyonlar ve görevler
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {actionItems.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        if (item.type === 'offer' && item.count && item.count > 0) {
                          setActiveMenu('offers');
                        }
                      }}
                    >
                      <ActionItem {...item} />
                    </div>
                  ))}
                </div>

                {actionItems.every((item) => item.count === 0) && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Harika! Şu anda bekleyen görevin yok 🎉
                    </p>
                  </div>
                )}
              </Card>
            </div>

          </>
        )}

        {/* Offers Content */}
        {activeMenu === 'offers' && influencerId && (
          <OffersContent
            influencerId={influencerId}
            onOfferAccepted={loadOffers}
          />
        )}

        {/* Empty State for other sections */}
        {activeMenu !== 'dashboard' && activeMenu !== 'offers' && (
          <div className="mt-12 max-w-2xl mx-auto text-center">
            <div className="aspect-[4/3] max-w-md mx-auto p-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 mb-4 rounded-[12px] bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <LayoutDashboard className="text-purple-600 dark:text-purple-400" size={32} />
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
      </main>

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
