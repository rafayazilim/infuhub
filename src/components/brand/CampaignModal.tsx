import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createCampaign } from '@/services/firebaseCampaignService';
import { REGISTRATION_PLATFORM_DEFS } from '@/constants/registrationPlatforms';
import { RegistrationPlatformIcon } from '@/components/shared/RegistrationPlatformIcon';
import { trackEvent } from '@/utils/metaPixel';

interface CampaignData {
  productName: string;
  productDescription: string;
  ageRange: string;
  interests: string;
  location: string;
  totalBudget: string;
  offerPerInfluencer: string;
  startDate: string;
  endDate: string;
  platforms: string[];
  contentFormats: string[];
}

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  brandId: string;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({ isOpen, onClose, onSave, brandId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [campaignData, setCampaignData] = useState<CampaignData>({
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

  const handleSave = async () => {
    if (!campaignData.productName || !campaignData.totalBudget) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }

    setIsSaving(true);

    try {
      // Firebase'e kampanya kaydet
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

      trackEvent('CreateCampaign');

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

      onSave(); // Listeyi yenile
      onClose();
      alert('Kampanya başarıyla oluşturuldu!');
    } catch (error: any) {
      console.error('Kampanya kaydetme hatası:', error);
      alert(error.message || 'Kampanya kaydedilirken bir hata oluştu!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    const hasData = Object.values(campaignData).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== ''
    );

    if (hasData) {
      if (window.confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
                  onClick={handleClose}
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
                          className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
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
                          className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all resize-none mac-scrollbar"
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
                          className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
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
                          className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
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
                          className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
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
                          className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
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
                          className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
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
                          className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
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
                          className="w-full px-4 py-2.5 rounded-[10px] border border-gray-300/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#08afd5] focus:border-transparent transition-all"
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
                      {REGISTRATION_PLATFORM_DEFS.map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => togglePlatform(label)}
                          className={`px-6 py-2.5 rounded-[10px] font-medium transition-all duration-150 flex items-center gap-2 ${
                            campaignData.platforms.includes(label)
                              ? 'bg-[#08afd5] text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <RegistrationPlatformIcon platformId={id} size={18} />
                          {label}
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
                              ? 'bg-[#08afd5] text-white shadow-sm'
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
                  onClick={handleClose}
                  variant="outline"
                  className="px-6 py-2.5 rounded-[10px]"
                  disabled={isSaving}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="brand-btn-primary text-white px-6 py-2.5 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
};



