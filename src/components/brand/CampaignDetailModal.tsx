import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Users, TrendingUp, CheckCircle2, Clock, XCircle, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { FirebaseCampaign } from '@/services/firebaseCampaignService';
import { getOffersByCampaign, addOfferRevision, FirebaseOffer } from '@/services/firebaseOfferService';
import { getUserData } from '@/services/firebaseAuthService';
import { getInfluencerProfile } from '@/services/firebaseInfluencerService';
import { buildDailyClicksSeries, getTrackingLinksByCampaign, sumClicks } from '@/services/firebaseTrackingService';

interface CampaignDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: FirebaseCampaign | null;
  brandId: string;
  onViewOffers?: (campaign: FirebaseCampaign) => void;
}


const buildSpendingSeries = (offers: FirebaseOffer[], days: number) => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const buckets = new Map<string, { label: string; total: number }>();
  for (let i = 0; i < days; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = current.toISOString().slice(0, 10);
    const label = current.toLocaleDateString('tr-TR', { weekday: 'short' });
    buckets.set(key, { label, total: 0 });
  }

  offers.forEach((offer) => {
    const dateValue = offer.respondedAt || offer.updatedAt || offer.createdAt;
    if (!dateValue) return;
    const offerDate = new Date(dateValue);
    if (Number.isNaN(offerDate.getTime())) return;
    const key = offerDate.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket.total += offer.price || 0;
  });

  return Array.from(buckets.values()).map((bucket) => ({
    day: bucket.label,
    spent: bucket.total,
  }));
};

