import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X, CheckCircle2, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { approveCollaborationRawContent, approveContent, markOfferContentPreviewConsumed } from '@/services/firebaseOfferService';
import { database } from '@/config/firebase';
import { get, ref } from 'firebase/database';
import { isBrandContentPreviewConsumed } from '@/lib/offerRevisionState';
import type { FirebaseOffer } from '@/services/firebaseOfferService';
import { cn } from '@/lib/utils';
import type { OfferContentMediaItem } from '@/lib/offerContentCompleteness';

/** Marka onay öncesi: ortada yarı saydam INFUHUB filigranı (kayıt/çalma caydırıcı) */
function InfuhubPreviewWatermark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-[15] flex items-center justify-center select-none',
        className
      )}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-1.5 sm:gap-2 opacity-[0.48] sm:opacity-[0.52]">
        <img
          src="/pics/infulogo.png"
          alt=""
          className="h-9 w-auto sm:h-11 max-w-[min(42vw,200px)] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
          draggable={false}
        />
        <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.4em] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]">
          INFUHUB
        </span>
      </div>
    </div>
  );
}

function BrandBlurNoticeCard({ videoCopy }: { videoCopy?: boolean }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto max-w-md w-full rounded-2xl border border-white/15 bg-slate-950/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-200">
          <AlertCircle className="h-6 w-6" />
        </div>
        <p className="text-white font-semibold text-base">Önizleme hakkınız doldu</p>
        <p className="text-sm text-slate-400 leading-relaxed">
          {videoCopy
            ? 'Video burada bilinçli olarak bulanık gösteriliyor; dilerseniz doğrudan onaylayabilirsiniz. Revizyon gerekiyorsa kampanya ekranında Revizyon İste seçeneğini kullanın.'
            : 'Tam netlik için influencer yeni yükleme yapana kadar bekleyebilirsiniz. Yine de bu teslimi şimdi onaylayabilirsiniz.'}
        </p>
      </div>
    </div>
  );
}

interface ContentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentUrl: string;
  /** Kampanyada birden fazla içerik yüklüyse sırayla önizlemek için */
  mediaItems?: OfferContentMediaItem[];
  offerId?: string;
  influencerId?: string;
  brandId?: string;
  isBrandPanel?: boolean;
  contentApproved?: boolean;
  previewUnlocked?: boolean;
  canApproveContent?: boolean;
  approvalMode?: 'final' | 'collaboration_raw';
  onContentApproved?: () => void;
  canOperate?: boolean;
}

