import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignCard } from './CampaignCard';
import { BrandCampaignCardContextMenu } from './BrandCampaignCardContextMenu';
import {
  deleteBrandCampaignPermanentlyIfAllowed,
  getBrandCampaigns,
  FirebaseCampaign,
} from '@/services/firebaseCampaignService';
import { campaignHasAnyAcceptedOffer } from '@/services/firebaseOfferService';
import { InfluencerOffersModal } from './InfluencerOffersModal';
import { CampaignDetailModal } from './CampaignDetailModal';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CampaignsContentProps {
  onCreateCampaign: () => void;
  /** Kabul edilmiş teklif yokken sağ tık menüsünden düzenleme */
  onEditCampaign?: (campaign: FirebaseCampaign) => void;
  brandId: string;
  canOperate?: boolean;
  /** Üst bileşenden artırılır; kampanya oluşturma vb. sonrası liste yeniden yüklenir. */
  libraryRefreshKey?: number;
}

type StatusFilter = 'all' | 'aktif' | 'taslak' | 'tamamlandı' | 'iptal';
type PlatformFilter = 'all' | 'instagram' | 'tiktok' | 'youtube';

export const CampaignsContent: React.FC<CampaignsContentProps> = ({
  onCreateCampaign,
  onEditCampaign,
  brandId,
  canOperate = true,
  libraryRefreshKey = 0,
}) => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<FirebaseCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  // Offers Modal State
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [selectedCampaignForOffers, setSelectedCampaignForOffers] = useState<FirebaseCampaign | null>(null);
  const [selectedInfluencerForOffers, setSelectedInfluencerForOffers] = useState<string | null>(null);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCampaignForDetail, setSelectedCampaignForDetail] = useState<FirebaseCampaign | null>(null);

  const [cardContextMenu, setCardContextMenu] = useState<{
    x: number;
    y: number;
    campaign: FirebaseCampaign;
  } | null>(null);
  const [cardActionBusy, setCardActionBusy] = useState<{
    id: string;
    action: 'edit' | 'delete';
  } | null>(null);

  useEffect(() => {
    if (brandId) {
      loadCampaigns();
    }
  }, [brandId, libraryRefreshKey]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await getBrandCampaigns(brandId);
      setCampaigns(data);
    } catch (error) {
      console.error('Kampanyalar yüklenemedi:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const statusMatch = statusFilter === 'all' || campaign.status === statusFilter;
    const platformMatch =
      platformFilter === 'all' ||
      campaign.platforms.some((p) => p.toLowerCase() === platformFilter);
    return statusMatch && platformMatch;
  });

  const handleViewDetails = (campaign: FirebaseCampaign) => {
    setSelectedCampaignForDetail(campaign);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedCampaignForDetail(null);
  };

  const handleViewOffers = (campaign: FirebaseCampaign, influencerId?: string) => {
    if (!canOperate) return;
    setSelectedCampaignForOffers(campaign);
    setSelectedInfluencerForOffers(influencerId || null);
    setOffersModalOpen(true);
  };

  const handleCloseOffersModal = () => {
    setOffersModalOpen(false);
    setSelectedCampaignForOffers(null);
    setSelectedInfluencerForOffers(null);
    loadCampaigns();
  };

  const handleCampaignCardContextMenu = useCallback(
    (event: React.MouseEvent, campaign: FirebaseCampaign) => {
      if (!canOperate) return;
      setCardContextMenu({ x: event.clientX, y: event.clientY, campaign });
    },
    [canOperate]
  );

  const closeCardContextMenu = useCallback(() => setCardContextMenu(null), []);

  const showCampaignLockedToast = useCallback(() => {
    toast({
      title: 'İşlem yapılamaz',
      description: 'Kabul edilmiş influencer anlaşması varken kampanya silinemez veya düzenlenemez.',
      variant: 'destructive',
    });
  }, [toast]);

  const ensureCampaignCanBeChanged = useCallback(
    async (campaign: FirebaseCampaign) => {
      const hasAcceptedOffer = await campaignHasAnyAcceptedOffer(brandId, campaign.id);
      if (hasAcceptedOffer) {
        showCampaignLockedToast();
        return false;
      }
      return true;
    },
    [brandId, showCampaignLockedToast]
  );

  const handleEditCampaignFromCard = useCallback(
    async (campaign: FirebaseCampaign) => {
      if (!canOperate || !onEditCampaign || cardActionBusy) return;
      setCardActionBusy({ id: campaign.id, action: 'edit' });
      try {
        if (!(await ensureCampaignCanBeChanged(campaign))) return;
        onEditCampaign(campaign);
      } catch (e) {
        console.error(e);
        toast({
          title: 'Düzenleme açılamadı',
          description: e instanceof Error ? e.message : 'Bir hata oluştu.',
          variant: 'destructive',
        });
      } finally {
        setCardActionBusy(null);
      }
    },
    [canOperate, onEditCampaign, cardActionBusy, ensureCampaignCanBeChanged, toast]
  );

  const handleDeleteCampaignFromCard = useCallback(
    async (campaign: FirebaseCampaign) => {
      if (!canOperate || cardActionBusy) return;
      setCardActionBusy({ id: campaign.id, action: 'delete' });
      try {
        await deleteBrandCampaignPermanentlyIfAllowed(brandId, campaign.id);
        toast({ title: 'Kampanya silindi' });
        await loadCampaigns();
      } catch (e) {
        console.error(e);
        toast({
          title: 'Silinemedi',
          description: e instanceof Error ? e.message : 'Bir hata oluştu.',
          variant: 'destructive',
        });
      } finally {
        setCardActionBusy(null);
      }
    },
    [brandId, canOperate, cardActionBusy, toast]
  );

  return (
    <div className="w-full max-w-none min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Kampanyalar</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Tüm kampanyalarınızı görüntüleyin ve yönetin
          </p>
        </div>
        <Button
          onClick={onCreateCampaign}
          disabled={!canOperate}
          className="brand-btn-primary text-white rounded-xl px-6 py-2.5 flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Yeni Kampanya Oluştur
        </Button>
      </div>

      {/* Filters */}
      <div className="mac-surface p-3 flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[#08afd5] dark:text-[#6edff3]" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrele:</span>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40 rounded-xl h-9">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="taslak">Taslak</SelectItem>
            <SelectItem value="tamamlandı">Tamamlandı</SelectItem>
            <SelectItem value="iptal">İptal</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={platformFilter}
          onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}
        >
          <SelectTrigger className="w-40 rounded-xl h-9">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Platformlar</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#08afd5]/30 border-t-[#08afd5] rounded-full animate-spin" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        /* Empty State */
        <div className="flex items-center justify-center py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="aspect-[4/3] max-w-sm mx-auto p-12 mac-surface flex flex-col items-center justify-center">
              <div className="w-16 h-16 mb-4 rounded-[12px] bg-[#08afd5]/15 dark:bg-[#08afd5]/20 flex items-center justify-center">
                <Megaphone className="text-[#08afd5] dark:text-[#6edff3]" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {statusFilter !== 'all' || platformFilter !== 'all'
                  ? 'Kampanya Bulunamadı'
                  : 'Henüz Kampanya Yok'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                {statusFilter !== 'all' || platformFilter !== 'all'
                  ? 'Seçili filtrelere uygun kampanya bulunamadı'
                  : 'İlk kampanyanızı oluşturarak başlayın'}
              </p>
              {statusFilter === 'all' && platformFilter === 'all' && (
                <Button
                  onClick={onCreateCampaign}
                  disabled={!canOperate}
                  className="brand-btn-primary text-white rounded-xl px-6 py-2.5"
                >
                  <Plus size={18} className="mr-2" />
                  İlk Kampanyanı Oluştur
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Campaign Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onViewDetails={handleViewDetails}
              onOpenContextMenu={canOperate ? handleCampaignCardContextMenu : undefined}
              onEditCampaign={onEditCampaign ? handleEditCampaignFromCard : undefined}
              onDeleteCampaign={handleDeleteCampaignFromCard}
              canManage={canOperate}
              actionBusy={
                cardActionBusy?.id === campaign.id ? cardActionBusy.action : null
              }
            />
          ))}
        </div>
      )}

      {/* Influencer Offers Modal */}
      {selectedCampaignForOffers && (
        <InfluencerOffersModal
          isOpen={offersModalOpen}
          onClose={handleCloseOffersModal}
          campaign={selectedCampaignForOffers}
          brandId={brandId}
          initialSelectedInfluencerId={selectedInfluencerForOffers}
          canOperate={canOperate}
        />
      )}

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        isOpen={detailModalOpen}
        onClose={handleCloseDetailModal}
        campaign={selectedCampaignForDetail}
        brandId={brandId}
        onViewOffers={handleViewOffers}
        canOperate={canOperate}
      />

      {cardContextMenu ? (
        <BrandCampaignCardContextMenu
          open
          clientX={cardContextMenu.x}
          clientY={cardContextMenu.y}
          campaign={cardContextMenu.campaign}
          brandId={brandId}
          canOperate={canOperate}
          onClose={closeCardContextMenu}
          onDeleted={loadCampaigns}
          onViewDetails={() => {
            const c = cardContextMenu.campaign;
            closeCardContextMenu();
            handleViewDetails(c);
          }}
          onEdit={
            onEditCampaign
              ? () => {
                  const c = cardContextMenu.campaign;
                  closeCardContextMenu();
                  onEditCampaign(c);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
};
