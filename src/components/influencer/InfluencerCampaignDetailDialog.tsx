import React from 'react';
import {
  Building2,
  Calendar,
  Clock,
  Banknote,
  FileText,
  MapPin,
  Sparkles,
  Target,
  Tags,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ActiveCampaign, canInfluencerSubmitOfferOnCampaign } from '@/services/firebaseCampaignService';
import { FirebaseOffer } from '@/services/firebaseOfferService';
import { getContentLines, formatContentLinesSummary, hasContentLines, formatDurationShort } from '@/lib/campaignContentLines';
import { getCampaignModelLabel } from '@/lib/campaignModelLabels';
import { formatCampaignGoalLabel } from '@/constants/campaignGoals';
import { resolveRegistrationPlatformId } from '@/constants/registrationPlatforms';
import { RegistrationPlatformIcon } from '@/components/shared/RegistrationPlatformIcon';
import { cn } from '@/lib/utils';

const formatDate = (date?: string) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const getArrayValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
};

const getPrimaryBudget = (campaign: ActiveCampaign) => {
  const per = Number(campaign.budget?.perInfluencer || 0);
  if (per > 0) return per;
  return Number(campaign.budget?.total || 0);
};

type RowProps = { icon: React.ReactNode; label: string; children: React.ReactNode; className?: string };

const InfoRow: React.FC<RowProps> = ({ icon, label, children, className }) => (
  <div
    className={cn(
      'flex gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white/95 backdrop-blur-md',
      'dark:border-white/10',
      className
    )}
  >
    <div className="mt-0.5 shrink-0 text-[#6edff3] opacity-90">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-white/95 break-words leading-snug">{children}</div>
    </div>
  </div>
);

export interface InfluencerCampaignDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: ActiveCampaign | null;
  onOfferClick: (campaign: ActiveCampaign) => void;
  existingOffer?: FirebaseOffer | null;
  /** Marka → influencer teklifi (red değil); katılım teklifi gönderilemez */
  brandDirectOffer?: FirebaseOffer | null;
  canOperate: boolean;
  hasInfluencerId: boolean;
}

function formatLocationDisplay(c: ActiveCampaign): string {
  const loc = c.targetAudience?.location;
  if (loc == null || loc === '') return '—';
  if (typeof loc === 'string') return loc;
  if (Array.isArray(loc)) return loc.filter(Boolean).join(', ');
  return '—';
}

