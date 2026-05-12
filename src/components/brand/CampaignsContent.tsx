import React, { useState, useEffect } from 'react';
import { Plus, Filter, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignCard } from './CampaignCard';
import { getBrandCampaigns, FirebaseCampaign } from '@/services/firebaseCampaignService';
import { buildDailyClicksSeries, getTrackingLinksByCampaign, sumClicks } from '@/services/firebaseTrackingService';
import { InfluencerOffersModal } from './InfluencerOffersModal';
import { CampaignDetailModal } from './CampaignDetailModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CampaignsContentProps {
  onCreateCampaign: () => void;
  brandId: string;
}

type StatusFilter = 'all' | 'aktif' | 'taslak' | 'tamamlandı' | 'iptal';
type PlatformFilter = 'all' | 'instagram' | 'tiktok' | 'youtube';

export const CampaignsContent: React.FC<CampaignsContentProps> = ({
  onCreateCampaign,
  brandId,
}) => {
  const [campaigns, setCampaigns] = useState<FirebaseCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [campaignEngagement, setCampaignEngagement] = useState<Record<string, Array<{ date: string; engagement: number }>>>({});
  const [campaignEngagementTotals, setCampaignEngagementTotals] = useState<Record<string, number>>({});

  // Offers Modal State
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [selectedCampaignForOffers, setSelectedCampaignForOffers] = useState<FirebaseCampaign | null>(null);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCampaignForDetail, setSelectedCampaignForDetail] = useState<FirebaseCampaign | null>(null);

  useEffect(() => {
    if (brandId) {
      loadCampaigns();
    }
  }, [brandId]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await getBrandCampaigns(brandId);
      setCampaigns(data);

      await loadEngagementData(data);
    } catch (error) {
      console.error('Kampanyalar yüklenemedi:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEngagementData = async (campaignList: FirebaseCampaign[]) => {
    try {
      if (campaignList.length === 0) {
        setCampaignEngagement({});
        setCampaignEngagementTotals({});
        return;
      }

      const engagementMap: Record<string, Array<{ date: string; engagement: number }>> = {};
      const totalsMap: Record<string, number> = {};

      const campaignLinksList = await Promise.all(
        campaignList.map(async (campaign) => ({
          campaignId: campaign.id,
          links: await getTrackingLinksByCampaign(campaign.id),
        }))
      );

      campaignLinksList.forEach(({ campaignId, links }) => {
        engagementMap[campaignId] = buildDailyClicksSeries(links, 30, 'dayMonth');
        totalsMap[campaignId] = sumClicks(links);
      });

      setCampaignEngagement(engagementMap);
      setCampaignEngagementTotals(totalsMap);
    } catch (error) {
      console.error('Etkilesim verileri yuklenemedi:', error);
      setCampaignEngagement({});
      setCampaignEngagementTotals({});
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

  const handleViewOffers = (campaign: FirebaseCampaign) => {
    setSelectedCampaignForOffers(campaign);
    setOffersModalOpen(true);
  };

  const handleCloseOffersModal = () => {
    setOffersModalOpen(false);
    setSelectedCampaignForOffers(null);
  };


  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Kampanyalar</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Tüm kampanyalarınızı görüntüleyin ve yönetin
          </p>
        </div>
        <Button
          onClick={onCreateCampaign}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-[10px] px-6 py-2.5 flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Yeni Kampanya Oluştur
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrele:</span>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40 rounded-[10px] h-9">
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
          <SelectTrigger className="w-40 rounded-[10px] h-9">
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
          <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        /* Empty State */
        <div className="flex items-center justify-center py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="aspect-[4/3] max-w-sm mx-auto p-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 mb-4 rounded-[12px] bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Megaphone className="text-purple-600 dark:text-purple-400" size={32} />
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
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-[10px] px-6 py-2.5"
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
              engagementData={campaignEngagement[campaign.id] || []}
              totalEngagement={campaignEngagementTotals[campaign.id] || 0}
              onViewDetails={handleViewDetails}
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
        />
      )}

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        isOpen={detailModalOpen}
        onClose={handleCloseDetailModal}
        campaign={selectedCampaignForDetail}
        brandId={brandId}
        onViewOffers={handleViewOffers}
      />
    </div>
  );
};
