import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Instagram,
  Youtube,
  DollarSign,
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle2,
  Edit,
  Camera,
} from 'lucide-react';
import { InfluencerProfile } from '@/services/firebaseInfluencerService';
import { uploadProfilePhoto } from '@/services/firebaseInfluencerService';
import { useToast } from '@/hooks/use-toast';
import { PlatformEditModal } from './PlatformEditModal';

// TikTok icon component
const TikTokIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// Twitter icon component
const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
  </svg>
);

interface ProfileHeroStats {
  completedCampaigns: number;
  totalEarnings: number;
  totalEngagement: number;
  pendingOffers: number;
  acceptedOffers: number;
}

interface ProfileHeroProps {
  profileData: InfluencerProfile | null;
  stats: ProfileHeroStats;
  onProfileUpdate?: () => void;
}

// localStorage key for profile photo
const getProfilePhotoKey = (userId: string) => `profile_photo_${userId}`;

// Görseli base64'e çevir ve localStorage'a kaydet
const saveImageToLocalStorage = (userId: string, file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      const key = getProfilePhotoKey(userId);
      localStorage.setItem(key, base64String);
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// localStorage'dan görseli yükle
const loadImageFromLocalStorage = (userId: string): string | null => {
  const key = getProfilePhotoKey(userId);
  return localStorage.getItem(key);
};

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram size={18} />,
  tiktok: <TikTokIcon />,
  youtube: <Youtube size={18} />,
  twitter: <TwitterIcon />,
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(price);
};

