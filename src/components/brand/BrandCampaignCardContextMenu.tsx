import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  Eye,
  Copy,
  BookmarkPlus,
  Loader2,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FirebaseCampaign } from '@/services/firebaseCampaignService';
import { deleteBrandCampaignPermanentlyIfAllowed } from '@/services/firebaseCampaignService';
import { campaignHasAnyAcceptedOffer } from '@/services/firebaseOfferService';
import { useToast } from '@/hooks/use-toast';

type BrandCampaignCardContextMenuProps = {
  open: boolean;
  clientX: number;
  clientY: number;
  campaign: FirebaseCampaign | null;
  brandId: string;
  canOperate: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onViewDetails?: () => void;
  /** Kabul edilmiş teklif yokken; üst bileşen kampanya oluşturma modalını doldurur */
  onEdit?: () => void;
};

export function BrandCampaignCardContextMenu({
  open,
  clientX,
  clientY,
  campaign,
  brandId,
  canOperate,
  onClose,
  onDeleted,
  onViewDetails,
  onEdit,
}: BrandCampaignCardContextMenuProps) {
  const { toast } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: clientX, y: clientY });
  const [checking, setChecking] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPosition({ x: clientX, y: clientY });
  }, [open, clientX, clientY]);

  useEffect(() => {
    if (!open || !campaign) {
      setChecking(false);
      setCanDelete(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    campaignHasAnyAcceptedOffer(brandId, campaign.id).then((has) => {
      if (!cancelled) {
        setCanDelete(!has);
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, campaign, brandId]);

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const r = el.getBoundingClientRect();
    let x = clientX;
    let y = clientY;
    if (x + r.width > window.innerWidth - 12) x = window.innerWidth - r.width - 12;
    if (y + r.height > window.innerHeight - 12) y = window.innerHeight - r.height - 12;
    x = Math.max(12, x);
    y = Math.max(12, y);
    setPosition({ x, y });
  }, [open, clientX, clientY, checking, canDelete]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [open, onClose]);

  if (!open || !campaign) return null;

  const deleteEnabled = canOperate && !checking && canDelete && !deleting;
  const editEnabled = Boolean(onEdit) && canOperate && !checking && canDelete;
  const viewEnabled = Boolean(onViewDetails) && canOperate;

  const handleDelete = async () => {
    if (!deleteEnabled) return;
    setDeleting(true);
    try {
      await deleteBrandCampaignPermanentlyIfAllowed(brandId, campaign.id);
      toast({ title: 'Kampanya silindi' });
      onDeleted();
      onClose();
    } catch (e) {
      console.error(e);
      toast({
        title: 'Silinemedi',
        description: e instanceof Error ? e.message : 'Bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const menu = (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Kampanya işlemleri"
      className={cn(
        'fixed z-[300] min-w-[220px] overflow-hidden rounded-[14px] py-1.5',
        'border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.45)]',
        'backdrop-blur-xl backdrop-saturate-[1.35]',
        'bg-[rgba(15,23,42,0.52)] dark:bg-[rgba(8,12,22,0.58)]',
        'ring-1 ring-white/[0.06]'
      )}
      style={{ left: position.x, top: position.y }}
    >
      <button
        type="button"
        role="menuitem"
        disabled={!deleteEnabled}
        onClick={handleDelete}
        className={cn(
          'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
          deleteEnabled
            ? 'text-white hover:bg-white/[0.08] cursor-pointer'
            : 'cursor-not-allowed text-white/35'
        )}
      >
        {deleting ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-red-400" aria-hidden />
        ) : (
          <Trash2
            className={cn('h-4 w-4 shrink-0', deleteEnabled ? 'text-red-500' : 'text-red-500/40')}
            aria-hidden
          />
        )}
        <span className="font-medium">Sil</span>
        {checking ? (
          <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-white/50" aria-hidden />
        ) : null}
      </button>
      {!checking && !canDelete && canOperate ? (
        <p className="mx-2 mb-1 rounded-lg bg-red-500/10 px-2 py-1.5 text-[11px] leading-snug text-red-200/90">
          Kabul edilmiş influencer anlaşması varken kampanya silinemez veya düzenlenemez.
        </p>
      ) : null}

      <div className="my-1 h-px bg-white/[0.08]" role="separator" />

      {onEdit ? (
        <button
          type="button"
          role="menuitem"
          disabled={!editEnabled}
          onClick={() => {
            if (!editEnabled) return;
            onEdit();
          }}
          className={cn(
            'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
            editEnabled
              ? 'cursor-pointer text-white hover:bg-white/[0.08]'
              : 'cursor-not-allowed text-white/35'
          )}
        >
          <Pencil
            className={cn('h-4 w-4 shrink-0', editEnabled ? 'text-[#6edff3]' : 'text-white/30')}
            aria-hidden
          />
          <span className="font-medium">Düzenle</span>
        </button>
      ) : null}

      <button
        type="button"
        role="menuitem"
        disabled={!viewEnabled}
        onClick={() => {
          if (!viewEnabled) return;
          onViewDetails?.();
        }}
        className={cn(
          'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
          viewEnabled
            ? 'cursor-pointer text-white hover:bg-white/[0.08]'
            : 'cursor-not-allowed text-white/35'
        )}
      >
        <Eye className={cn('h-4 w-4 shrink-0', viewEnabled ? 'text-white/85' : 'text-white/30')} aria-hidden />
        <span className="font-medium">Detay görüntüle</span>
      </button>
      <button
        type="button"
        role="menuitem"
        disabled
        className="flex w-full cursor-not-allowed items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/35"
      >
        <Copy className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
        <span>Tekrarla</span>
      </button>
      <button
        type="button"
        role="menuitem"
        disabled
        className="flex w-full cursor-not-allowed items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/35"
      >
        <BookmarkPlus className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
        <span>Şablon olarak kaydet</span>
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}
