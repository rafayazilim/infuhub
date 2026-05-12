import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Banknote, Calendar, Loader2, Pencil, Trash2 } from 'lucide-react';
import { FirebaseCampaign } from '@/services/firebaseCampaignService';
import { resolveRegistrationPlatformId } from '@/constants/registrationPlatforms';
import { RegistrationPlatformIcon } from '@/components/shared/RegistrationPlatformIcon';
import { formatContentLinesSummary, hasContentLines } from '@/lib/campaignContentLines';
import { cn } from '@/lib/utils';

interface CampaignCardProps {
  campaign: FirebaseCampaign;
  onViewDetails: (campaign: FirebaseCampaign) => void;
  onOpenContextMenu?: (event: React.MouseEvent, campaign: FirebaseCampaign) => void;
  onEditCampaign?: (campaign: FirebaseCampaign) => void;
  onDeleteCampaign?: (campaign: FirebaseCampaign) => void;
  actionBusy?: 'edit' | 'delete' | null;
  canManage?: boolean;
}

const statusConfig = {
  aktif: { label: 'Aktif', color: 'bg-[#08afd5]/20 text-[#08afd5] dark:bg-[#08afd5]/25 dark:text-[#76e3f5]' },
  taslak: { label: 'Taslak', color: 'bg-[#e3447c]/15 text-[#e3447c] dark:bg-[#e3447c]/20 dark:text-[#f083ab]' },
  tamamlandı: { label: 'Tamamlandı', color: 'bg-[#08afd5]/15 text-[#08afd5] dark:bg-[#08afd5]/20 dark:text-[#76e3f5]' },
  iptal: { label: 'İptal', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
} as const;

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onViewDetails,
  onOpenContextMenu,
  onEditCampaign,
  onDeleteCampaign,
  actionBusy = null,
  canManage = true,
}) => {
  const status = campaign.status || 'taslak';
  const statusInfo = statusConfig[status];
  const showActions = Boolean(onEditCampaign || onDeleteCampaign);

  const handleCardAction = (
    event: React.MouseEvent<HTMLButtonElement>,
    action?: (campaign: FirebaseCampaign) => void
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canManage || !action || actionBusy) return;
    action(campaign);
  };

  const getDuration = () => {
    if (campaign.duration.period) return campaign.duration.period;
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
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="aspect-[4/3] group"
    >
      <Card
        className="h-full overflow-hidden border border-gray-200/60 dark:border-gray-800/60 rounded-2xl bg-white dark:bg-gray-900 shadow-[0_12px_30px_rgba(15,23,42,0.12)] hover:shadow-[0_16px_40px_rgba(8,175,213,0.22)] transition-all duration-200 cursor-pointer"
        onClick={() => onViewDetails(campaign)}
        onContextMenu={(e) => {
          if (!onOpenContextMenu) return;
          e.preventDefault();
          e.stopPropagation();
          onOpenContextMenu(e, campaign);
        }}
      >
        <div className="relative h-full">
          {showActions ? (
            <div className="absolute right-3 top-3 z-20 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              {onEditCampaign ? (
                <button
                  type="button"
                  aria-label="Kampanyayı düzenle"
                  title="Düzenle"
                  disabled={!canManage || Boolean(actionBusy)}
                  onClick={(event) => handleCardAction(event, onEditCampaign)}
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition-colors',
                    canManage && !actionBusy
                      ? 'hover:bg-white/18'
                      : 'cursor-not-allowed opacity-45'
                  )}
                >
                  {actionBusy === 'edit' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Pencil className="h-4 w-4" aria-hidden />
                  )}
                </button>
              ) : null}
              {onDeleteCampaign ? (
                <button
                  type="button"
                  aria-label="Kampanyayı sil"
                  title="Sil"
                  disabled={!canManage || Boolean(actionBusy)}
                  onClick={(event) => handleCardAction(event, onDeleteCampaign)}
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/20 bg-black/45 text-red-200 shadow-lg backdrop-blur-md transition-colors',
                    canManage && !actionBusy
                      ? 'hover:bg-red-500/35 hover:text-white'
                      : 'cursor-not-allowed opacity-45'
                  )}
                >
                  {actionBusy === 'delete' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
          ) : null}

          {campaign.campaignImageURL ? (
            <img
              src={campaign.campaignImageURL}
              alt={campaign.campaignName || campaign.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/15" />

          <div className="relative h-full flex flex-col justify-end p-4">
            <div className="flex items-start justify-between mb-2 gap-2">
              <h3 className="text-xl font-bold text-white line-clamp-1">
                {campaign.campaignName || campaign.title || 'Kampanya'}
              </h3>
              <Badge className={`${statusInfo.color} rounded-full text-[11px] font-medium flex-shrink-0 border-0`}>
                {statusInfo.label}
              </Badge>
            </div>

            <p className="text-sm text-white/85 line-clamp-2 min-h-[40px]">
              {campaign.campaignDescription || campaign.productDescription || campaign.productInfo || 'Açıklama girilmemiş.'}
            </p>

            <div className="flex items-center flex-wrap gap-2 mt-3 mb-3 min-h-[28px]">
              {hasContentLines(campaign) ? (
                <p className="text-xs text-white/90 line-clamp-2" title={formatContentLinesSummary(campaign)}>
                  {formatContentLinesSummary(campaign)}
                </p>
              ) : (
                (campaign.platforms || []).map((platform) => (
                  <div
                    key={platform}
                    className="p-1.5 rounded-lg bg-white/15 text-white backdrop-blur-sm border border-white/20"
                    title={platform}
                  >
                    <RegistrationPlatformIcon
                      platformId={resolveRegistrationPlatformId(platform)}
                      size={16}
                    />
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-white/90">
              <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-black/35 border border-white/10">
                <Banknote size={14} className="text-[#6edff3]" />
                <span className="font-medium">
                  {new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                    minimumFractionDigits: 0,
                  }).format(campaign.budget.total)}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-black/35 border border-white/10">
                <Calendar size={14} className="text-sky-300" />
                <span>{getDuration()}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