export function ProfileHero({ profileData, stats, onProfileUpdate }: ProfileHeroProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localProfilePhoto, setLocalProfilePhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);

  // Component mount olduğunda localStorage'dan görseli yükle
  useEffect(() => {
    if (profileData?.id) {
      const savedPhoto = loadImageFromLocalStorage(profileData.id);
      if (savedPhoto) {
        setLocalProfilePhoto(savedPhoto);
      }
    }
  }, [profileData?.id]);

  // Görsel seçme
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Hata',
        description: 'Lütfen geçerli bir görsel dosyası seçin.',
        variant: 'destructive',
      });
      return;
    }

    // Dosya boyutu kontrolü (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Hata',
        description: 'Görsel boyutu 5MB\'dan küçük olmalıdır.',
        variant: 'destructive',
      });
      return;
    }

    if (!profileData?.id) {
      toast({
        title: 'Hata',
        description: 'Profil bilgisi bulunamadı.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    // Önce localStorage'a kaydet
    saveImageToLocalStorage(profileData.id, file)
      .then((base64String) => {
        setLocalProfilePhoto(base64String);
        
        // Firebase'e de yükle (opsiyonel - async)
        uploadProfilePhoto(profileData.id, file)
          .then(() => {
            toast({
              title: 'Başarılı',
              description: 'Profil fotoğrafı güncellendi.',
            });
            onProfileUpdate?.();
          })
          .catch((error) => {
            console.error('Firebase yükleme hatası:', error);
            // Firebase hatası olsa bile local'de kaydedildi, kullanıcıya bilgi ver
            toast({
              title: 'Uyarı',
              description: 'Fotoğraf yerel olarak kaydedildi, ancak sunucuya yüklenirken bir hata oluştu.',
            });
          })
          .finally(() => {
            setIsUploading(false);
          });
      })
      .catch((error) => {
        console.error('Görsel kaydetme hatası:', error);
        toast({
          title: 'Hata',
          description: 'Görsel kaydedilirken bir hata oluştu.',
          variant: 'destructive',
        });
        setIsUploading(false);
      });

    // Input'u sıfırla
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fotoğrafa tıklama
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  // Görsel URL'ini belirle (öncelik: local > Firebase > default)
  const getProfilePhotoUrl = (): string | null => {
    if (localProfilePhoto) return localProfilePhoto;
    if (profileData?.profilePhotoURL) return profileData.profilePhotoURL;
    return null;
  };

  const getPlatforms = () => {
    if (!profileData?.platforms) return [];
    
    if (Array.isArray(profileData.platforms)) {
      return profileData.platforms.map((p) => ({
        id: p.id,
        username: p.username,
        followers: p.followers || 0,
      }));
    }
    
    // Object format
    const platforms: Array<{ id: string; username: string; followers: number }> = [];
    if (profileData.platforms.instagram) {
      platforms.push({
        id: 'instagram',
        username: profileData.platforms.instagram.username,
        followers: profileData.platforms.instagram.followers,
      });
    }
    if (profileData.platforms.tiktok) {
      platforms.push({
        id: 'tiktok',
        username: profileData.platforms.tiktok.username,
        followers: profileData.platforms.tiktok.followers,
      });
    }
    if (profileData.platforms.youtube) {
      platforms.push({
        id: 'youtube',
        username: profileData.platforms.youtube.username,
        followers: profileData.platforms.youtube.followers,
      });
    }
    if (profileData.platforms.twitter) {
      platforms.push({
        id: 'twitter',
        username: profileData.platforms.twitter.username,
        followers: profileData.platforms.twitter.followers,
      });
    }
    return platforms;
  };

  const platforms = getPlatforms();
  const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <Card className="p-8 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-900/10 shadow-lg">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Photo & Basic Info */}
          <div className="flex-shrink-0">
            <div className="relative">
              {/* Gizli file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {/* Profil fotoğrafı */}
              <div
                onClick={handlePhotoClick}
                className="relative w-32 h-32 rounded-full overflow-hidden cursor-pointer group border-4 border-white dark:border-gray-800 shadow-lg transition-all hover:scale-105"
              >
                {getProfilePhotoUrl() ? (
                  <img
                    src={getProfilePhotoUrl()!}
                    alt={profileData?.fullName || 'Profil'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                    <User size={48} />
                  </div>
                )}
                
                {/* Hover overlay - Kamera ikonu */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {isUploading ? (
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera className="text-white" size={24} />
                  )}
                </div>
              </div>
              
              {/* Aktif badge */}
              <Badge
                className="absolute -bottom-2 -right-2 bg-green-500 text-white border-2 border-white dark:border-gray-900 z-10"
              >
                Aktif
              </Badge>
            </div>
          </div>

          {/* Main Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {profileData?.fullName || 'Influencer'}
                </h2>
                {profileData?.bio && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-2xl">
                    {profileData.bio}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setIsPlatformModalOpen(true)}
              >
                <Edit size={16} className="mr-2" />
                Platformları Düzenle
              </Button>
            </div>

            {/* Categories */}
            {profileData?.categories && profileData.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profileData.categories.map((category, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            )}

            {/* Platform Stats */}
            {platforms.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {platforms.map((platform) => (
                  <div
                    key={platform.id}
                    className="p-3 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-purple-600 dark:text-purple-400">
                        {platformIcons[platform.id] || <User size={18} />}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {platform.id}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      @{platform.username}
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatNumber(platform.followers)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="text-purple-600 dark:text-purple-400" size={18} />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Tamamlanan
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completedCampaigns}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="text-green-600 dark:text-green-400" size={18} />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Toplam Kazanç
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(stats.totalEarnings)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-blue-600 dark:text-blue-400" size={18} />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Etkileşim
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(stats.totalEngagement)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-yellow-200/50 dark:border-yellow-800/30 bg-yellow-50/50 dark:bg-yellow-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-yellow-600 dark:text-yellow-400" size={18} />
                  <span className="text-xs font-medium text-yellow-600 dark:text-yellow-500">
                    Bekleyen
                  </span>
                </div>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {stats.pendingOffers}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-green-200/50 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="text-green-600 dark:text-green-400" size={18} />
                  <span className="text-xs font-medium text-green-600 dark:text-green-500">
                    Kabul Edilen
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats.acceptedOffers}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Platform Düzenleme Modalı */}
      <PlatformEditModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
        profileData={profileData}
        onUpdate={onProfileUpdate}
      />
    </motion.div>
  );
}
