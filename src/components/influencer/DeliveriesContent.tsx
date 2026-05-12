import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Image as ImageIcon,
  Video as VideoIcon,
  Eye,
  FileText,
  Briefcase,
  Calendar,
  X,
  BadgeCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  FirebaseOffer,
  getOffersByInfluencer,
  mergeOfferContentDeliveries,
  updateOfferContentLink,
} from '@/services/firebaseOfferService';
import { processStaleEscrowRefundsForInfluencerOffers } from '@/services/firebaseOfferEscrowService';
import { FirebaseCampaign, getCampaignById } from '@/services/firebaseCampaignService';
import {
  buildDeliverySlotsFromCampaign,
  campaignRequiresStructuredDelivery,
  isCollaborationCampaign,
  isOfferContentDeliveryCompleteForCampaign,
  isOfferRawContentCompleteForCampaign,
  isOfferShareLinkCompleteForCampaign,
  listOfferContentMediaItems,
  resolvePrimaryOfferContentUrl,
} from '@/lib/offerContentCompleteness';
import { isRevisionResponsePending, listRevisionsNewestFirst } from '@/lib/offerRevisionState';
import { database } from '@/config/firebase';
import { get, ref } from 'firebase/database';
import { uploadFile } from '@/services/firebaseStorageService';
import { ContentViewerModal } from '@/components/shared/ContentViewerModal';

interface DeliveriesContentProps {
  influencerId: string;
  canOperate?: boolean;
}

type DeliveryFilter = 'all' | 'pending' | 'revision' | 'delivered' | 'approved';

interface EnrichedDelivery extends FirebaseOffer {
  deliveryStatus: DeliveryFilter;
  campaignTitle?: string;
  brandName?: string;
  deadline?: string;
  brandLogoURL?: string;
  publishStart?: string;
  publishEnd?: string;
  isExpired?: boolean;
  /** Kampanya teslim gereksinimleri (çoklu slot) */
  campaignData?: FirebaseCampaign | null;
}

