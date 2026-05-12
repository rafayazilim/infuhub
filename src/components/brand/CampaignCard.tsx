import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Instagram, Youtube, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { FirebaseCampaign } from '@/services/firebaseCampaignService';
import { DailyClickPoint } from '@/services/firebaseTrackingService';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface CampaignCardProps {
  campaign: FirebaseCampaign;
  onViewDetails: (campaign: FirebaseCampaign) => void;
  engagementData?: DailyClickPoint[];
  totalEngagement?: number;
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram size={16} />,
  tiktok: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  ),
  youtube: <Youtube size={16} />,
};

const statusConfig = {
  aktif: { label: 'Aktif', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  taslak: { label: 'Taslak', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  tamamlandı: { label: 'Tamamlandı', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  iptal: { label: 'İptal', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onViewDetails,
  engagementData = [],
  totalEngagement,
}) => {
  const status = campaign.status || 'taslak';
  const statusInfo = statusConfig[status];
  const computedEngagement = engagementData.reduce((sum, d) => sum + d.engagement, 0);
  const totalEngagementValue =
    typeof totalEngagement === 'number' && totalEngagement > 0
      ? totalEngagement
      : computedEngagement;

  // Duration hesapla
  const getDuration = () => {
    if (campaign.duration.period) {
      return campaign.duration.period;
    }
    if (campaign.duration.start && campaign.duration.end) {
      const start = new Date(campaign.duration.start);
      const end = new Date(campaign.duration.end);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} gün`;
    }
    return 'Belirtilmemiş';
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="aspect-[4/3]"
    >
      <Card 
        className="h-full p-6 border border-gray-200/50 dark:border-gray-800/50 rounded-xl bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
        onClick={() => onViewDetails(campaign)}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 flex-1">
              {campaign.title || campaign.productInfo}
            </h3>
            <Badge className={`${statusInfo.color} rounded-md text-xs font-medium ml-2 flex-shrink-0`}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Platforms */}
          <div className="flex items-center gap-2 mb-4">
            {campaign.platforms.map((platform) => (
              <div
                key={platform}
                className="p-1.5 rounded-[8px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                title={platform}
              >
                {platformIcons[platform.toLowerCase()]}
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <DollarSign size={14} />
              <span className="font-medium">
                {new Intl.NumberFormat('tr-TR', {
                  style: 'currency',
                  currency: 'TRY',
                  minimumFractionDigits: 0,
                }).format(campaign.budget.total)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar size={14} />
              <span>{getDuration()}</span>
            </div>
          </div>

          {/* Engagement Chart */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Etkileşim
                </span>
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {totalEngagementValue.toLocaleString('tr-TR')}
              </span>
            </div>
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementData}>
                  <defs>
                    <linearGradient id={`gradient-${campaign.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stroke="#9333ea"
                    strokeWidth={2}
                    fill={`url(#gradient-${campaign.id})`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#6b7280' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
