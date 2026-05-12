import React, { useEffect, useMemo, useState } from 'react';
import { X, MapPin, UserRound, Users, Target, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateInfluencerProfile } from '@/services/firebaseInfluencerService';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_TREE, TOP_CATEGORY_KEYS } from '@/constants/sectorCategoryTree';
import { TURKIYE_81_IL_ALFABE } from '@/constants/turkiyeIller';
import { CAMPAIGN_GOAL_OPTIONS } from '@/constants/campaignGoals';
import {
  AUDIENCE_MATCH_MAX_LOCATIONS,
  AUDIENCE_MATCH_MAX_PRODUCT_SUBS,
  type InfluencerAudienceMatch,
  getRegistrationProductSubcategoriesForSurvey,
  isCampaignGoalValue,
  type AudienceMatchGender,
} from '@/lib/influencerAudienceMatch';
import type { InfluencerProfile } from '@/services/firebaseInfluencerService';

const TURK_GENEL = 'Türkiye Geneli';

const locationChoices: string[] = [TURK_GENEL, ...TURKIYE_81_IL_ALFABE];

const topCategoryOptions = [...TOP_CATEGORY_KEYS].sort((a, b) => a.localeCompare(b, 'tr'));

export type InfluencerAudienceMatchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: InfluencerProfile | null;
  onSaved: () => void;
};

export function InfluencerAudienceMatchDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: InfluencerAudienceMatchDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<AudienceMatchGender>('all');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [productSubcategories, setProductSubcategories] = useState<string[]>([]);
  const [location, setLocation] = useState<string[]>([]);
  const [campaignHelpGoal, setCampaignHelpGoal] = useState<string>('');
  const [productTopCategory, setProductTopCategory] = useState('');
  const [productSubSearch, setProductSubSearch] = useState('');

  const filteredSubs = useMemo(() => {
    const subs = productTopCategory ? (CATEGORY_TREE[productTopCategory] ?? []) : [];
    const q = productSubSearch.trim().toLocaleLowerCase('tr');
    if (!q) return subs;
    return subs.filter((s) => s.toLocaleLowerCase('tr').includes(q));
  }, [productTopCategory, productSubSearch]);

  const audienceFormPrefillKey = useMemo(
    () =>
      profile
        ? [
            profile.id,
            profile.audienceMatch?.completedAt ?? '',
            JSON.stringify(profile.audienceMatch?.productSubcategories ?? []),
            JSON.stringify(profile.categories ?? []),
            JSON.stringify(profile.subCategories ?? {}),
          ].join('|')
        : '',
    [profile]
  );

  useEffect(() => {
    if (!open || !profile) return;
    const a = profile.audienceMatch;
    if (a && a.completedAt) {
      setGender((a.gender as AudienceMatchGender) || 'all');
      setMinAge(a.minAge != null ? String(a.minAge) : '');
      setMaxAge(a.maxAge != null ? String(a.maxAge) : '');
      const savedSubs = [...(a.productSubcategories || [])].slice(0, AUDIENCE_MATCH_MAX_PRODUCT_SUBS);
      setProductSubcategories(savedSubs);
      setLocation([...(a.location || [])].slice(0, AUDIENCE_MATCH_MAX_LOCATIONS));
      setCampaignHelpGoal((a as InfluencerAudienceMatch).campaignHelpGoal || '');
      const topFromSaved =
        savedSubs.length > 0
          ? TOP_CATEGORY_KEYS.find((top) => savedSubs.some((s) => (CATEGORY_TREE[top] || []).includes(s))) || ''
          : '';
      setProductTopCategory(topFromSaved);
    } else {
      setGender('all');
      setMinAge('');
      setMaxAge('');
      const { subs, suggestedTopCategory } = getRegistrationProductSubcategoriesForSurvey(profile);
      setProductSubcategories(subs);
      setProductTopCategory(suggestedTopCategory);
      setLocation([]);
      setCampaignHelpGoal('');
    }
    setProductSubSearch('');
  }, [open, audienceFormPrefillKey, profile]);

  const addLocation = (loc: string) => {
    if (!loc) return;
    if (location.includes(loc)) return;
    if (location.length >= AUDIENCE_MATCH_MAX_LOCATIONS) {
      toast({
        title: 'Sınır',
        description: `En fazla ${AUDIENCE_MATCH_MAX_LOCATIONS} konum seçebilirsiniz (marka kampanyası ile aynı).`,
        variant: 'destructive',
      });
      return;
    }
    setLocation((prev) => [...prev, loc]);
  };

  const removeLocation = (loc: string) => {
    setLocation((prev) => prev.filter((l) => l !== loc));
  };

  const toggleSub = (sub: string) => {
    setProductSubcategories((prev) => {
      const has = prev.includes(sub);
      if (has) return prev.filter((s) => s !== sub);
      if (prev.length >= AUDIENCE_MATCH_MAX_PRODUCT_SUBS) {
        toast({
          title: 'Sınır',
          description: `En fazla ${AUDIENCE_MATCH_MAX_PRODUCT_SUBS} alt kategori (marka kampanyası ile aynı).`,
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, sub];
    });
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    const nMin = Number(minAge);
    const nMax = Number(maxAge);
    if (!Number.isFinite(nMin) || !Number.isFinite(nMax) || nMin < 13 || nMax > 100 || nMin > nMax) {
      toast({
        title: 'Yaş aralığı',
        description: 'Geçerli min/max yaş girin (13–100, min ≤ max).',
        variant: 'destructive',
      });
      return;
    }
    if (productSubcategories.length < 1) {
      toast({ title: 'Alt kategori', description: 'En az bir alt kategori seçin.', variant: 'destructive' });
      return;
    }
    if (location.length < 1) {
      toast({ title: 'Konum', description: 'En az bir bölge veya il seçin.', variant: 'destructive' });
      return;
    }
    if (!campaignHelpGoal || !isCampaignGoalValue(campaignHelpGoal)) {
      toast({ title: 'Hedef', description: 'Kampanyalarda destek türü seçin.', variant: 'destructive' });
      return;
    }

    const payload: InfluencerAudienceMatch = {
      completedAt: new Date().toISOString(),
      gender,
      minAge: String(nMin),
      maxAge: String(nMax),
      productSubcategories: [...productSubcategories],
      location: [...location],
      campaignHelpGoal: campaignHelpGoal as InfluencerAudienceMatch['campaignHelpGoal'],
    };

    setSaving(true);
    try {
      await updateInfluencerProfile(profile.id, { audienceMatch: payload });
      toast({ title: 'Kaydedildi', description: 'Hedef kitleniz kaydedildi. Marka eşleşmeleriyle aynı alanlar kullanılır.' });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Hata',
        description: e?.message || 'Kayıt başarısız.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const previewComplete =
    Boolean(gender) &&
    minAge !== '' &&
    maxAge !== '' &&
    productSubcategories.length > 0 &&
    location.length > 0 &&
    Boolean(campaignHelpGoal && isCampaignGoalValue(campaignHelpGoal)) &&
    Number.isFinite(Number(minAge)) &&
    Number.isFinite(Number(maxAge)) &&
    Number(minAge) >= 13 &&
    Number(maxAge) <= 100 &&
    Number(minAge) <= Number(maxAge);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[min(90vh,880px)] overflow-y-auto mac-scrollbar sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Target className="h-5 w-5 text-[#08afd5]" />
            Kurulumu tamamla — hedef kitlen
          </DialogTitle>
          <DialogDescription>
            Marka kampanyalarında doldurulan alanlarla aynı yapı: eşleştirme algoritmamız buna göre çalışır. Tüm
            alanlar zorunludur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#08afd5]" />
              Hedef kitlenizin cinsiyeti daha çok nedir?
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(
                [
                  { label: 'Kadın', value: 'female' as const },
                  { label: 'Erkek', value: 'male' as const },
                  { label: 'Herkes', value: 'all' as const },
                ] as const
              ).map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(g.value)}
                  className={`px-3 py-1.5 rounded-[10px] text-sm border ${gender === g.value
                    ? 'bg-[#08afd5] border-[#08afd5] text-white'
                    : 'bg-white dark:bg-gray-800 border-gray-300/50 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                    }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 block mb-2">
              Hedef kitlenizin yaş aralığı nedir? (izleyici kitleniz)
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <input
                type="number"
                min={13}
                max={100}
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                className="h-10 px-3 rounded-[10px] border border-gray-300/50 dark:border-gray-600 bg-white dark:bg-gray-900"
                placeholder="Min yaş"
              />
              <input
                type="number"
                min={13}
                max={100}
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                className="h-10 px-3 rounded-[10px] border border-gray-300/50 dark:border-gray-600 bg-white dark:bg-gray-900"
                placeholder="Max yaş"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#08afd5]" />
              Hedef kitleniz genel olarak hangi bölge / illerde? (en fazla {AUDIENCE_MATCH_MAX_LOCATIONS})
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">
              Marka “Ülkeler / şehirler” alanıyla aynı listedir (Türkiye geneli + 81 il).
            </p>
            <select
              className="w-full max-w-xl h-10 px-3 rounded-[10px] border border-gray-300/50 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              value=""
              disabled={location.length >= AUDIENCE_MATCH_MAX_LOCATIONS}
              onChange={(e) => {
                const v = e.target.value;
                if (v) {
                  addLocation(v);
                  e.target.value = '';
                }
              }}
            >
              <option value="">{location.length >= AUDIENCE_MATCH_MAX_LOCATIONS ? 'Maks. seçim' : 'Konum ekle...'}</option>
              {locationChoices
                .filter((item) => !location.includes(item))
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
            {location.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {location.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-[10px] text-sm border border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/90"
                  >
                    {loc}
                    <button
                      type="button"
                      onClick={() => removeLocation(loc)}
                      className="p-0.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label="Kaldır"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {location.length} / {AUDIENCE_MATCH_MAX_LOCATIONS} konum
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[#08afd5]" />
              Hedef kitleniz hangi ürün / kategorilere ilgi duyar? (en fazla {AUDIENCE_MATCH_MAX_PRODUCT_SUBS})
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">
              Marka “ürün (alt kategori)” alanındaki aynı sözlüğü kullanın. Kayıtta seçtiğiniz alt
              kategoriler burada ön doldurulur; isterseniz değiştirebilir veya 3 sınırına kadar
              uyarlayabilirsiniz.
            </p>
            <div className="space-y-3">
              <Select
                value={productTopCategory || undefined}
                onValueChange={(v) => {
                  setProductTopCategory(v);
                  setProductSubSearch('');
                }}
              >
                <SelectTrigger className="h-10 max-w-xl rounded-[10px]">
                  <SelectValue placeholder="Üst kategori seçin" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(280px,50vh)]">
                  {topCategoryOptions.map((top) => (
                    <SelectItem key={top} value={top}>
                      {top}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5" htmlFor="am-sub-search">
                  <Search className="h-3.5 w-3.5 opacity-70" />
                  Alt kategorilerde ara
                </label>
                <input
                  id="am-sub-search"
                  type="search"
                  autoComplete="off"
                  disabled={!productTopCategory}
                  className="w-full max-w-xl h-10 px-3 rounded-[10px] border border-gray-300/50 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                  placeholder={productTopCategory ? 'Ara...' : 'Önce üst kategori'}
                  value={productSubSearch}
                  onChange={(e) => setProductSubSearch(e.target.value)}
                />
              </div>
              {productSubcategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {productSubcategories.map((sub) => (
                    <span
                      key={sub}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg text-xs font-medium border border-[#08afd5]/50 bg-[#08afd5]/10 text-[#0790b3] dark:text-[#6edff3]"
                    >
                      {sub}
                      <button type="button" onClick={() => toggleSub(sub)} className="p-0.5 rounded hover:bg-[#08afd5]/20">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200/70 dark:border-gray-700 p-2">
                {!productTopCategory ? (
                  <p className="text-sm text-gray-500 text-center py-4">Önce üst kategori seçin.</p>
                ) : filteredSubs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Sonuç yok.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {filteredSubs.map((sub) => {
                      const selected = productSubcategories.includes(sub);
                      const atCap = productSubcategories.length >= AUDIENCE_MATCH_MAX_PRODUCT_SUBS && !selected;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => toggleSub(sub)}
                          disabled={atCap}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left max-w-full ${selected
                            ? 'bg-[#08afd5] border-[#08afd5] text-white'
                            : atCap
                              ? 'opacity-45 cursor-not-allowed border-gray-200 dark:border-gray-600'
                              : 'bg-white dark:bg-gray-800/90 border-gray-200 dark:border-gray-600'
                            }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {productSubcategories.length} / {AUDIENCE_MATCH_MAX_PRODUCT_SUBS} alt kategori
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 block mb-2">
              Kampanyalara daha çok hangi anlamda yardımcı olabildiğinizi düşünüyorsunuz?
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Marka tarafındaki “Kampanya hedefi” ile aynı seçenek listesi.
            </p>
            <select
              className="w-full max-w-xl h-10 px-3 rounded-[10px] border border-gray-300/50 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              value={campaignHelpGoal}
              onChange={(e) => setCampaignHelpGoal(e.target.value)}
            >
              <option value="">Seçin…</option>
              {CAMPAIGN_GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200/80 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              İptal
            </Button>
            <Button
              type="button"
              className="bg-[#08afd5] hover:bg-[#0790b3] text-white"
              onClick={() => void handleSave()}
              disabled={saving || !previewComplete}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet ve tamamla'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