export const DeliveriesContent: React.FC<DeliveriesContentProps> = ({
  influencerId,
  canOperate = true,
}) => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const offerIdRedirectRef = useRef<Map<string, string>>(new Map());
  const [offers, setOffers] = useState<EnrichedDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DeliveryFilter>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<EnrichedDelivery | null>(null);
  const [file, setFile] = useState<File | null>(null);
  /** Yapılandırılmış teslim: satır kimliği -> seçilen dosya */
  const [slotFiles, setSlotFiles] = useState<Record<string, File | null>>({});
  /** İşbirliği paylaşım linkleri (lineId -> URL metni) */
  const [shareDraft, setShareDraft] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [contentViewerOpen, setContentViewerOpen] = useState(false);
  const [selectedContentUrl, setSelectedContentUrl] = useState('');
  const [selectedContentOfferId, setSelectedContentOfferId] = useState<string | undefined>();
  const [viewerMediaItems, setViewerMediaItems] = useState<Array<{ url: string; label: string }>>([]);

  useEffect(() => {
    if (!influencerId) return;
    loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [influencerId]);

  const focusOfferId = searchParams.get('offerId');

  useEffect(() => {
    if (!focusOfferId || loading) return;

    const clearOfferParam = () => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('offerId');
          return next;
        },
        { replace: true }
      );
    };

    if (offers.length === 0) {
      toast({
        title: 'Teslim kaydı bulunamadı',
        description: 'Kabul edilmiş teklifin yok veya bu teklif teslim listesinde görünmüyor.',
        variant: 'destructive',
      });
      clearOfferParam();
      return;
    }

    const canonicalId = offerIdRedirectRef.current.get(focusOfferId) ?? focusOfferId;
    const row = offers.find((o) => o.id === canonicalId);

    if (row) {
      if (row.contentApproved) {
        toast({
          title: 'İçerik zaten onaylandı',
          description: 'Bu teslim güncellenemez. Liste üzerinden yalnızca görüntüleyebilirsin.',
          variant: 'destructive',
        });
        clearOfferParam();
        return;
      }
      setSelectedOffer(row);
      setFile(null);
      setUploadModalOpen(true);
      clearOfferParam();
    } else {
      toast({
        title: 'Teslim kaydı bulunamadı',
        description:
          'Bu teklif için içerik teslimi listesinde kayıt yok veya henüz kabul edilmemiş olabilir.',
        variant: 'destructive',
      });
      clearOfferParam();
    }
    // toast: useToast referansı; yalnızca odak parametresi ve liste yüklendiğinde çalışır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOfferId, loading, offers, setSearchParams]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const allOffers = await getOffersByInfluencer(influencerId);
      await processStaleEscrowRefundsForInfluencerOffers(allOffers).catch(() => undefined);

      // Sadece nihai kabul edilmiş teklifleri (her müzakere zinciri için tek kayıt) seç
      const acceptedOffersRaw = allOffers.filter((offer) => offer.status === 'kabul');

      const offerById = new Map<string, FirebaseOffer>();
      acceptedOffersRaw.forEach((o) => {
        offerById.set(o.id, o);
      });

      const rootIdCache = new Map<string, string>();
      const getRootId = (offer: FirebaseOffer): string => {
        if (rootIdCache.has(offer.id)) return rootIdCache.get(offer.id)!;
        let current: FirebaseOffer | undefined = offer;
        const visited = new Set<string>();
        while (current?.parentOfferId && !visited.has(current.parentOfferId)) {
          visited.add(current.parentOfferId);
          const parent = offerById.get(current.parentOfferId);
          if (!parent) break;
          current = parent;
        }
        const rootId = current?.id || offer.id;
        rootIdCache.set(offer.id, rootId);
        return rootId;
      };

      const bestByThread = new Map<string, FirebaseOffer>();

      for (const offer of acceptedOffersRaw) {
        const threadId = getRootId(offer);
        const existing = bestByThread.get(threadId);
        if (!existing) {
          bestByThread.set(threadId, offer);
          continue;
        }

        const isBrandToInfluencer = (o: FirebaseOffer) =>
          o.sourceType === 'brand' && o.destinationType === 'influencer';

        const existingIsBrand = isBrandToInfluencer(existing);
        const currentIsBrand = isBrandToInfluencer(offer);

        if (currentIsBrand && !existingIsBrand) {
          bestByThread.set(threadId, offer);
          continue;
        }

        const existingTime = new Date(existing.respondedAt || existing.updatedAt || existing.createdAt || 0).getTime();
        const currentTime = new Date(offer.respondedAt || offer.updatedAt || offer.createdAt || 0).getTime();

        if (currentTime > existingTime) {
          bestByThread.set(threadId, offer);
        }
      }

      const redirectMap = new Map<string, string>();
      for (const o of acceptedOffersRaw) {
        const threadId = getRootId(o);
        const canonical = bestByThread.get(threadId);
        if (canonical) redirectMap.set(o.id, canonical.id);
      }
      offerIdRedirectRef.current = redirectMap;

      const acceptedOffers = Array.from(bestByThread.values());

      // İlgili markaları tek seferde getir
      const brandIds = Array.from(new Set(acceptedOffers.map((o) => o.brandId))).filter(Boolean);
      const brandMetaMap: Record<string, { brandName?: string; brandLogoURL?: string }> = {};

      await Promise.all(
        brandIds.map(async (brandId) => {
          try {
            const snapshot = await get(ref(database, `brands/${brandId}`));
            if (!snapshot.exists()) return;
            const val = snapshot.val() as { brandName?: string; profilePhotoURL?: string };
            brandMetaMap[brandId] = {
              brandName: val.brandName || 'Bilinmeyen Marka',
              brandLogoURL: val.profilePhotoURL || undefined,
            };
          } catch (e) {
            console.error('Marka bilgisi alınırken hata:', e);
          }
        })
      );

      const enriched: EnrichedDelivery[] = await Promise.all(
        acceptedOffers.map(async (offer) => {
          let campaignTitle: string | undefined;
          let deadline: string | undefined;
          let publishStart: string | undefined;
          let publishEnd: string | undefined;
          let campaignPayload: FirebaseCampaign | null = null;

          try {
            const campaign: FirebaseCampaign | null = await getCampaignById(
              offer.brandId,
              offer.campaignId
            );
            campaignPayload = campaign;
            if (campaign) {
              campaignTitle =
                campaign.title ||
                campaign.campaignName ||
                campaign.productInfo ||
                'Kampanya';
              publishStart = campaign.publishWindow?.start;
              publishEnd = campaign.publishWindow?.end;
              deadline =
                publishEnd ||
                campaign.duration?.end ||
                campaign.applicationDeadline ||
                campaign.publishWindow?.end;
            }
          } catch (e) {
            console.error('Kampanya bilgisi alınırken hata:', e);
          }

	          const isCollab = isCollaborationCampaign(campaignPayload);
	          const rawDeliveryComplete =
	            campaignPayload !== null &&
	            campaignRequiresStructuredDelivery(campaignPayload)
	              ? isOfferRawContentCompleteForCampaign(offer, campaignPayload)
	              : Boolean(offer.contentLink?.trim());
	          const finalDeliveryComplete =
	            campaignPayload !== null &&
	            campaignRequiresStructuredDelivery(campaignPayload)
	              ? isOfferContentDeliveryCompleteForCampaign(offer, campaignPayload)
	              : Boolean(offer.contentLink?.trim());
	          const shareLinkComplete = isOfferShareLinkCompleteForCampaign(offer, campaignPayload);

          const revisionOutstanding = isRevisionResponsePending(offer);

          let deliveryStatus: DeliveryFilter = 'pending';
          if (offer.contentApproved) {
            deliveryStatus = 'approved';
	          } else if (revisionOutstanding) {
	            deliveryStatus = 'revision';
	          } else if (isCollab && offer.contentMediaApproved && !shareLinkComplete) {
	            deliveryStatus = 'pending';
	          } else if (isCollab ? rawDeliveryComplete || finalDeliveryComplete : finalDeliveryComplete) {
	            deliveryStatus = 'delivered';
	          }

          let isExpired = false;
          if (publishEnd) {
            const endDate = new Date(publishEnd);
            if (!Number.isNaN(endDate.getTime())) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              endDate.setHours(0, 0, 0, 0);
              if (endDate < today) {
                isExpired = true;
              }
            }
          }

          return {
            ...offer,
            campaignData: campaignPayload ?? undefined,
            deliveryStatus,
            campaignTitle,
            brandName: brandMetaMap[offer.brandId]?.brandName || 'Bilinmeyen Marka',
            brandLogoURL: brandMetaMap[offer.brandId]?.brandLogoURL,
            deadline,
            publishStart,
            publishEnd,
            isExpired,
          };
        })
      );

      enriched.sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setOffers(enriched);
    } catch (error: any) {
      console.error('İçerik teslimleri yüklenirken hata:', error);
      toast({
        title: 'Bir hata oluştu',
        description: error?.message || 'İçerik teslimleri yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = offers.length;
    const pending = offers.filter((o) => o.deliveryStatus === 'pending').length;
    const revision = offers.filter((o) => o.deliveryStatus === 'revision').length;
    const delivered = offers.filter((o) => o.deliveryStatus === 'delivered').length;
    const approved = offers.filter((o) => o.deliveryStatus === 'approved').length;
    return { total, pending, revision, delivered, approved };
  }, [offers]);

  const filteredOffers = useMemo(() => {
    if (filter === 'all') return offers;
    return offers.filter((o) => o.deliveryStatus === filter);
  }, [offers, filter]);

  const modalDeliverySlots = useMemo(
    () => buildDeliverySlotsFromCampaign(selectedOffer?.campaignData ?? null),
    [selectedOffer?.campaignData, selectedOffer?.id]
  );

  useEffect(() => {
    if (!uploadModalOpen || !selectedOffer) return;
    const camp = selectedOffer.campaignData ?? null;
    const slots = buildDeliverySlotsFromCampaign(camp);
    const share: Record<string, string> = {};
    const blanks: Record<string, File | null> = {};
    for (const s of slots) {
      blanks[s.lineId] = null;
      share[s.lineId] = selectedOffer.contentDeliveries?.[s.lineId]?.shareLink ?? '';
    }
    setShareDraft(share);
    setSlotFiles(blanks);
    setFile(null);
  }, [uploadModalOpen, selectedOffer]);

  const handleOpenUploadModal = (offer: EnrichedDelivery) => {
    if (offer.contentApproved) {
      toast({
        title: 'İçerik onaylandı',
        description: 'Marka bu teslimi onayladı; dosya güncellemesi veya yükleme yapılamaz.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedOffer(offer);
    setFile(null);
    setUploadModalOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile || null);
  };

  const handleUpload = async () => {
    if (!selectedOffer) return;

    if (selectedOffer.contentApproved) {
      toast({
        title: 'İçerik onaylandı',
        description: 'Marka onayından sonra yükleme yapılamaz.',
        variant: 'destructive',
      });
      return;
    }

    if (!canOperate) {
      toast({
        title: 'İşlem yapılamaz',
        description: 'Hesabın doğrulanmadan içerik yükleyemezsin.',
        variant: 'destructive',
      });
      return;
    }

	    const campaign = selectedOffer.campaignData ?? null;
	    const structuredSlots = buildDeliverySlotsFromCampaign(campaign);
	    const isCollab = isCollaborationCampaign(campaign);
	    const rawApproved = selectedOffer.contentMediaApproved === true;

    try {
      setUploading(true);

      if (structuredSlots.length > 0) {
        const patch: Record<string, { contentUrl?: string; shareLink?: string }> = {};
        for (const s of structuredSlots) {
          const prevUrl = selectedOffer.contentDeliveries?.[s.lineId]?.contentUrl?.trim();
          const picked = slotFiles[s.lineId];
          let contentUrl = prevUrl || '';
          if (picked) {
            const uploadPath = `offer-contents/${selectedOffer.influencerId}/${selectedOffer.campaignId}/${selectedOffer.id}/${s.lineId}`;
            contentUrl = await uploadFile(picked, uploadPath);
          }

	          const share = (shareDraft[s.lineId] ?? '').trim();
	          if (!contentUrl) {
            toast({
              title: `Eksik dosya (${s.label})`,
              description: 'Her teslim için video veya görsel yükleyin.',
              variant: 'destructive',
            });
            return;
          }

	          if (isCollab && !rawApproved) {
	            patch[s.lineId] = { contentUrl };
	            continue;
	          }

	          if (s.needsShareLink && !share) {
            toast({
              title: 'Paylaşım linki gerekli',
              description: `"${s.label}" için yayın bağlantınızı yazın.`,
              variant: 'destructive',
            });
            return;
          }

	          patch[s.lineId] = rawApproved ? {} : { contentUrl };
	          if (s.needsShareLink) {
	            patch[s.lineId].shareLink = share;
	          }
        }

        await mergeOfferContentDeliveries(selectedOffer.id, patch);
      } else {
        if (!file) {
          toast({
            title: 'Dosya seçilmedi',
            description: 'Lütfen yüklemek için bir video veya görsel seçin.',
            variant: 'destructive',
          });
          return;
        }

        const pathBase = `offer-contents/${selectedOffer.influencerId}/${selectedOffer.campaignId}/${selectedOffer.id}`;
        const downloadUrl = await uploadFile(file, pathBase);

        await updateOfferContentLink(selectedOffer.id, downloadUrl);
      }

	      toast({
	        title: isCollab && rawApproved ? 'Paylaşım linki kaydedildi' : 'İçerik yüklendi',
	        description:
	          isCollab && rawApproved
	            ? 'Paylaşım linki markanın final onayına gönderildi.'
	            : isCollab
	              ? 'Ham içerik markanın incelemesine gönderildi.'
	              : 'İçerikler kaydedildi ve markayla paylaşılmaya hazır.',
	      });

      setUploadModalOpen(false);
      setSelectedOffer(null);
      setFile(null);
      setSlotFiles({});
      setShareDraft({});
      await loadOffers();
    } catch (error: unknown) {
      console.error('İçerik yükleme hatası:', error);
      toast({
        title: 'İçerik yüklenemedi',
        description: error instanceof Error ? error.message : 'İçerik yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (offer: EnrichedDelivery) => {
    const deliveryStatus = offer.deliveryStatus;
    const isCollab = isCollaborationCampaign(offer.campaignData ?? null);
    if (isCollab && offer.contentMediaApproved && !offer.contentApproved) {
      const shareReady = isOfferShareLinkCompleteForCampaign(offer, offer.campaignData ?? null);
      return (
        <Badge className={`${shareReady ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200'} flex items-center gap-1`}>
          {shareReady ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          {shareReady ? 'Paylaşım linki incelemede' : 'Paylaşım bekleniyor'}
        </Badge>
      );
    }
    if (isCollab && deliveryStatus === 'delivered' && !offer.contentMediaApproved) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center gap-1">
          <CheckCircle2 size={12} />
          Video iletildi, incelemede
        </Badge>
      );
    }
    switch (deliveryStatus) {
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 flex items-center gap-1">
            <Clock size={12} />
            Teslim Bekleniyor
          </Badge>
        );
      case 'revision':
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
            <AlertCircle size={12} />
            Revizyon İstendi
          </Badge>
        );
      case 'delivered':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center gap-1">
            <CheckCircle2 size={12} />
            İncelemede
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/35 dark:text-sky-100 flex items-center gap-1">
            <BadgeCheck size={12} />
            İçerik Onaylandı
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-none min-w-0 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="text-[#08afd5] dark:text-[#6edff3]" size={22} />
            İçerik Teslimleri
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl">
            Kabul aldığın kampanyalar için video veya görsel içeriklerini buradan yükle, revizyon
            taleplerini takip et ve teslim durumlarını tek ekrandan yönet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <ImageIcon size={14} />
            <span>Fotoğraf</span>
            <span className="mx-1 text-gray-400">•</span>
            <VideoIcon size={14} />
            <span>Video</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/80 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="text-[#08afd5] dark:text-[#6edff3]" size={14} />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Toplam Kampanya</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </Card>
        <Card className="p-4 rounded-2xl border border-amber-200/70 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-900/15 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="text-amber-600 dark:text-amber-300" size={14} />
            <p className="text-xs font-medium text-amber-800/80 dark:text-amber-200/90">
              İçerik Bekleyenler
            </p>
          </div>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.pending}</p>
        </Card>
        <Card className="p-4 rounded-2xl border border-red-200/70 dark:border-red-800/70 bg-red-50/80 dark:bg-red-900/15 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="text-red-600 dark:text-red-300" size={14} />
            <p className="text-xs font-medium text-red-800/80 dark:text-red-200/90">
              Revizyon İstenenler
            </p>
          </div>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.revision}</p>
        </Card>
        <Card className="p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-900/15 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" size={14} />
            <p className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/90">
              Marka İncelemesinde
            </p>
          </div>
          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            {stats.delivered}
          </p>
        </Card>
        <Card className="p-4 rounded-2xl border border-sky-200/70 dark:border-sky-800/70 bg-sky-50/80 dark:bg-sky-950/25 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="text-sky-600 dark:text-sky-300" size={14} />
            <p className="text-xs font-medium text-sky-900/85 dark:text-sky-100/95">Onaylananlar</p>
          </div>
          <p className="text-2xl font-bold text-sky-900 dark:text-sky-50">{stats.approved}</p>
        </Card>
      </div>

      <Card className="p-3 sm:p-4 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-gray-50/80 dark:bg-gray-900/70">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            <Filter size={14} className="text-[#08afd5] dark:text-[#6edff3]" />
            <span>Filtrele:</span>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={filter === 'all' ? 'default' : 'outline'}
                className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs ${
                  filter === 'all'
                    ? 'bg-[#08afd5] text-white dark:bg-[#08afd5] dark:text-white'
                    : ''
                }`}
                onClick={() => setFilter('all')}
              >
                Hepsi
              </Badge>
              <Badge
                variant={filter === 'pending' ? 'default' : 'outline'}
                className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs ${
                  filter === 'pending'
                    ? 'bg-amber-500 text-white dark:bg-amber-500 dark:text-white'
                    : ''
                }`}
                onClick={() => setFilter('pending')}
              >
                Teslim Bekleyen
              </Badge>
              <Badge
                variant={filter === 'revision' ? 'default' : 'outline'}
                className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs ${
                  filter === 'revision'
                    ? 'bg-red-500 text-white dark:bg-red-500 dark:text-white'
                    : ''
                }`}
                onClick={() => setFilter('revision')}
              >
                Revizyonda
              </Badge>
              <Badge
                variant={filter === 'delivered' ? 'default' : 'outline'}
                className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs ${
                  filter === 'delivered'
                    ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white'
                    : ''
                }`}
                onClick={() => setFilter('delivered')}
              >
                İncelemede
              </Badge>
              <Badge
                variant={filter === 'approved' ? 'default' : 'outline'}
                className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs ${
                  filter === 'approved'
                    ? 'bg-sky-500 text-white dark:bg-sky-500 dark:text-white'
                    : ''
                }`}
                onClick={() => setFilter('approved')}
              >
                Onaylananlar
              </Badge>
            </div>
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as DeliveryFilter)}
            >
              <SelectTrigger className="h-9 rounded-full text-xs sm:text-sm bg-white/80 dark:bg-gray-900/80 border-gray-200/70 dark:border-gray-800/80">
                <SelectValue placeholder="Teslim durumu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm teslimler</SelectItem>
                <SelectItem value="pending">Teslim bekleyenler</SelectItem>
                <SelectItem value="revision">Revizyondakiler</SelectItem>
                <SelectItem value="delivered">Marka incelemesinde</SelectItem>
                <SelectItem value="approved">Onaylananlar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 rounded-full border-2 border-[#08afd5]/30 border-t-[#08afd5] animate-spin" />
          </div>
        ) : filteredOffers.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-gray-300/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-900/70 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <FileText className="text-gray-400 dark:text-gray-500" size={24} />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Henüz içerik teslimi bulunmuyor
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              Kabul aldığın kampanyalar için içerik yüklediğinde, teslim ve revizyon süreçlerini burada
              görebileceksin.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOffers.map((offer) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="px-4 py-3 sm:px-5 sm:py-4 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-900/90 hover:shadow-lg hover:border-[#08afd5]/40 dark:hover:border-[#08afd5]/60 transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)] gap-3 md:gap-4 items-center">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/70 dark:border-gray-800/80 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {offer.brandLogoURL ? (
                          <img
                            src={offer.brandLogoURL}
                            alt={offer.brandName || 'Marka'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-semibold text-sm">
                            {(offer.brandName || 'M').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {offer.campaignTitle || 'Kampanya'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {offer.brandName || 'Bilinmeyen Marka'}
                        </p>
                        {offer.deadline && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-500 truncate">
                            Son teslim tarihi:{' '}
                            {new Date(offer.deadline).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getStatusBadge(offer)}
                          <Badge
                            variant="outline"
                            className="rounded-full text-[10px] px-2 py-0.5 text-gray-600 dark:text-gray-300 border-gray-200/70 dark:border-gray-700/70"
                          >
                            Teklif Tutarı: ₺{offer.price.toLocaleString('tr-TR')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        <span>
                          Oluşturma:{' '}
                          {new Date(offer.createdAt).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </span>
                      </div>
                      {offer.updatedAt && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-gray-400" />
                          <span>
                            Son güncelleme:{' '}
                            {new Date(offer.updatedAt).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                      {offer.publishStart && offer.publishEnd && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          <span>
                            Yayın aralığı:{' '}
                            {new Date(offer.publishStart).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(offer.publishEnd).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                      {offer.isExpired && (
                        <Badge className="bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-full px-3 py-1 text-[11px] flex items-center gap-1.5">
                          <Clock size={12} />
                          Süresi doldu
                        </Badge>
                      )}
                      {offer.deliveryStatus === 'revision' && !offer.isExpired && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-full text-xs px-3 border-red-200/70 dark:border-red-800/70 text-red-700 dark:text-red-300 bg-red-50/60 dark:bg-red-900/10 flex items-center gap-1.5"
                          onClick={() => handleOpenUploadModal(offer)}
                          disabled={!canOperate}
                        >
                          <AlertCircle size={14} />
                          Revize İçerik Yükle
                        </Button>
                      )}
                      {offer.deliveryStatus === 'pending' && !offer.isExpired && (
                        <Button
                          size="sm"
                          className="h-9 rounded-full text-xs px-4 brand-btn-primary text-white flex items-center gap-1.5"
                          onClick={() => handleOpenUploadModal(offer)}
                          disabled={!canOperate}
                        >
                          <Upload size={14} />
                          İçerik Yükle
                        </Button>
                      )}
                      {offer.deliveryStatus === 'delivered' && !offer.isExpired && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-full text-xs px-3 border-emerald-200/70 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/10 flex items-center gap-1.5"
                          onClick={() => handleOpenUploadModal(offer)}
                          disabled={!canOperate}
                        >
                          <Eye size={14} />
                          İçeriği Güncelle
                        </Button>
                      )}
                      {resolvePrimaryOfferContentUrl(offer) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-full text-[11px] sm:text-xs"
                          onClick={() => {
                            const items = listOfferContentMediaItems(offer, offer.campaignData ?? null);
                            const first =
                              items[0]?.url || resolvePrimaryOfferContentUrl(offer) || '';
                            setSelectedContentUrl(first);
                            setViewerMediaItems(items);
                            setSelectedContentOfferId(offer.id);
                            setContentViewerOpen(true);
                          }}
                        >
                          <FileText size={13} className="mr-1" />
                          Mevcut İçeriği Gör
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent
          className={`w-[calc(100%-24px)] md:w-full rounded-lg ${modalDeliverySlots.length > 0 ? 'max-w-xl' : 'max-w-md'}`}
        >
          <DialogHeader>
            <DialogTitle>İçerik Yükle</DialogTitle>
	            <DialogDescription>
	              {modalDeliverySlots.length > 0 ? (
	                isCollaborationCampaign(selectedOffer?.campaignData ?? null) &&
	                selectedOffer?.contentMediaApproved ? (
	                  <>
	                    Ham içerik marka tarafından onaylandı. Şimdi içeriği hesabınızda paylaşın ve yayın linkini
	                    ekleyin. Final onaydan sonra ödeme serbest kalır.
	                  </>
	                ) : (
	                  <>
	                    Bu kampanya için önce ham video veya görsel içeriğinizi yükleyin. Marka onayından sonra
	                    paylaşım linki aşaması açılır.
	                  </>
	                )
	              ) : (
                <>
                  Bu kampanya için video veya görsel içeriğini yükle. İçerik, marka ile paylaşılmak üzere
                  güvenli şekilde saklanacaktır.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            {selectedOffer && listRevisionsNewestFirst(selectedOffer).length > 0 ? (
              <div className="rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/25 px-3 py-3 space-y-2">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                  Markadan gelen revizyon talepleri
                </p>
                <ul className="space-y-2 max-h-[min(280px,40vh)] overflow-y-auto pr-1">
                  {listRevisionsNewestFirst(selectedOffer).map((rev, idx) => (
                    <li
                      key={rev.id}
                      className="text-xs rounded-lg bg-white/80 dark:bg-gray-950/60 border border-amber-100/90 dark:border-amber-900/40 p-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wide text-amber-800/90 dark:text-amber-200">
                          {rev.createdAt
                            ? new Date(rev.createdAt).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </span>
                        {idx === 0 && isRevisionResponsePending(selectedOffer) ? (
                          <span className="text-[10px] font-semibold text-[#e3447c] dark:text-[#ff8eb3]">
                            Yanıt bekleniyor
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-snug">
                        {rev.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {modalDeliverySlots.length > 0 ? (
              <div className="space-y-4">
                {modalDeliverySlots.map((slot) => (
                  <div
                    key={slot.lineId}
                    className="space-y-3 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-950/40 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#08afd5] dark:text-[#6edff3]">
                      {slot.label}
                    </p>
	                    {!(isCollaborationCampaign(selectedOffer?.campaignData ?? null) && selectedOffer?.contentMediaApproved) && (
	                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        Ham dosya (video / görsel)
                      </span>
                      <label
                        htmlFor={`delivery-slot-${slot.lineId}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-300/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-900/60 px-3 py-3 cursor-pointer hover:border-[#08afd5]/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white">
                            <Upload size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                              Dosya seç
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              JPG, PNG, MP4 — en fazla ~100 MB
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs px-3 shrink-0"
                        >
                          Gözat
                        </Button>
                        <input
                          id={`delivery-slot-${slot.lineId}`}
                          type="file"
                          accept="image/*,video/*"
                          className="sr-only"
                          onChange={(e) =>
                            setSlotFiles((prev) => ({
                              ...prev,
                              [slot.lineId]: e.target.files?.[0] ?? null,
                            }))
                          }
                        />
                      </label>
                      {(slotFiles[slot.lineId] || selectedOffer?.contentDeliveries?.[slot.lineId]?.contentUrl) && (
                        <p className="text-[11px] text-gray-600 dark:text-gray-400">
                          {slotFiles[slot.lineId] ? (
                            <>
                              Seçilen: <span className="font-medium">{slotFiles[slot.lineId]?.name}</span>
                            </>
                          ) : (
                            <>
                              Önceki yük:{' '}
                              <span className="font-medium">kayıtlı — yeni seçseniz güncellenir</span>
                            </>
                          )}
                        </p>
                      )}
	                    </div>
	                    )}
	                    {slot.needsShareLink && selectedOffer?.contentMediaApproved && (
	                      <div className="space-y-1.5">
                        <label
                          htmlFor={`share-${slot.lineId}`}
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Paylaşım linki (yayında)
                        </label>
                        <input
                          id={`share-${slot.lineId}`}
                          type="url"
                          inputMode="url"
                          placeholder="https://..."
                          autoComplete="off"
                          value={shareDraft[slot.lineId] ?? ''}
                          onChange={(e) =>
                            setShareDraft((prev) => ({ ...prev, [slot.lineId]: e.target.value }))
                          }
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                        />
                        <p className="text-[11px] text-gray-500">
	                          Ham içerik onaylandıktan sonra yayındaki gönderiye ait bağlantıyı yapıştır.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  İçerik Dosyası
                </label>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="delivery-file-input"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-300/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-900/60 px-3 py-3 cursor-pointer hover:border-[#08afd5]/60 hover:bg-gray-100/80 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white">
                        <Upload size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          Dosya seç veya sürükle-bırak
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          Desteklenen formatlar: JPG, PNG, MP4. Maksimum 100 MB.
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs px-3 border-gray-300/80 dark:border-gray-700/80"
                    >
                      Gözat
                    </Button>
                    <input
                      id="delivery-file-input"
                      type="file"
                      accept="image/*,video/*"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  {file && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Seçilen dosya: <span className="font-medium">{file.name}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadModalOpen(false)}
              disabled={uploading}
              className="flex items-center gap-2"
            >
              <X size={16} />
              İptal
            </Button>
            <Button
              className="brand-btn-primary text-white rounded-full flex items-center gap-2"
              onClick={handleUpload}
              disabled={uploading || Boolean(selectedOffer?.contentApproved)}
            >
	              <Upload size={16} />
	              {uploading
	                ? 'Yükleniyor...'
	                : isCollaborationCampaign(selectedOffer?.campaignData ?? null) && selectedOffer?.contentMediaApproved
	                  ? 'Paylaşım Linkini Gönder'
	                  : 'İçeriği Yükle'}
	            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContentViewerModal
        isOpen={contentViewerOpen}
        onClose={() => {
          setContentViewerOpen(false);
          setSelectedContentUrl('');
          setSelectedContentOfferId(undefined);
          setViewerMediaItems([]);
        }}
        contentUrl={selectedContentUrl}
        mediaItems={viewerMediaItems.length > 0 ? viewerMediaItems : undefined}
        offerId={selectedContentOfferId}
        influencerId={influencerId}
        isBrandPanel={false}
        canOperate={canOperate}
      />
    </div>
  );
};

