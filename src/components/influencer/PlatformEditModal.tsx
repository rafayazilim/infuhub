import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Instagram, Youtube, Edit, Save, AlertCircle } from 'lucide-react';
import { SiPinterest, SiSnapchat, SiTwitch, SiKick, SiLinkedin } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InfluencerProfile, updateInfluencerProfile } from '@/services/firebaseInfluencerService';
import { useToast } from '@/hooks/use-toast';

// TikTok icon
const TikTokIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// Twitter icon
const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
  </svg>
);

interface Platform {
  id: string;
  username: string;
  followers?: number;
  followersUpdated?: boolean; // Takipçi sayısı daha önce güncellendi mi?
}

interface PlatformEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: InfluencerProfile | null;
  onUpdate: () => void;
}

const platformOptions = [
  { id: 'instagram', label: 'Instagram', icon: <Instagram size={18} /> },
  { id: 'tiktok', label: 'TikTok', icon: <TikTokIcon /> },
  { id: 'youtube', label: 'YouTube', icon: <Youtube size={18} /> },
  { id: 'twitter', label: 'Twitter', icon: <TwitterIcon /> },
  { id: 'pinterest', label: 'Pinterest', icon: <SiPinterest size={18} /> },
  { id: 'snapchat', label: 'Snapchat', icon: <SiSnapchat size={18} /> },
  { id: 'twitch', label: 'Twitch', icon: <SiTwitch size={18} /> },
  { id: 'kick', label: 'Kick', icon: <SiKick size={18} /> },
  { id: 'linkedin', label: 'LinkedIn', icon: <SiLinkedin size={18} /> },
];

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram size={18} />,
  tiktok: <TikTokIcon />,
  youtube: <Youtube size={18} />,
  twitter: <TwitterIcon />,
  pinterest: <SiPinterest size={18} />,
  snapchat: <SiSnapchat size={18} />,
  twitch: <SiTwitch size={18} />,
  kick: <SiKick size={18} />,
  linkedin: <SiLinkedin size={18} />,
};