export function CampaignDetailModal({
  isOpen,
  onClose,
  campaign,
  brandId,
  onViewOffers,
}: CampaignDetailModalProps) {
  const [offers, setOffers] = useState<FirebaseOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [engagementData, setEngagementData] = useState<Array<{ date: string; engagement: number }>>([]);
  const [spendingData, setSpendingData] = useState<Array<{ day: string; spent: number }>>([]);
  const [totalEngagementValue, setTotalEngagementValue] = useState(0);
  const [influencerStats, setInfluencerStats] = useState<Record<string, { engagement: number; revisionRequests: number; contentViews: number }>>({});
  const [influencers, setInfluencers] = useState<Array<{ id: string; name: string; profilePhotoURL?: string; offerId: string; contentLink?: string }>>([]);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionTarget, setRevisionTarget] = useState<{ offerId: string; influencerName: string } | null>(null);
  const [revisionSending, setRevisionSending] = useState(false);

  useEffect(() => {
    if (isOpen && campaign) {
      loadCampaignData();
    }
  }, [isOpen, campaign]);

  const loadCampaignData = async () => {
    if (!campaign) return;

    setLoading(true);
    try {
      // Teklifleri yükle
      const offersData = await getOffersByCampaign(campaign.id);
      setOffers(offersData);

      const acceptedOffers = offersData.filter((o) => o.status === 'kabul');
      setSpendingData(buildSpendingSeries(acceptedOffers, 7));

      const trackingLinks = await getTrackingLinksByCampaign(campaign.id);
      setEngagementData(buildDailyClicksSeries(trackingLinks, 30, 'dayMonth'));
      setTotalEngagementValue(sumClicks(trackingLinks));

      const statsMap: Record<string, { engagement: number; revisionRequests: number; contentViews: number }> = {};
      trackingLinks.forEach((link) => {
        if (!link.influencerId) return;
        const clicks = sumClicks([link]);
        if (!statsMap[link.influencerId]) {
          statsMap[link.influencerId] = { engagement: 0, revisionRequests: 0, contentViews: 0 };
        }
        statsMap[link.influencerId].engagement += clicks;
      });
      setInfluencerStats(statsMap);

      // Kabul edilen tekliflerden influencer bilgilerini al
      const influencerPromises = acceptedOffers.map(async (offer) => {
        try {
          const influencerData = await getUserData(offer.influencerId, 'influencer');
          const profile = await getInfluencerProfile(offer.influencerId);
          return {
            id: offer.influencerId,
            name: (influencerData as any)?.fullName || 'Bilinmeyen Influencer',
            profilePhotoURL: profile?.profilePhotoURL,
            offerId: offer.id,
            contentLink: offer.contentLink,
          };
        } catch {
          return {
            id: offer.influencerId,
            name: 'Bilinmeyen Influencer',
            profilePhotoURL: undefined,
            offerId: offer.id,
            contentLink: offer.contentLink,
          };
        }
      });

      const influencerData = await Promise.all(influencerPromises);
      setInfluencers(influencerData);
    } catch (error) {
      console.error('Kampanya verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSendRevision = async () => {
    if (!revisionTarget) return;
    const note = revisionNote.trim();
    if (!note) return;
    try {
      setRevisionSending(true);
      await addOfferRevision(revisionTarget.offerId, note);
      setRevisionModalOpen(false);
      setRevisionNote('');
      setRevisionTarget(null);
      window.alert('Revizyon talebi gonderildi.');
    } catch (error) {
      window.alert('Revizyon talebi gonderilemedi.');
    } finally {
      setRevisionSending(false);
    }
  };

  if (!campaign) return null;

  const totalOffers = offers.length;
  const acceptedOffers = offers.filter((o) => o.status === 'kabul');
  const pendingOffers = offers.filter((o) => o.status === 'beklemede');
  const rejectedOffers = offers.filter((o) => o.status === 'red');
  const totalSpent = acceptedOffers.reduce((sum, o) => sum + o.price, 0);
  const totalEngagement = totalEngagementValue;

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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {campaign.title || campaign.productInfo}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Kampanya Detayları ve Performans
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
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <TrendingUp className="text-purple-600 dark:text-purple-400" size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Toplam Etkileşim</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                              {totalEngagement.toLocaleString('tr-TR')}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <DollarSign className="text-green-600 dark:text-green-400" size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Harcanan Miktar</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                              {new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: 'TRY',
                                minimumFractionDigits: 0,
                              }).format(totalSpent)}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Users className="text-blue-600 dark:text-blue-400" size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Toplam Teklif</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{totalOffers}</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                            <CheckCircle2 className="text-orange-600 dark:text-orange-400" size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Aktif Influencer</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                              {influencers.length}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Engagement Chart */}
                      <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Etkileşim Trendi (30 Gün)
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={engagementData}>
                              <defs>
                                <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => value.split(' ')[0]}
                              />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="engagement"
                                stroke="#9333ea"
                                strokeWidth={2}
                                fill="url(#engagementGradient)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      {/* Spending Chart */}
                      <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Harcama Trendi (7 Gün)
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={spendingData}>
                              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                }}
                                formatter={(value: number) =>
                                  new Intl.NumberFormat('tr-TR', {
                                    style: 'currency',
                                    currency: 'TRY',
                                    minimumFractionDigits: 0,
                                  }).format(value)
                                }
                              />
                              <Bar dataKey="spent" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Toplam Harcama</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {new Intl.NumberFormat('tr-TR', {
                              style: 'currency',
                              currency: 'TRY',
                              minimumFractionDigits: 0,
                            }).format(totalSpent)}
                          </span>
                        </div>
                      </Card>
                    </div>

                    {/* Offers Status */}
                    <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Teklif Durumu
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-800/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="text-yellow-600 dark:text-yellow-400" size={18} />
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                              Beklemede
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                            {pendingOffers.length}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="text-green-600 dark:text-green-400" size={18} />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              Kabul Edildi
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                            {acceptedOffers.length}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="text-red-600 dark:text-red-400" size={18} />
                            <span className="text-sm font-medium text-red-700 dark:text-red-400">
                              Reddedildi
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                            {rejectedOffers.length}
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Active Influencers */}
                    {influencers.length > 0 && (
                      <Card className="p-6 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Aktif Çalışan Influencerlar
                        </h4>
                        <div className="space-y-3">
                          {influencers.map((influencer) => {
                            const stats = influencerStats[influencer.id] || {
                              engagement: 0,
                              revisionRequests: 0,
                              contentViews: 0,
                            };

                            return (
                              <div
                                key={influencer.id}
                                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50"
                              >
                                <div className="flex items-center gap-3">
                                  {influencer.profilePhotoURL ? (
                                    <img
                                      src={influencer.profilePhotoURL}
                                      alt={influencer.name}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                      {influencer.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {influencer.name}
                                    </span>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                      <span className="flex items-center gap-1">
                                        <TrendingUp size={12} className="text-purple-600 dark:text-purple-400" />
                                        Etkilesim: <strong className="text-gray-900 dark:text-white">{stats.engagement}</strong>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock size={12} className="text-yellow-600 dark:text-yellow-400" />
                                        Revizyon: <strong className="text-gray-900 dark:text-white">{stats.revisionRequests}</strong>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Eye size={12} className="text-blue-600 dark:text-blue-400" />
                                        Goruntuleme: <strong className="text-gray-900 dark:text-white">{stats.contentViews}</strong>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg"
                                    disabled={!influencer.contentLink}
                                    onClick={() => {
                                      if (!influencer.contentLink) return;
                                      window.open(influencer.contentLink, '_blank');
                                    }}
                                  >
                                    Icerik Goruntule
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg"
                                    onClick={() => {
                                      setRevisionTarget({
                                        offerId: influencer.offerId,
                                        influencerName: influencer.name,
                                      });
                                      setRevisionNote('');
                                      setRevisionModalOpen(true);
                                    }}
                                  >
                                    Revizyon Iste
                                  </Button>
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Aktif
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200/50 dark:border-gray-800/50">
                <div className="flex items-center gap-2">
                  {campaign && onViewOffers && (
                    <Button
                      onClick={() => {
                        onViewOffers(campaign);
                        onClose();
                      }}
                      variant="outline"
                      className="rounded-lg"
                    >
                      <Users size={16} className="mr-2" />
                      Teklifler
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={onClose}>
                  Kapat
                </Button>
              </div>
            </div>
          

            <Dialog open={revisionModalOpen} onOpenChange={setRevisionModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Revizyon Talebi</DialogTitle>
                  <DialogDescription>
                    {revisionTarget ? `${revisionTarget.influencerName} icin revizyon notu yazin.` : 'Revizyon notu yazin.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Revizyon Notu
                  </label>
                  <Textarea
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    placeholder="Duzenlenmesini istediginiz noktalar..."
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRevisionModalOpen(false)} disabled={revisionSending}>
                    Iptal
                  </Button>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={handleSendRevision}
                    disabled={revisionSending || !revisionNote.trim()}
                  >
                    {revisionSending ? 'Gonderiliyor...' : 'Gonder'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
</motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
