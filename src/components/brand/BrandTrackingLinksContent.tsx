import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Copy,
  Filter,
  Link2,
  Check,
  Globe,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTrackingLinksByBrand, TrackingLink } from '@/services/firebaseTrackingService';
import { getCampaignById } from '@/services/firebaseCampaignService';

interface BrandTrackingLinksContentProps {
  brandId: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

interface EnrichedTrackingLink extends TrackingLink {
  campaignTitle?: string;
}

const statusConfig = {
  active: {
    label: 'Aktif',
    icon: <CheckCircle size={14} />,
    color: 'bg-[#08afd5]/20 text-[#08afd5] dark:bg-[#08afd5]/25 dark:text-[#76e3f5]',
    borderColor: 'border-[#08afd5]/35 dark:border-[#08afd5]/45',
  },
  inactive: {
    label: 'Pasif',
    icon: <XCircle size={14} />,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800/50',
  },
};

const getClickCount = (link: TrackingLink) => {
  if (typeof link.clickCount === 'number') return link.clickCount;
  if (typeof link.clickCount === 'string') {
    const parsed = Number(link.clickCount);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (link.clicks) return Object.keys(link.clicks).length;
  return 0;
};

export const BrandTrackingLinksContent: React.FC<BrandTrackingLinksContentProps> = ({ brandId }) => {
  const [links, setLinks] = useState<EnrichedTrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  useEffect(() => {
    if (brandId) {
      loadLinks();
    }
  }, [brandId]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const trackingLinks = await getTrackingLinksByBrand(brandId);
      const uniqueCampaigns = Array.from(
        new Set(trackingLinks.map((link) => link.campaignId).filter(Boolean))
      );

      const campaignMap = new Map<string, string>();
      await Promise.all(
        uniqueCampaigns.map(async (campaignId) => {
          try {
            const campaign = await getCampaignById(brandId, campaignId);
            if (campaign) {
              campaignMap.set(campaignId, campaign.title || campaign.productInfo || 'Kampanya');
            }
          } catch {
            campaignMap.set(campaignId, 'Kampanya');
          }
        })
      );

      const enriched = trackingLinks.map((link) => ({
        ...link,
        campaignTitle: link.campaignId ? campaignMap.get(link.campaignId) : 'Kampanya',
      }));

      enriched.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });

      setLinks(enriched);
    } catch (error) {
      console.error('Tracking linkler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const campaignOptions = useMemo(() => {
    const map = new Map<string, string>();
    links.forEach((link) => {
      if (link.campaignId) {
        map.set(link.campaignId, link.campaignTitle || 'Kampanya');
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [links]);

  const filteredLinks = useMemo(() => {
    let result = links;
    if (statusFilter !== 'all') {
      const active = statusFilter === 'active';
      result = result.filter((link) => Boolean(link.isActive) === active);
    }
    if (campaignFilter !== 'all') {
      result = result.filter((link) => link.campaignId === campaignFilter);
    }
    return result;
  }, [links, statusFilter, campaignFilter]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const baseTrackingUrl = import.meta.env.VITE_TRACKING_BASE_URL || 'http://localhost:3002';

  const buildTrackingUrl = (link: TrackingLink) => {
    return link.shortCode ? `${baseTrackingUrl}/c/${link.shortCode}` : '-';
  };

  const handleCopy = async (link: TrackingLink) => {
    const url = buildTrackingUrl(link);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.shortCode);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch {
      setCopiedLinkId(null);
    }
  };

  return (
    <div className="w-full max-w-none min-w-0">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Takip Linkleri</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Oluşturduğunuz takip linklerini görüntüleyin ve performansı takip edin
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrele:</span>
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-40 rounded-xl h-9">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Pasif</SelectItem>
            </SelectContent>
          </Select>
          <Select value={campaignFilter} onValueChange={(v) => setCampaignFilter(v)}>
            <SelectTrigger className="w-56 rounded-xl h-9">
              <SelectValue placeholder="Kampanya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kampanyalar</SelectItem>
              {campaignOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Görünüm:</span>
          <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 p-1">
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-[#08afd5] text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setViewMode('card')}
              type="button"
            >
              Kart
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#08afd5] text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setViewMode('list')}
              type="button"
            >
              Liste
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#08afd5]/30 border-t-[#08afd5] rounded-full animate-spin" />
        </div>
      ) : filteredLinks.length === 0 ? (
        <Card className="p-12 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#08afd5]/15 dark:bg-[#08afd5]/20 flex items-center justify-center">
              <Link2 size={32} className="text-[#08afd5] dark:text-[#6edff3]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {statusFilter === 'all' ? 'Henüz Takip Linki Yok' : 'Takip Linki Bulunamadı'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {statusFilter === 'all'
                ? 'Takip linkleri oluşturduğunuzda burada görünecek.'
                : 'Seçili filtreye uygun link bulunamadı.'}
            </p>
          </div>
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.map((link) => {
            const statusKey: 'active' | 'inactive' = link.isActive ? 'active' : 'inactive';
            const status = statusConfig[statusKey];
            return (
              <motion.div
                key={link.shortCode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <Card
                  className={`p-5 border rounded-xl bg-white dark:bg-gray-900 hover:shadow-md transition-all ${status.borderColor} h-full`}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold text-lg">
                        <Link2 size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {link.campaignTitle}
                          </h4>
                          <Badge className={`${status.color} flex items-center gap-1`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {buildTrackingUrl(link)}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Globe size={14} />
                            <span>{link.platform || 'Platform'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{formatDate(link.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-800/60 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <div>
                        <span className="text-xs">Tıklama</span>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {getClickCount(link)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-lg ml-auto"
                        onClick={() => handleCopy(link)}
                      >
                        {copiedLinkId === link.shortCode ? (
                          <Check size={14} className="mr-1" />
                        ) : (
                          <Copy size={14} className="mr-1" />
                        )}
                        Kopyala
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLinks.map((link) => {
            const statusKey: 'active' | 'inactive' = link.isActive ? 'active' : 'inactive';
            const status = statusConfig[statusKey];
            return (
              <motion.div
                key={link.shortCode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Card
                  className={`px-4 py-3 border rounded-xl bg-white dark:bg-gray-900 hover:shadow-sm transition-all ${status.borderColor}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#08afd5] to-[#e3447c] flex items-center justify-center text-white font-bold">
                        <Link2 size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {link.campaignTitle}
                          </p>
                          <Badge className={`${status.color} flex items-center gap-1`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {buildTrackingUrl(link)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                      <Globe size={14} />
                      <span>{link.platform || 'Platform'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar size={14} />
                      <span>{formatDate(link.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <div className="text-sm text-gray-700 dark:text-gray-300 mr-2">
                        {getClickCount(link)} tıklama
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-lg"
                        onClick={() => handleCopy(link)}
                      >
                        {copiedLinkId === link.shortCode ? (
                          <Check size={14} className="mr-1" />
                        ) : (
                          <Copy size={14} className="mr-1" />
                        )}
                        Kopyala
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};



