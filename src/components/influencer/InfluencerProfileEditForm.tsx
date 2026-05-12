import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Instagram, Youtube, ListChecks, Upload, XCircle, Save, FileText, Trash2, Loader2, Camera, User, Eye, EyeOff } from 'lucide-react';
import { SiPinterest, SiSnapchat, SiTwitch, SiKick, SiLinkedin } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { auth } from '@/config/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  INFLUENCER_PROFILE_CATEGORY_TREE as categoryTree,
  INFLUENCER_PROFILE_TOP_CATEGORIES as topCategories,
} from '@/constants/influencerProfileCategoryTree';
import { InfluencerProfile, updateInfluencerProfile, uploadProfilePhoto } from '@/services/firebaseInfluencerService';
import { uploadPortfolioFile, deletePortfolioFile } from '@/services/firebaseStorageService';
import { normalizeInfluencerPlatformsToArray } from '@/lib/influencerPlatforms';
import { PlatformEditModal } from './PlatformEditModal';

const TikTokIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);
const TwitterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
  </svg>
);

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

const fmtN = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : `${n}`;

export type InfluencerProfileEditFormProps = {
  profile: InfluencerProfile | null;
  onUpdate: () => void;
  onOpenAudienceMatch?: () => void;
  /** dialog içi kaydırmalı; sayfa modunda sınırsız */
  layout?: 'dialog' | 'page';
  /** Dialog kapat / sayfada dış sinyal (opsiyonel) */
  onCancel?: () => void;
  /** Sadece «Kaydet» (genel profil) başarılı olunca — diyaloğu kapatmak için */
  onMainProfileSave?: () => void;
};

