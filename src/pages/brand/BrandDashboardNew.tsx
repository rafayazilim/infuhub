import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Megaphone,
  Wallet,
  Users,
  MessageSquare,
  BarChart3,
  Link2,
  FileText,
  Bell,
  Settings,
  X,
  TrendingUp,
  Clock,
  Target,
  MousePointerClick,
  CheckCircle2,
  Menu,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';
import { CampaignsContent } from '@/components/brand/CampaignsContent';
import { getCampaignSummary } from '@/services/firebaseCampaignService';
import { getOfferStats } from '@/services/firebaseOfferService';
import { getTrackingLinksByBrand, sumClicks } from '@/services/firebaseTrackingService';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[10px] transition-all duration-150 ${
      active
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
          <div className="p-2.5 rounded-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
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

export default function BrandDashboardNew() {
  const { theme, setTheme } = useTheme();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
  const [totalClicks, setTotalClicks] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [campaignData, setCampaignData] = useState({
    productName: '',
    productDescription: '',
    ageRange: '',
    interests: '',
    location: '',
    totalBudget: '',
    offerPerInfluencer: '',
    startDate: '',
    endDate: '',
    platforms: [] as string[],
    contentFormats: [] as string[],
  });

  // Mock brand ID - gerçek uygulamada localStorage'dan gelecek
  const getBrandId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || '1767912596659-eekjsdequ';
  };
  const brandId = getBrandId();

  // Kampanya istatistiklerini yükle
  useEffect(() => {
    if (brandId && activeMenu === 'dashboard') {
      loadDashboardStats();
    }
  }, [brandId, activeMenu]);

  const loadDashboardStats = async () => {
    try {
      const [stats, offers, trackingLinks] = await Promise.all([
        getCampaignSummary(brandId),
        getOfferStats(brandId),
        getTrackingLinksByBrand(brandId),
      ]);

      setCampaignStats(stats);
      setOfferStats(offers);
      const clicks = sumClicks(trackingLinks);
      setTotalClicks(clicks);
      const rate = offers.total > 0 ? (offers.accepted / offers.total) * 100 : 0;
      setConversionRate(rate);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  // ESC tuşu ile modal kapatma
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreateCampaignOpen) {
          handleCloseModal();
        }
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isCreateCampaignOpen, isSidebarOpen]);

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'campaigns', icon: <Megaphone size={18} />, label: 'Kampanyalar' },
    { id: 'budget', icon: <Wallet size={18} />, label: 'Bütçe & Harcamalar' },
    { id: 'offers', icon: <Users size={18} />, label: 'Influencer Teklifleri' },
    { id: 'messages', icon: <MessageSquare size={18} />, label: 'Mesajlar' },
    { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Analitik' },
    { id: 'tracking', icon: <Link2 size={18} />, label: 'Takip Linkleri' },
    { id: 'reports', icon: <FileText size={18} />, label: 'Raporlar' },
    { id: 'notifications', icon: <Bell size={18} />, label: 'Bildirimler' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Ayarlar' },
  ];

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

  const platforms = ['Instagram', 'TikTok', 'YouTube'];
  const contentFormats = ['Story', 'Reels', 'Post', 'Video'];

  const togglePlatform = (platform: string) => {
    setCampaignData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const toggleContentFormat = (format: string) => {
    setCampaignData((prev) => ({
      ...prev,
      contentFormats: prev.contentFormats.includes(format)
        ? prev.contentFormats.filter((f) => f !== format)
        : [...prev.contentFormats, format],
    }));
  };

  const handleSaveCampaign = async () => {
    // Validation
    if (!campaignData.productName || !campaignData.totalBudget) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }

    setIsSaving(true);

    try {
      // Firebase'e kampanya kaydet
      const { createCampaign } = await import('@/services/firebaseCampaignService');
      
      await createCampaign(brandId, {
        title: campaignData.productName,
        productInfo: campaignData.productName,
        productDescription: campaignData.productDescription,
        targetAudience: {
          ageRange: campaignData.ageRange,
          interests: campaignData.interests,
          location: campaignData.location,
        },
        budget: {
          total: parseFloat(campaignData.totalBudget),
          perInfluencer: campaignData.offerPerInfluencer
            ? parseFloat(campaignData.offerPerInfluencer)
            : undefined,
        },
        duration: {
          start: campaignData.startDate,
          end: campaignData.endDate,
        },
        platforms: campaignData.platforms,
        contentFormats: campaignData.contentFormats,
      });

      // Reset form
      setCampaignData({
        productName: '',
        productDescription: '',
        ageRange: '',
        interests: '',
        location: '',
        totalBudget: '',
        offerPerInfluencer: '',
        startDate: '',
        endDate: '',
        platforms: [],
        contentFormats: [],
      });

      setIsCreateCampaignOpen(false);
      
      // İstatistikleri yenile
      await loadDashboardStats();
      
      alert('Kampanya başarıyla oluşturuldu!');
    } catch (error: any) {
      console.error('Kampanya kaydetme hatası:', error);
      alert(error.message || 'Kampanya kaydedilirken bir hata oluştu!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    const hasData = Object.values(campaignData).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== ''
    );

    if (hasData) {
      if (window.confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?')) {
        setIsCreateCampaignOpen(false);
      }
    } else {
      setIsCreateCampaignOpen(false);
    }
  };

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
            <div className="mb-8 max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Kampanyalarınızı yönetin ve performansı takip edin
              </p>
            </div>

            {/* Metrics Grid - 4:3 Aspect Ratio Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {metrics.map((metric, index) => (
                <MetricCard key={index} {...metric} />
              ))}
            </div>
          </>
        )}

        {/* Campaigns Content */}
        {activeMenu === 'campaigns' && (
          <CampaignsContent
            onCreateCampaign={() => setIsCreateCampaignOpen(true)}
            brandId={brandId}
          />
        )}

        {/* Empty State for other sections */}
        {activeMenu !== 'dashboard' && activeMenu !== 'campaigns' && (
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
              <div className="bg-white dark:bg-gray-900 rounded-[16px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-800/50">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Yeni Kampanya Oluştur
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Kampanya detaylarını girin
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 rounded-[8px] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X size={20} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] mac-scrollbar">
                  <div className="space-y-6">
                    {/* Ürün Bilgileri */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Ürün Bilgileri
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ürün Adı *
                          </label>
                          <input
                            type="text"
                            value={campaignData.productName}
                            onChange={(e) =>
                              setCampaignData({ ...campaignData, productName: e.target.value })
                            }
                            className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="Ürün adını girin"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ürün Açıklaması
                          </label>
                          <textarea
                            value={campaignData.productDescription}
                            onChange={(e) =>
                              setCampaignData({
                                ...campaignData,
                                productDescription: e.target.value,
                              })
                            }
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none mac-scrollbar"
                            placeholder="Ürün hakkında detaylı bilgi"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Hedef Kitle */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Hedef Kitle
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Yaş Aralığı
                          </label>
                          <input
                            type="text"
                            value={campaignData.ageRange}
                            onChange={(e) =>
                              setCampaignData({ ...campaignData, ageRange: e.target.value })
                            }
                            className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="18-35"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            İlgi Alanları
                          </label>
                          <input
                            type="text"
                            value={campaignData.interests}
                            onChange={(e) =>
                              setCampaignData({ ...campaignData, interests: e.target.value })
                            }
                            className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="Moda, Teknoloji"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Lokasyon
                          </label>
                          <input
                            type="text"
                            value={campaignData.location}
                            onChange={(e) =>
                              setCampaignData({ ...campaignData, location: e.target.value })
                            }
                            className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="Türkiye"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bütçe */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Bütçe
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Toplam Bütçe *
                          </label>
                          <input
                            type="number"
                            value={campaignData.totalBudget}
                            onChange={(e) =>
                              setCampaignData({ ...campaignData, totalBudget: e.target.value })
                            }
                            className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="50000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Influencer Başı Teklif
                          </label>
                          <input
                            type="number"
                            value={campaignData.offerPerInfluencer}
                            onChange={(e) =>
                              setCampaignData({
                                ...campaignData,
                                offerPerInfluencer: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="5000"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Kampanya Süresi */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Kampanya Süresi
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Başlangıç Tarihi
                          </label>
                          <input
                            type="date"
                            value={campaignData.startDate}
                            onChange={(e) =>
                              setCampaignData({ ...campaignData, startDate: e.target.value })
                            }
                            className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Bitiş Tarihi
                          </label>
                          <input
                            type="date"
                            value={campaignData.endDate}
                            onChange={(e) =>
                              setCampaignData({ ...campaignData, endDate: e.target.value })
                            }
                            className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Platform Seçimi */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Platform Seçimi
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {platforms.map((platform) => (
                          <button
                            key={platform}
                            onClick={() => togglePlatform(platform)}
                            className={`px-6 py-2.5 rounded-[10px] font-medium transition-all duration-150 ${
                              campaignData.platforms.includes(platform)
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* İçerik Formatı */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        İçerik Formatı
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {contentFormats.map((format) => (
                          <button
                            key={format}
                            onClick={() => toggleContentFormat(format)}
                            className={`px-6 py-2.5 rounded-[10px] font-medium transition-all duration-150 ${
                              campaignData.contentFormats.includes(format)
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {format}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200/50 dark:border-gray-800/50">
                  <Button
                    onClick={handleCloseModal}
                    variant="outline"
                    className="px-6 py-2.5 rounded-[10px]"
                    disabled={isSaving}
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleSaveCampaign}
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Kaydediliyor...
                      </span>
                    ) : (
                      'Kampanyayı Kaydet'
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