export const InfluencerCampaignDetailDialog: React.FC<InfluencerCampaignDetailDialogProps> = ({
  open,
  onOpenChange,
  campaign,
  onOfferClick,
  existingOffer,
  brandDirectOffer,
  canOperate,
  hasInfluencerId,
}) => {
  if (!campaign) return null;

  const budget = getPrimaryBudget(campaign);
  const lines = getContentLines(campaign);
  const participationBlocked = Boolean(existingOffer) || Boolean(brandDirectOffer);
  const canOffer =
    canOperate &&
    hasInfluencerId &&
    canInfluencerSubmitOfferOnCampaign(campaign) &&
    !participationBlocked;
  const offerLabel = existingOffer
    ? 'Teklifin gönderildi'
    : brandDirectOffer
      ? 'Marka teklifi mevcut'
      : !hasInfluencerId
        ? 'Giriş yap'
        : !canOperate
          ? 'Doğrulama ve kurulum gerekli'
          : !canInfluencerSubmitOfferOnCampaign(campaign)
            ? 'Başvuru kapalı'
            : 'Bu kampanyaya teklif ver';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!flex w-[min(92vw,960px)] !max-w-[min(92vw,960px)] !flex-col !gap-0 !p-0 max-h-[min(88vh,820px)] overflow-hidden rounded-2xl border-0 bg-transparent shadow-2xl shadow-black/50 data-[state=open]:!translate-y-[-50%] [&>button]:right-3 [&>button]:top-3 [&>button]:z-[60] [&>button]:inline-flex [&>button]:h-9 [&>button]:w-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/40 [&>button]:p-0 text-white ring-offset-gray-900 [&>button]:text-white hover:[&>button]:bg-black/60 [&>button]:opacity-100"
      >
        <div className="relative flex max-h-[min(88vh,820px)] min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-950 text-white shadow-inner">
          {/* Hero — geniş panel */}
          <div className="relative h-44 shrink-0 sm:h-52">
            {campaign.campaignImageURL ? (
              <img
                src={campaign.campaignImageURL}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
            )}
            {/* Görsel varken üstte daha az karartma: foto net görünsün */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-t to-transparent',
                campaign.campaignImageURL
                  ? 'from-gray-950 via-gray-900/50'
                  : 'from-gray-950 via-gray-950/70 to-black/20'
              )}
            />
            <div
              className={cn(
                'pointer-events-none absolute inset-0',
                campaign.campaignImageURL ? 'opacity-[0.04]' : 'opacity-[0.12]'
              )}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L45 15L30 30L15 15z' fill='%2308afd5' fill-opacity='0.4'/%3E%3C/svg%3E")`,
                backgroundSize: '80px 80px',
              }}
            />
            <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-5 sm:right-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pr-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                    <Building2 size={12} className="shrink-0 opacity-80" />
                    <span className="truncate">{campaign.brandName || 'Marka'}</span>
                  </p>
                  <DialogTitle className="mt-1 pr-2 text-left text-lg font-bold leading-tight text-white sm:text-2xl line-clamp-2">
                    {campaign.campaignName || campaign.title || 'Kampanya'}
                  </DialogTitle>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
                  {campaign.status === 'taslak' && (
                    <Badge className="border-0 bg-amber-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md sm:text-xs">
                      Taslak
                    </Badge>
                  )}
                  {campaign.campaignModel && (
                    <Badge className="border-0 bg-[#08afd5] px-2.5 py-1 text-[11px] font-semibold text-white shadow-md shadow-[#08afd5]/20 sm:text-xs">
                      {getCampaignModelLabel(campaign.campaignModel)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body — dar kolon, kaydırılabilir */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4 [scrollbar-gutter:stable]">
            <DialogHeader className="sr-only">
              <span>Kampanya detayı</span>
            </DialogHeader>

            {(campaign.campaignDescription || campaign.productDescription || campaign.productInfo) && (
              <p className="mb-3 line-clamp-4 text-sm leading-relaxed text-white/80">
                {campaign.campaignDescription || campaign.productDescription || campaign.productInfo}
              </p>
            )}

            <div className="space-y-2 sm:space-y-2.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InfoRow icon={<Banknote size={16} />} label="Bütçe (önerilen)">
                  {formatMoney(budget)}
                </InfoRow>
                <InfoRow icon={<Calendar size={16} />} label="Paylaşım penceresi">
                  <span className="line-clamp-2">
                    {formatDate(campaign.publishWindow?.start || campaign.duration?.start)} —{' '}
                    {formatDate(campaign.publishWindow?.end || campaign.duration?.end)}
                  </span>
                </InfoRow>
              </div>

              {campaign.applicationDeadline && (
                <InfoRow icon={<Clock size={16} />} label="Son başvuru">
                  {formatDate(campaign.applicationDeadline)}
                </InfoRow>
              )}

              {campaign.campaignGoal && (
                <InfoRow icon={<Target size={16} />} label="Kampanya hedefi">
                  {formatCampaignGoalLabel(campaign.campaignGoal)}
                </InfoRow>
              )}

              {hasContentLines(campaign) && lines.length > 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 backdrop-blur-md">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">İçerik talepleri</p>
                  <ul className="mt-2 space-y-2">
                    {lines.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-2.5 py-2 text-sm"
                      >
                        {row.kind === 'ugc' ? (
                          <>
                            <Tags size={14} className="shrink-0 text-[#6edff3]" />
                            <span>
                              <span className="text-white/90">{row.aspectRatio}</span>
                              <span className="text-white/40"> · </span>
                              <span className="text-white/80">{formatDurationShort(row.durationSec)}</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <RegistrationPlatformIcon
                              platformId={resolveRegistrationPlatformId(row.platform)}
                              size={16}
                              className="shrink-0"
                            />
                            <span>
                              {row.platform} — {row.contentFormat}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <InfoRow icon={<Tags size={16} />} label="Platform & format">
                  {formatContentLinesSummary(campaign) ||
                    (campaign.platforms || []).join(', ') ||
                    '—'}
                  {(campaign.contentFormats || []).length > 0 && (
                    <span className="mt-1 block text-white/60 text-xs">
                      Format: {(campaign.contentFormats || []).join(', ')}
                    </span>
                  )}
                </InfoRow>
              )}

              <InfoRow icon={<Users size={16} />} label="İlgi alanları / niş">
                {getArrayValue(campaign.targetAudience?.interests).length > 0
                  ? getArrayValue(campaign.targetAudience?.interests).join(', ')
                  : '—'}
              </InfoRow>

              <InfoRow icon={<MapPin size={16} />} label="Lokasyon">
                {formatLocationDisplay(campaign)}
              </InfoRow>

              {campaign.contentDetails && (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 backdrop-blur-md">
                  <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-white/50">
                    <FileText size={12} className="opacity-70" />
                    Marka beklentisi
                  </p>
                  <p className="mt-1.5 max-h-40 overflow-y-auto text-sm leading-relaxed text-white/85 whitespace-pre-wrap sm:max-h-48">
                    {campaign.contentDetails}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-end">
              {existingOffer && (
                <Badge
                  className="w-full justify-center border-0 bg-amber-500/20 py-1.5 text-amber-200 sm:mr-auto sm:w-auto"
                  variant="secondary"
                >
                  Bu kampanyaya zaten teklif verdin
                </Badge>
              )}
              {brandDirectOffer && !existingOffer && (
                <Badge
                  className="w-full justify-center border-0 bg-sky-500/20 py-1.5 text-sky-100 sm:mr-auto sm:w-auto"
                  variant="secondary"
                >
                  Bu kampanya için markadan teklifin var — Teklifler menüsünden yanıt ver
                </Badge>
              )}
              <Button
                type="button"
                onClick={() => {
                  onOfferClick(campaign);
                  onOpenChange(false);
                }}
                disabled={!canOffer}
                className={cn(
                  'h-11 w-full rounded-xl text-base font-semibold shadow-lg transition sm:min-w-[240px] sm:w-auto',
                  canOffer
                    ? 'bg-[#08afd5] text-white shadow-[#08afd5]/25 hover:bg-[#0799bc]'
                    : 'cursor-not-allowed bg-white/10 text-white/50 hover:bg-white/10'
                )}
              >
                <Sparkles size={16} className="mr-2 inline opacity-90" />
                {offerLabel}
              </Button>
            </div>
            {!canInfluencerSubmitOfferOnCampaign(campaign) && hasInfluencerId && canOperate && (
              <p className="mt-2 text-center text-xs text-white/45">
                Son başvuru tarihi geçtiği için yeni teklif kabul edilmiyor.
              </p>
            )}
            {brandDirectOffer && !existingOffer && hasInfluencerId && canOperate && (
              <p className="mt-2 text-center text-xs text-white/45">
                Marka sana özel teklif gönderdiği için buradan katılım teklifi gönderemezsin.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