export function InfluencerProfileEditForm({
  profile,
  onUpdate,
  onOpenAudienceMatch,
  layout = 'dialog',
  onCancel,
  onMainProfileSave,
}: InfluencerProfileEditFormProps) {
  const { toast } = useToast();
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [aboutText, setAboutText] = useState('');
  const [portfolioItems, setPortfolioItems] = useState<
    Array<{ url: string; type: 'image' | 'pdf'; name: string; storagePath?: string }>
  >([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [generalForm, setGeneralForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    categories: [] as string[],
    subCategories: {} as Record<string, string[]>,
    currentPassword: '',
    newPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pricingForm, setPricingForm] = useState({ post: '', story: '', reels: '', video: '' });

  useEffect(() => {
    if (!profile) return;
    setGeneralForm((p) => ({
      ...p,
      fullName: profile.fullName || '',
      email: profile.email || '',
      phone: typeof profile.phone === 'string' ? profile.phone : '',
      categories: profile.categories || [],
      subCategories: profile.subCategories || {},
    }));
  }, [profile]);

  useEffect(() => {
    setAboutText(profile?.bio || '');
    if (profile?.portfolio) {
      if (Array.isArray(profile.portfolio)) {
        const portfolio = profile.portfolio as Array<{
          url: string;
          type: 'image' | 'pdf';
          name: string;
          storagePath?: string;
        }>;
        if (portfolio.length > 0 && typeof (portfolio[0] as unknown) === 'string') {
          setPortfolioItems([]);
        } else {
          setPortfolioItems(portfolio);
        }
      }
    } else {
      setPortfolioItems([]);
    }
  }, [profile?.bio, profile?.portfolio, profile?.updatedAt]);

  useEffect(() => {
    if (!profile) return;
    setPricingForm({
      post: profile.contentPricing?.post ? String(profile.contentPricing.post) : '',
      story: profile.contentPricing?.story ? String(profile.contentPricing.story) : '',
      reels: profile.contentPricing?.reels ? String(profile.contentPricing.reels) : '',
      video: profile.contentPricing?.video ? String(profile.contentPricing.video) : '',
    });
  }, [profile]);

  const resetFromProfile = useCallback(() => {
    if (!profile) return;
    setGeneralForm((p) => ({
      ...p,
      fullName: profile.fullName || '',
      email: profile.email || '',
      phone: typeof profile.phone === 'string' ? profile.phone : '',
      categories: profile.categories || [],
      subCategories: profile.subCategories || {},
      currentPassword: '',
      newPassword: '',
    }));
    setAboutText(profile.bio || '');
    if (profile.portfolio && Array.isArray(profile.portfolio) && (profile.portfolio as unknown[]).length) {
      const first = (profile.portfolio as unknown[])[0];
      if (typeof first !== 'string') {
        setPortfolioItems(profile.portfolio as Array<{ url: string; type: 'image' | 'pdf'; name: string; storagePath?: string }>);
      } else {
        setPortfolioItems([]);
      }
    } else {
      setPortfolioItems([]);
    }
    setPricingForm({
      post: profile.contentPricing?.post ? String(profile.contentPricing.post) : '',
      story: profile.contentPricing?.story ? String(profile.contentPricing.story) : '',
      reels: profile.contentPricing?.reels ? String(profile.contentPricing.reels) : '',
      video: profile.contentPricing?.video ? String(profile.contentPricing.video) : '',
    });
  }, [profile]);

  const handleProfilePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;
    setIsUploadingPhoto(true);
    try {
      await uploadProfilePhoto(profile.id, file);
      toast({ title: 'Başarılı', description: 'Profil fotoğrafı güncellendi.' });
      onUpdate();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Profil fotoğrafı yüklenemedi.';
      toast({ title: 'Hata', description: msg, variant: 'destructive' });
    } finally {
      setIsUploadingPhoto(false);
      if (event.target) event.target.value = '';
    }
  };

  const handlePortfolioFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    if (!isImage && !isPDF) {
      toast({ title: 'Hata', description: 'Sadece PDF ve görsel dosyaları yüklenebilir.', variant: 'destructive' });
      return;
    }
    setPortfolioUploading(true);
    try {
      const { url, storagePath } = await uploadPortfolioFile(profile.id, file);
      setPortfolioItems((prev) => [
        ...prev,
        { url, type: isImage ? 'image' : 'pdf', name: file.name, storagePath },
      ]);
      toast({ title: 'Başarılı', description: 'Portfolyo dosyası yüklendi.' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Portfolyo dosyası yüklenemedi.';
      toast({ title: 'Hata', description: msg, variant: 'destructive' });
    } finally {
      setPortfolioUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleDeletePortfolioItem = async (index: number) => {
    const item = portfolioItems[index];
    if (!item) return;
    if (item.storagePath) {
      try {
        await deletePortfolioFile(item.storagePath);
      } catch (e) {
        console.error(e);
      }
    }
    setPortfolioItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveContentPricing = async () => {
    if (!profile?.id) return;
    setPricingSaving(true);
    try {
      await updateInfluencerProfile(profile.id, {
        contentPricing: {
          post: Number(pricingForm.post) || 0,
          story: Number(pricingForm.story) || 0,
          reels: Number(pricingForm.reels) || 0,
          video: Number(pricingForm.video) || 0,
        },
      });
      toast({ title: 'Başarılı', description: 'İçerik ücretleri kaydedildi.' });
      onUpdate();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Ücretler kaydedilemedi.';
      toast({ title: 'Hata', description: msg, variant: 'destructive' });
    } finally {
      setPricingSaving(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      const currentUser = auth.currentUser;
      const updates: Record<string, unknown> = {};
      if (generalForm.fullName !== (profile.fullName || '')) {
        updates.fullName = generalForm.fullName;
      }
      const nextPhone = (generalForm.phone || '').trim();
      const currentPhone = (profile.phone || '').trim();
      if (nextPhone !== currentPhone) {
        updates.phone = nextPhone;
      }
      if (JSON.stringify(generalForm.categories || []) !== JSON.stringify(profile.categories || [])) {
        updates.categories = generalForm.categories;
      }
      if (JSON.stringify(generalForm.subCategories || {}) !== JSON.stringify(profile.subCategories || {})) {
        updates.subCategories = generalForm.subCategories;
      }
      if ((aboutText || '') !== (profile.bio || '')) {
        updates.bio = aboutText;
      }
      if (JSON.stringify(portfolioItems || []) !== JSON.stringify(profile.portfolio || [])) {
        updates.portfolio = portfolioItems;
      }
      if (Object.keys(updates).length > 0) {
        await updateInfluencerProfile(profile.id, updates);
      }
      const passwordChanged = !!generalForm.newPassword;
      if (passwordChanged && currentUser) {
        if (!generalForm.currentPassword) {
          throw new Error('Şifre değişikliği için mevcut şifre gerekli.');
        }
        const credential = EmailAuthProvider.credential(
          currentUser.email || profile.email,
          generalForm.currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, generalForm.newPassword);
      }
      toast({ title: 'Başarılı', description: 'Genel profil bilgileri güncellendi.' });
      setGeneralForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
      onUpdate();
      onMainProfileSave?.();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Genel profil guncellenemedi.';
      toast({ title: 'Hata', description: msg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else resetFromProfile();
  };

  const platformPreview = profile ? normalizeInfluencerPlatformsToArray(profile.platforms) : [];
  const scrollClass =
    layout === 'dialog'
      ? 'space-y-5 mac-scrollbar'
      : 'space-y-5 mac-scrollbar';

  return (
    <>
      <div className={`py-1 ${scrollClass}`}>
        {onOpenAudienceMatch && (
          <div className="p-4 rounded-xl border border-[#08afd5]/30 bg-[#08afd5]/8 dark:bg-[#08afd5]/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-[#08afd5] shrink-0" />
                  Hedef kitle anketi
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-prose">
                  İzleyici kitleniz ve markalarla eşleşme bilgilerinizi güncelleyin; isterseniz yanıtınızı
                  değiştirip tekrar kaydedebilirsiniz.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl border-[#08afd5]/40 text-[#0a7a94] dark:text-[#6edff3]"
                onClick={() => {
                  onOpenAudienceMatch();
                  if (layout === 'dialog') onCancel?.();
                }}
              >
                Anketi aç
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Profil fotoğrafı</p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shrink-0">
              {profile?.profilePhotoURL ? (
                <img src={profile.profilePhotoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400">
                  <User className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoSelect}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={!profile?.id || isUploadingPhoto}
                onClick={() => profilePhotoInputRef.current?.click()}
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yükleniyor…
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Fotoğraf yükle
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">JPG, PNG veya WebP. Kare görünüm önerilir.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">İsim</label>
            <input
              value={generalForm.fullName}
              onChange={(e) => setGeneralForm((p) => ({ ...p, fullName: e.target.value }))}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">E-posta</label>
            <input
              type="email"
              value={generalForm.email}
              readOnly
              disabled
              className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">E-posta adresi güvenlik nedeniyle değiştirilemez.</p>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Telefon numarası</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={generalForm.phone}
              onChange={(e) => setGeneralForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+90 5xx xxx xx xx"
              className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Markalar ve platform iletişimi için kullanılabilir.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Mevcut Şifre</label>
            <div className="relative mt-2">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={generalForm.currentPassword}
                onChange={(e) => setGeneralForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                placeholder="Yeni şifre belirlemek için gerekli"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                aria-label={showCurrentPassword ? 'Gizle' : 'Göster'}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Yeni Şifre</label>
            <div className="relative mt-2">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={generalForm.newPassword}
                onChange={(e) => setGeneralForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                aria-label={showNewPassword ? 'Gizle' : 'Göster'}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Kategoriler</p>
            <span className="text-xs text-gray-500 dark:text-gray-400">{generalForm.categories.length}/3 seçildi</span>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {topCategories.map((category) => {
                const isSelected = generalForm.categories.includes(category);
                const isDisabled = generalForm.categories.length >= 3 && !isSelected;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setGeneralForm((prev) => {
                        const newCategories = prev.categories.includes(category)
                          ? prev.categories.filter((c) => c !== category)
                          : prev.categories.length < 3
                            ? [...prev.categories, category]
                            : prev.categories;
                        const newSubCategories = prev.categories.includes(category)
                          ? Object.fromEntries(Object.entries(prev.subCategories).filter(([key]) => key !== category))
                          : prev.subCategories;
                        return { ...prev, categories: newCategories, subCategories: newSubCategories };
                      });
                    }}
                    disabled={isDisabled}
                    className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#08afd5] text-white border border-[#08afd5]'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-[#08afd5]/50'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            {generalForm.categories.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                {generalForm.categories.map((category) => {
                  const selectedSubs = generalForm.subCategories[category] || [];
                  const allSubs = categoryTree[category] || [];
                  const isAllSelected = allSubs.length > 0 && selectedSubs.length === allSubs.length;
                  return (
                    <div
                      key={category}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{category} Alt Kategorileri</p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setGeneralForm((prev) => ({
                                ...prev,
                                subCategories: { ...prev.subCategories, [category]: [...(categoryTree[category] || [])] },
                              }))
                            }
                            disabled={isAllSelected}
                          >
                            Tümünü Seç
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setGeneralForm((prev) => ({ ...prev, subCategories: { ...prev.subCategories, [category]: [] } }))
                            }
                            disabled={selectedSubs.length === 0}
                          >
                            Temizle
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allSubs.map((subCategory) => {
                          const selected = selectedSubs.includes(subCategory);
                          return (
                            <button
                              key={`${category}-${subCategory}`}
                              type="button"
                              className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                                selected
                                  ? 'bg-[#08afd5] text-white border-[#08afd5]'
                                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#08afd5]/50'
                              }`}
                              onClick={() => {
                                setGeneralForm((prev) => {
                                  const sub = prev.subCategories[category] || [];
                                  const exists = sub.includes(subCategory);
                                  const nextSubs = exists ? sub.filter((item) => item !== subCategory) : [...sub, subCategory];
                                  return { ...prev, subCategories: { ...prev.subCategories, [category]: nextSubs } };
                                });
                              }}
                            >
                              {subCategory}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedSubs.length}/{allSubs.length} alt kategori seçildi
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Hakkımızda</p>
          <textarea
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            className="w-full min-h-[120px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            placeholder="Kendinizi ve içerik stilinizi yazın"
          />
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Sosyal Medya</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPlatformModalOpen(true)}>
              Platformları Düzenle
            </Button>
          </div>
          {platformPreview.length > 0 ? (
            <div className="space-y-2">
              {platformPreview.map((p) => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-[#08afd5] dark:text-[#7ce7ff]">{platformIcons[p.id] || <Instagram size={16} />}</span>
                  <span className="text-gray-700 dark:text-gray-300">@{p.username}</span>
                  {p.followers ? (
                    <span className="text-gray-500 dark:text-gray-400 text-xs ml-auto">{fmtN(p.followers)} takipçi</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">Henüz platform eklenmemiş.</p>
          )}
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Portfolyo</p>
          <div className="flex gap-2 mb-2">
            <input ref={portfolioInputRef} type="file" accept="image/*,.pdf" onChange={handlePortfolioFileSelect} className="hidden" />
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
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 mac-scrollbar">
            {portfolioItems.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">Portfolyo kaydı bulunmuyor.</p>
            ) : (
              portfolioItems.map((item, idx) => (
                <div key={`${item.url}-${idx}`} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-3">
                  {item.type === 'image' ? (
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-red-600 dark:text-red-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-700 dark:text-gray-300 truncate hover:text-[#08afd5] block"
                    >
                      {item.name}
                    </a>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.type === 'image' ? 'Görsel' : 'PDF'}</p>
                  </div>
                  <button type="button" onClick={() => void handleDeletePortfolioItem(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Ücret Düzenleme</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Post (₺)</label>
              <input
                inputMode="numeric"
                value={pricingForm.post}
                onChange={(e) => setPricingForm((p) => ({ ...p, post: e.target.value }))}
                className="mt-1 w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                placeholder="3500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Story (₺)</label>
              <input
                inputMode="numeric"
                value={pricingForm.story}
                onChange={(e) => setPricingForm((p) => ({ ...p, story: e.target.value }))}
                className="mt-1 w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                placeholder="2000"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Reels (₺)</label>
              <input
                inputMode="numeric"
                value={pricingForm.reels}
                onChange={(e) => setPricingForm((p) => ({ ...p, reels: e.target.value }))}
                className="mt-1 w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Video (₺)</label>
              <input
                inputMode="numeric"
                value={pricingForm.video}
                onChange={(e) => setPricingForm((p) => ({ ...p, video: e.target.value }))}
                className="mt-1 w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                placeholder="7000"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => void handleSaveContentPricing()} disabled={pricingSaving}>
              {pricingSaving ? 'Kaydediliyor...' : 'Ücretleri Kaydet'}
            </Button>
          </div>
        </div>
      </div>

      <div
        className={
          layout === 'page'
            ? 'sticky bottom-0 z-10 mt-4 mb-1 flex flex-row flex-wrap items-center justify-center gap-2 rounded-2xl border border-gray-200/85 dark:border-gray-800/90 bg-white/95 dark:bg-gray-950/95 px-4 py-3.5 shadow-lg shadow-gray-900/5 dark:shadow-black/40 backdrop-blur-sm'
            : 'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-gray-200 dark:border-gray-800 pt-4'
        }
      >
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving || pricingSaving}
          className="flex items-center justify-center gap-2 rounded-xl"
        >
          <XCircle size={16} />
          {layout === 'dialog' || onCancel ? 'İptal' : 'Sıfırla'}
        </Button>
        <Button
          type="button"
          onClick={() => void handleSaveGeneral()}
          disabled={isSaving || pricingSaving}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#08afd5] hover:bg-[#0799bc] text-white"
        >
          <Save size={16} />
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      <PlatformEditModal isOpen={isPlatformModalOpen} onClose={() => setIsPlatformModalOpen(false)} profileData={profile} onUpdate={onUpdate} />
    </>
  );
}