export function ContentViewerModal({
  isOpen,
  onClose,
  contentUrl,
  mediaItems,
  influencerId: _influencerId,
  brandId: _brandId,
  isBrandPanel = false,
  contentApproved = false,
  previewUnlocked = false,
  canApproveContent = true,
  approvalMode = 'final',
  onContentApproved,
  canOperate = true,
  offerId,
}: ContentViewerModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState<'image' | 'video' | 'unknown'>('unknown');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [previewBlocked, setPreviewBlocked] = useState(false);
  const [previewCheckLoading, setPreviewCheckLoading] = useState(false);
  const didApproveRef = useRef(false);
  const previewBlockedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const mediaSlots = useMemo((): OfferContentMediaItem[] => {
    if (mediaItems && mediaItems.length > 0) return mediaItems;
    const t = contentUrl?.trim();
    return t ? [{ url: t, label: 'İçerik' }] : [];
  }, [mediaItems, contentUrl]);

  const mediaKey = useMemo(() => mediaSlots.map((m) => m.url).join('|'), [mediaSlots]);

  const [mediaIndex, setMediaIndex] = useState(0);

  useEffect(() => {
    setMediaIndex(0);
  }, [isOpen, mediaKey]);

  const activeSlot = mediaSlots[Math.min(mediaIndex, Math.max(0, mediaSlots.length - 1))];
  const activeUrl = activeSlot?.url ?? '';
  const showSlotPicker = mediaSlots.length > 1;
  const shareLinks = useMemo(
    () =>
      mediaSlots
        .map((slot) => ({ label: slot.label, url: slot.shareLink?.trim() || '' }))
        .filter((slot) => slot.url.length > 0),
    [mediaSlots]
  );

  useEffect(() => {
    previewBlockedRef.current = previewBlocked;
  }, [previewBlocked]);

  useEffect(() => {
    if (!isOpen || !activeUrl) {
      setImageError(false);
      setVideoError(false);
      return;
    }

    const urlLower = activeUrl.toLowerCase();

    let fileName = '';
    try {
      const urlObj = new URL(activeUrl);
      const pathParts = urlObj.pathname.split('/');
      fileName = decodeURIComponent(pathParts[pathParts.length - 1] || '');
    } catch {
      fileName = activeUrl;
    }

    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
    const videoExtensions = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i;

    setImageError(false);
    setVideoError(false);

    if (imageExtensions.test(fileName) || imageExtensions.test(urlLower)) {
      setContentType('image');
    } else if (videoExtensions.test(fileName) || videoExtensions.test(urlLower)) {
      setContentType('video');
    } else {
      setContentType('image');
    }
  }, [isOpen, activeUrl]);

  useEffect(() => {
    let alive = true;
    if (!isOpen || !isBrandPanel || !offerId || contentApproved || previewUnlocked) {
      setPreviewBlocked(false);
      setPreviewCheckLoading(false);
      return;
    }
    setPreviewCheckLoading(true);
    (async () => {
      try {
        const snap = await get(ref(database, `offers/${offerId}`));
        if (!alive) return;
        if (!snap.exists()) {
          setPreviewBlocked(true);
          return;
        }
        const o = snap.val() as FirebaseOffer;
        setPreviewBlocked(isBrandContentPreviewConsumed(o));
      } catch {
        if (alive) setPreviewBlocked(false);
      } finally {
        if (alive) setPreviewCheckLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isOpen, isBrandPanel, offerId, contentApproved, previewUnlocked, activeUrl]);

  const consumptionBlocked = isBrandPanel && previewBlocked && !contentApproved && !previewUnlocked;
  const brandPendingControls = isBrandPanel && !contentApproved && !previewUnlocked;
  /** Onay beklerken görsel/video üzerinde filigran benzeri logo (önizleme bittiğinde bulanıkta kart yeterli) */
  const showPreviewWatermark =
    brandPendingControls && !consumptionBlocked && !previewCheckLoading;

  useEffect(() => {
    try {
      if (consumptionBlocked && videoRef.current) {
        videoRef.current.pause();
      }
    } catch {
      /* ignore */
    }
  }, [consumptionBlocked, activeUrl, isOpen]);

  useEffect(() => {
    if (!isOpen || !isBrandPanel) return;

    const keyBlock = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    };

    const preventContextMenu = (e: MouseEvent) => {
      if (isBrandPanel && !contentApproved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventCopy = (e: ClipboardEvent) => {
      if (isBrandPanel && !contentApproved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventDrag = (e: DragEvent) => {
      if (isBrandPanel && !contentApproved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventSelect = (e: Event) => {
      if (isBrandPanel && !contentApproved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventPrintScreen = (e: KeyboardEvent) => {
      if (isBrandPanel && !contentApproved && (e.key === 'PrintScreen' || (e.ctrlKey && e.shiftKey && e.key === 'S'))) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', keyBlock, true);
    document.addEventListener('contextmenu', preventContextMenu, true);
    document.addEventListener('copy', preventCopy, true);
    document.addEventListener('cut', preventCopy, true);
    document.addEventListener('dragstart', preventDrag, true);
    document.addEventListener('selectstart', preventSelect, true);
    document.addEventListener('keydown', preventPrintScreen, true);

    return () => {
      document.removeEventListener('keydown', keyBlock, true);
      document.removeEventListener('contextmenu', preventContextMenu, true);
      document.removeEventListener('copy', preventCopy, true);
      document.removeEventListener('cut', preventCopy, true);
      document.removeEventListener('dragstart', preventDrag, true);
      document.removeEventListener('selectstart', preventSelect, true);
      document.removeEventListener('keydown', preventPrintScreen, true);
    };
  }, [isOpen, isBrandPanel, contentApproved, previewUnlocked]);

  const finishCloseWithPreviewRule = useCallback(() => {
    if (didApproveRef.current) {
      didApproveRef.current = false;
      return;
    }
    if (isBrandPanel && offerId && !contentApproved && !previewUnlocked && !previewBlockedRef.current) {
      void markOfferContentPreviewConsumed(offerId);
    }
    onClose();
  }, [isBrandPanel, offerId, contentApproved, previewUnlocked, onClose]);

  const handleDownload = async () => {
    if (!activeUrl || (isBrandPanel && !contentApproved)) {
      toast({
        title: 'İndirme Engellendi',
        description: 'İçeriği indirmek için önce onaylamanız gerekiyor.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const link = document.createElement('a');
      link.href = activeUrl;
      link.download = `content-${offerId || 'download'}${showSlotPicker ? `-${mediaIndex + 1}` : ''}.${
        contentType === 'image' ? 'png' : 'mp4'
      }`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      try {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.open(activeUrl, '_blank');
        toast({
          title: 'Bilgi',
          description: 'İçerik yeni sekmede açıldı. Tarayıcınızdan indirebilirsiniz.',
        });
      }
    } catch {
      window.open(activeUrl, '_blank');
      toast({
        title: 'Bilgi',
        description: 'İçerik yeni sekmede açıldı. Tarayıcınızdan indirebilirsiniz.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveContent = async () => {
    if (!offerId || !canOperate || isProcessing) return;

    try {
      setIsProcessing(true);
      if (approvalMode === 'collaboration_raw') {
        await approveCollaborationRawContent(offerId);
      } else {
        await approveContent(offerId);
      }
      didApproveRef.current = true;
      toast({
        title: 'Başarılı',
        description:
          approvalMode === 'collaboration_raw'
            ? 'Ham içerik onaylandı. Influencer artık paylaşım linkini ekleyebilir.'
            : 'İçerik onaylandı; escrow serbest kaldı. Influencer çekilebilir kazanç özetinde bu tutarı görebilir.',
      });
      onContentApproved?.();
      onClose();
    } catch (error: unknown) {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'İçerik onaylanırken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const showApproveButton = isBrandPanel && !contentApproved && canOperate && canApproveContent && !previewCheckLoading;

  if (!activeUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && finishCloseWithPreviewRule()}>
      <DialogContent
        hideClose
        className={cn(
          'gap-0 p-0 overflow-hidden flex flex-col rounded-2xl',
          'max-w-[min(96vw,1180px)] w-[calc(100%-20px)] md:w-full',
          'h-[min(90vh,920px)] max-h-[92vh]',
          'border border-white/12 bg-slate-950/90 backdrop-blur-2xl shadow-2xl shadow-black/60',
          'ring-1 ring-white/10'
        )}
      >
        <DialogHeader
          className={cn(
            'px-5 sm:px-6 py-4 shrink-0 relative z-20 border-b border-white/10',
            'bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-slate-950/90'
          )}
        >
          <div className="flex items-start justify-between gap-4 pr-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-[#7ce7ff]/90">
                <Sparkles className="h-4 w-4 shrink-0 opacity-90" />
                <span className="text-[10px] uppercase tracking-[0.22em] font-medium">Önizleme</span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white pr-2">
                İçerik görüntüle
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isBrandPanel && !contentApproved
                  ? 'İçeriği görüntüleyebilir ve onaylayabilirsiniz.'
                  : 'İçeriği görüntüleyebilirsiniz.'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isBrandPanel &&
                (contentApproved ? (
                  <Badge className="border-0 bg-emerald-500/20 text-emerald-200 flex items-center gap-1.5 px-2.5 py-1">
                    <CheckCircle2 size={14} />
                    Onaylandı
                  </Badge>
                ) : (
                  <Badge className="border-0 bg-amber-500/15 text-amber-200 flex items-center gap-1.5 px-2.5 py-1">
                    <AlertCircle size={14} />
                    Beklemede
                  </Badge>
                ))}
              <button
                type="button"
                onClick={finishCloseWithPreviewRule}
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-full',
                  'text-white/90 hover:text-white hover:bg-white/10',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5]/70'
                )}
                aria-label="Kapat"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </DialogHeader>

        {showSlotPicker && (
          <div className="px-4 sm:px-6 shrink-0 border-b border-white/10 bg-slate-950/50 py-3">
            <p className="text-[11px] text-slate-400 mb-2">
              Bu teslimde birden fazla dosya yüklü; aşağıdan seçerek önizleyebilirsiniz.
            </p>
            <div className="flex flex-wrap gap-2">
              {mediaSlots.map((slot, idx) => (
                <button
                  key={`${slot.url}-${idx}`}
                  type="button"
                  onClick={() => setMediaIndex(idx)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors border max-w-full text-left',
                    idx === mediaIndex
                      ? 'bg-[#08afd5]/25 text-white border-[#08afd5]/55'
                      : 'bg-white/5 text-slate-300 border-white/12 hover:bg-white/10'
                  )}
                  title={slot.label}
                >
                  <span className="tabular-nums text-slate-500 mr-1.5">{idx + 1}.</span>
                  <span className="truncate max-w-[200px] sm:max-w-[300px] align-bottom inline">{slot.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {shareLinks.length > 0 && (
          <div className="px-4 sm:px-6 shrink-0 border-b border-white/10 bg-slate-950/65 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">Paylaşım linkleri</p>
            <div className="flex flex-wrap gap-2">
              {shareLinks.map((link, idx) => (
                <a
                  key={`${link.url}-${idx}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex max-w-full items-center gap-2 rounded-full border border-[#08afd5]/35',
                    'bg-[#08afd5]/12 px-3 py-1.5 text-xs font-medium text-[#a9f2ff]',
                    'hover:bg-[#08afd5]/20 hover:text-white transition-colors'
                  )}
                  title={link.url}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[220px] sm:max-w-[360px]">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden relative px-4 sm:px-6 py-5 flex items-center justify-center bg-gradient-to-b from-slate-900/55 to-black/65">
          {previewCheckLoading ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="h-9 w-9 rounded-full border-2 border-[#08afd5]/35 border-t-[#08afd5] animate-spin" />
              <p className="text-sm">Yükleniyor...</p>
            </div>
          ) : contentType === 'image' && !imageError ? (
            <div
              className={cn(
                'relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl',
                'ring-1 ring-white/12 bg-black/35'
              )}
            >
              <img
                src={activeUrl}
                alt=""
                className={cn(
                  'max-w-full max-h-[min(58vh,640px)] object-contain rounded-xl transition-all duration-300',
                  consumptionBlocked && 'blur-2xl opacity-[0.72] pointer-events-none select-none'
                )}
                onContextMenu={(e) => {
                  if (brandPendingControls && !consumptionBlocked) e.preventDefault();
                }}
                onDragStart={(e) => {
                  if (brandPendingControls && !consumptionBlocked) e.preventDefault();
                }}
                draggable={!(brandPendingControls && !consumptionBlocked)}
                onError={() => {
                  setImageError(true);
                  setContentType('unknown');
                }}
              />
              {showPreviewWatermark && <InfuhubPreviewWatermark />}
              {consumptionBlocked && <BrandBlurNoticeCard />}
            </div>
          ) : contentType === 'video' && !videoError ? (
            <div
              className={cn(
                'relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl',
                'ring-1 ring-white/12 bg-black/35'
              )}
            >
              <video
                key={activeUrl}
                ref={videoRef}
                src={activeUrl}
                controls
                playsInline
                preload="metadata"
                loop={brandPendingControls && !consumptionBlocked}
                disablePictureInPicture={brandPendingControls && !contentApproved}
                controlsList={brandPendingControls && !contentApproved ? 'nodownload noremoteplayback' : undefined}
                className={cn(
                  'max-w-full max-h-[min(58vh,640px)] rounded-xl transition-all duration-300',
                  '[&::-webkit-media-controls-panel]:bg-black/85',
                  consumptionBlocked && 'blur-2xl opacity-[0.72] pointer-events-none select-none'
                )}
                onContextMenu={(e) => {
                  if (brandPendingControls && !consumptionBlocked) e.preventDefault();
                }}
                onDragStart={(e) => {
                  if (brandPendingControls && !consumptionBlocked) e.preventDefault();
                }}
                onError={() => {
                  setVideoError(true);
                  setContentType('unknown');
                }}
              />
              {showPreviewWatermark && <InfuhubPreviewWatermark />}
              {consumptionBlocked && <BrandBlurNoticeCard videoCopy />}
            </div>
          ) : (
            <div className="text-center p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md max-w-md">
              <p className="text-slate-300 mb-2">İçerik görüntülenemiyor</p>
              <p className="text-sm text-slate-500">Lütfen daha sonra tekrar deneyin.</p>
            </div>
          )}
        </div>

        <div
          className={cn(
            'px-4 sm:px-6 py-4 shrink-0 flex flex-wrap items-center justify-between gap-3',
            'border-t border-white/10 bg-slate-950/85 backdrop-blur-md'
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {showApproveButton && (
              <Button
                onClick={handleApproveContent}
                disabled={isProcessing}
                className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 px-5"
              >
                <CheckCircle2 size={17} className="mr-2" />
                {isProcessing
                  ? 'Onaylanıyor...'
                  : approvalMode === 'collaboration_raw'
                    ? 'Ham İçeriği Onayla'
                    : 'Onayla'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isBrandPanel && contentApproved && (
              <Button
                onClick={handleDownload}
                disabled={loading}
                variant="outline"
                className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <Download size={17} className="mr-2" />
                {loading ? 'İndiriliyor...' : 'İndir'}
              </Button>
            )}
            {!isBrandPanel && (
              <Button onClick={handleDownload} disabled={loading} variant="outline">
                <Download size={17} className="mr-2" />
                {loading ? 'İndiriliyor...' : 'İndir'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