export function PlatformEditModal({
  isOpen,
  onClose,
  profileData,
  onUpdate,
}: PlatformEditModalProps) {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newPlatform, setNewPlatform] = useState<{
    id: string;
    username: string;
    followers: string;
  }>({
    id: '',
    username: '',
    followers: '',
  });

  // Profil verilerini platforms array formatına çevir
  useEffect(() => {
    if (!profileData?.platforms) {
      setPlatforms([]);
      return;
    }

    if (Array.isArray(profileData.platforms)) {
      // Array formatında - followersUpdated kontrolü ekle
      const platformsWithUpdateFlag = profileData.platforms.map((p: Platform) => ({
        ...p,
        // Eğer followersUpdated belirtilmemişse, false olarak başlat (bir kere daha güncellenebilir)
        // Eğer belirtilmişse, o değeri kullan
        followersUpdated: p.followersUpdated !== undefined ? p.followersUpdated : false,
      }));
      setPlatforms(platformsWithUpdateFlag);
    } else {
      // Object formatını array'e çevir
      const platformsArray: Platform[] = [];
      const platformsObj = profileData.platforms as any;
      
      if (platformsObj.instagram) {
        platformsArray.push({
          id: 'instagram',
          username: platformsObj.instagram.username,
          followers: platformsObj.instagram.followers,
          followersUpdated: platformsObj.instagram.followersUpdated !== undefined 
            ? platformsObj.instagram.followersUpdated 
            : false,
        });
      }
      if (platformsObj.tiktok) {
        platformsArray.push({
          id: 'tiktok',
          username: platformsObj.tiktok.username,
          followers: platformsObj.tiktok.followers,
          followersUpdated: platformsObj.tiktok.followersUpdated !== undefined 
            ? platformsObj.tiktok.followersUpdated 
            : false,
        });
      }
      if (platformsObj.youtube) {
        platformsArray.push({
          id: 'youtube',
          username: platformsObj.youtube.username,
          followers: platformsObj.youtube.followers,
          followersUpdated: platformsObj.youtube.followersUpdated !== undefined 
            ? platformsObj.youtube.followersUpdated 
            : false,
        });
      }
      if (platformsObj.twitter) {
        platformsArray.push({
          id: 'twitter',
          username: platformsObj.twitter.username,
          followers: platformsObj.twitter.followers,
          followersUpdated: platformsObj.twitter.followersUpdated !== undefined 
            ? platformsObj.twitter.followersUpdated 
            : false,
        });
      }
      if (platformsObj.pinterest) {
        platformsArray.push({
          id: 'pinterest',
          username: platformsObj.pinterest.username,
          followers: platformsObj.pinterest.followers,
          followersUpdated: platformsObj.pinterest.followersUpdated !== undefined
            ? platformsObj.pinterest.followersUpdated
            : false,
        });
      }
      if (platformsObj.snapchat) {
        platformsArray.push({
          id: 'snapchat',
          username: platformsObj.snapchat.username,
          followers: platformsObj.snapchat.followers,
          followersUpdated: platformsObj.snapchat.followersUpdated !== undefined
            ? platformsObj.snapchat.followersUpdated
            : false,
        });
      }
      if (platformsObj.twitch) {
        platformsArray.push({
          id: 'twitch',
          username: platformsObj.twitch.username,
          followers: platformsObj.twitch.followers,
          followersUpdated: platformsObj.twitch.followersUpdated !== undefined
            ? platformsObj.twitch.followersUpdated
            : false,
        });
      }
      if (platformsObj.kick) {
        platformsArray.push({
          id: 'kick',
          username: platformsObj.kick.username,
          followers: platformsObj.kick.followers,
          followersUpdated: platformsObj.kick.followersUpdated !== undefined
            ? platformsObj.kick.followersUpdated
            : false,
        });
      }
      if (platformsObj.linkedin) {
        platformsArray.push({
          id: 'linkedin',
          username: platformsObj.linkedin.username,
          followers: platformsObj.linkedin.followers,
          followersUpdated: platformsObj.linkedin.followersUpdated !== undefined
            ? platformsObj.linkedin.followersUpdated
            : false,
        });
      }
      setPlatforms(platformsArray);
    }
  }, [profileData, isOpen]);

  // Platform düzenleme
  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  // Platform güncelleme
  const handleUpdatePlatform = (index: number, updates: Partial<Platform>) => {
    const updated = [...platforms];
    const currentPlatform = updated[index];
    
    // Takipçi sayısı güncelleniyorsa kontrol et
    if (updates.followers !== undefined) {
      const newFollowersValue = updates.followers;
      const oldFollowersValue = currentPlatform.followers;
      
      // Eğer mevcut takipçi sayısı varsa VE daha önce güncellenmişse, değişikliği engelle
      if (oldFollowersValue !== undefined && oldFollowersValue !== null && currentPlatform.followersUpdated) {
        toast({
          title: 'Uyarı',
          description: 'Bu platform için takipçi sayısı yalnızca bir kere güncellenebilir.',
          variant: 'destructive',
        });
        return;
      }
      
      // Takipçi sayısı değişiyorsa (yeni değer giriliyor veya değiştiriliyor), followersUpdated flag'ini true yap
      if (newFollowersValue !== oldFollowersValue) {
        updated[index] = { 
          ...currentPlatform, 
          ...updates,
          followersUpdated: true,
        };
      } else {
        updated[index] = { ...currentPlatform, ...updates };
      }
    } else {
      // Takipçi sayısı dışındaki güncellemeler
      updated[index] = { ...currentPlatform, ...updates };
    }
    
    setPlatforms(updated);
  };

  // Platform silme
  const handleDeletePlatform = (index: number) => {
    if (window.confirm('Bu platformu silmek istediğinize emin misiniz?')) {
      const updated = platforms.filter((_, i) => i !== index);
      setPlatforms(updated);
    }
  };

  // Yeni platform ekleme
  const handleAddPlatform = () => {
    if (!newPlatform.id || !newPlatform.username) {
      toast({
        title: 'Hata',
        description: 'Lütfen platform ve kullanıcı adı girin.',
        variant: 'destructive',
      });
      return;
    }

    // Aynı platform zaten var mı kontrol et
    if (platforms.some((p) => p.id === newPlatform.id)) {
      toast({
        title: 'Hata',
        description: 'Bu platform zaten eklenmiş.',
        variant: 'destructive',
      });
      return;
    }

    const followers = newPlatform.followers
      ? parseInt(newPlatform.followers.replace(/\D/g, ''), 10)
      : undefined;

    setPlatforms([
      ...platforms,
      {
        id: newPlatform.id,
        username: newPlatform.username,
        followers,
        // Yeni platform eklenirken takipçi sayısı girilmişse, bu ilk giriş sayılır ve güncelleme yapılabilir
        // followersUpdated: false olarak başlatıyoruz, böylece ileride bir kere daha güncelleyebilir
        followersUpdated: false,
      },
    ]);

    // Formu sıfırla
    setNewPlatform({ id: '', username: '', followers: '' });
  };

  // Tüm değişiklikleri kaydet
  const handleSave = async () => {
    if (!profileData?.id) {
      toast({
        title: 'Hata',
        description: 'Profil bilgisi bulunamadı.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      await updateInfluencerProfile(profileData.id, {
        platforms: platforms,
      });

      toast({
        title: 'Başarılı',
        description: 'Platform bilgileri güncellendi.',
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Platform güncelleme hatası:', error);
      toast({
        title: 'Hata',
        description: error.message || 'Platform bilgileri güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Takipçi sayısını formatla (sadece sayı girişi için)
  const formatFollowersInput = (value: string): string => {
    // Sadece sayıları al
    return value.replace(/\D/g, '');
  };

  // Mevcut platformları filtrele (yeni ekleme için)
  const getAvailablePlatforms = () => {
    const usedIds = platforms.map((p) => p.id);
    return platformOptions.filter((p) => !usedIds.includes(p.id));
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
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-4 pointer-events-none"
          >
            <div 
              className="mac-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-800/50 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-800/50">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Platform Bilgilerini Düzenle
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Sosyal medya platformlarınızı yönetin
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="space-y-6">
                  {/* Mevcut Platformlar */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Mevcut Platformlar
                    </h4>
                    {platforms.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Henüz platform eklenmemiş
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {platforms.map((platform, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50"
                          >
                            {editingIndex === index ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="text-[#08afd5] dark:text-[#7ce7ff]">
                                    {platformIcons[platform.id] || <Instagram size={20} />}
                                  </div>
                                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                                    {platformOptions.find((p) => p.id === platform.id)?.label ||
                                      platform.id}
                                  </span>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-700 dark:text-gray-300">
                                    Kullanıcı Adı
                                  </Label>
                                  <Input
                                    value={platform.username}
                                    onChange={(e) =>
                                      handleUpdatePlatform(index, { username: e.target.value })
                                    }
                                    className="mt-1"
                                    placeholder="@username"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-700 dark:text-gray-300">
                                    Takipçi Sayısı
                                    {platform.followers !== undefined && platform.followers !== null && platform.followersUpdated && (
                                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                                        (Yalnızca bir kere güncellenebilir)
                                      </span>
                                    )}
                                  </Label>
                                  <Input
                                    type="text"
                                    value={
                                      platform.followers
                                        ? platform.followers.toLocaleString('tr-TR')
                                        : ''
                                    }
                                    onChange={(e) => {
                                      const value = formatFollowersInput(e.target.value);
                                      handleUpdatePlatform(index, {
                                        followers: value ? parseInt(value, 10) : undefined,
                                      });
                                    }}
                                    className="mt-1"
                                    placeholder="100000"
                                    disabled={
                                      platform.followers !== undefined && 
                                      platform.followers !== null && 
                                      platform.followersUpdated
                                    }
                                  />
                                  {platform.followers !== undefined && platform.followers !== null && platform.followersUpdated && (
                                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      <AlertCircle size={12} />
                                      Bu platform için takipçi sayısı daha önce güncellenmiş. Manipülasyonu önlemek için tekrar güncelleyemezsiniz.
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => setEditingIndex(null)}
                                  className="w-full"
                                >
                                  <Save size={16} className="mr-2" />
                                  Kaydet
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="text-[#08afd5] dark:text-[#7ce7ff]">
                                    {platformIcons[platform.id] || <Instagram size={20} />}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {platformOptions.find((p) => p.id === platform.id)?.label ||
                                        platform.id}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      @{platform.username}
                                    </p>
                                    {platform.followers && (
                                      <p className="text-xs text-gray-500 dark:text-gray-500">
                                        {platform.followers.toLocaleString('tr-TR')} takipçi
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(index)}
                                  >
                                    <Edit size={14} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                    onClick={() => handleDeletePlatform(index)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Yeni Platform Ekleme */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Yeni Platform Ekle
                    </h4>
                    <div className="p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                      <div>
                        <Label className="text-sm text-gray-700 dark:text-gray-300">
                          Platform
                        </Label>
                        <Select
                          value={newPlatform.id}
                          onValueChange={(value) =>
                            setNewPlatform({ ...newPlatform, id: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Platform seçin" />
                          </SelectTrigger>
                          <SelectContent className="z-[70]">
                            {getAvailablePlatforms().length === 0 ? (
                              <SelectItem value="no-platform" disabled>
                                Tüm platformlar eklenmiş
                              </SelectItem>
                            ) : (
                              getAvailablePlatforms().map((platform) => (
                                <SelectItem key={platform.id} value={platform.id}>
                                  <div className="flex items-center gap-2">
                                    {platform.icon}
                                    {platform.label}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-700 dark:text-gray-300">
                          Kullanıcı Adı
                        </Label>
                        <Input
                          value={newPlatform.username}
                          onChange={(e) =>
                            setNewPlatform({ ...newPlatform, username: e.target.value })
                          }
                          className="mt-1"
                          placeholder="@username"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-gray-700 dark:text-gray-300">
                          Takipçi Sayısı (Opsiyonel)
                        </Label>
                        <Input
                          type="text"
                          value={newPlatform.followers}
                          onChange={(e) =>
                            setNewPlatform({
                              ...newPlatform,
                              followers: formatFollowersInput(e.target.value),
                            })
                          }
                          className="mt-1"
                          placeholder="100000"
                        />
                      </div>
                      <Button
                        onClick={handleAddPlatform}
                        className="w-full"
                        disabled={!newPlatform.id || !newPlatform.username}
                      >
                        <Plus size={16} className="mr-2" />
                        Platform Ekle
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200/50 dark:border-gray-800/50">
                <Button variant="outline" onClick={onClose} disabled={isSaving}>
                  İptal
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Kaydediliyor...
                    </span>
                  ) : (
                    'Değişiklikleri Kaydet'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}



