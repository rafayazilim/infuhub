import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarClock,
  Download,
  GanttChart,
  Loader2,
  Package,
  Radio,
  RefreshCw,
  Search,
  Eye,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  loadAdminSystemActivity,
  type AdminActivityEvent,
  type AdminActivityEventKind,
  type AdminActivityPerspective,
  type AdminRegistrationSnapshotRow,
} from '@/services/firebaseAdminSystemActivityService';
import { ContentViewerModal } from '@/components/shared/ContentViewerModal';
import type { OfferContentMediaItem } from '@/lib/offerContentCompleteness';
import type { FirebaseOffer } from '@/services/firebaseOfferService';

const KIND_LABELS: Record<AdminActivityEventKind, string> = {
  brand_registered: 'Marka kaydı',
  influencer_registered: 'Influencer kaydı',
  campaign_created: 'Kampanya oluşturuldu',
  campaign_updated: 'Kampanya güncellendi',
  offer_created: 'Teklif (oluşum)',
  offer_responded: 'Teklif yanıtı',
  negotiation_step: 'Pazarlık adımı',
  content_uploaded: 'İçerik yüklendi',
  content_link_set: 'İçerik linki',
  content_share_link_set: 'Paylaşım linki',
  content_media_approved: 'Ham içerik onayı',
  content_approved: 'İçerik onayı',
  content_revision_requested: 'Revizyon istendi',
  content_rejected: 'İçerik ret / revizyon',
  wallet_topup: 'Cüzdan yükleme',
  wallet_payment: 'Cüzdan ödemesi',
  wallet_adjustment: 'Cüzdan düzeltme',
  pending_wallet_debit_created: 'Bekleyen kesinti',
};

const PERSP_LABEL: Record<AdminActivityPerspective, string> = {
  brand: 'Marka',
  influencer: 'Influencer',
  system: 'Sistem',
};

function formatTr(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function withinDays(iso: string, days: number) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  const cut = Date.now() - days * 864e5;
  return t >= cut;
}

function badgeClass(kind: AdminActivityEventKind): string {
  if (kind === 'brand_registered' || kind === 'influencer_registered') {
    return 'bg-emerald-100 text-emerald-900';
  }
  if (kind.startsWith('wallet') || kind === 'pending_wallet_debit_created') {
    return 'bg-amber-100 text-amber-900';
  }
  if (kind.startsWith('campaign')) return 'bg-sky-100 text-sky-900';
  if (kind === 'content_approved' || kind === 'content_media_approved') return 'bg-emerald-100 text-emerald-900';
  if (kind === 'content_rejected' || kind === 'content_revision_requested' || kind === 'offer_responded') return 'bg-rose-100 text-rose-900';
  if (kind === 'content_link_set' || kind === 'content_uploaded' || kind === 'content_share_link_set') return 'bg-violet-100 text-violet-900';
  if (kind === 'negotiation_step') return 'bg-indigo-100 text-indigo-900';
  if (kind === 'offer_created') return 'bg-cyan-100 text-cyan-900';
  return 'bg-slate-100 text-slate-800';
}

function monthBoundary(value: string, boundary: 'start' | 'end'): number | null {
  if (!value) return null;
  const [year, month] = value.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month) return null;
  const d =
    boundary === 'start'
      ? new Date(year, month - 1, 1, 0, 0, 0, 0)
      : new Date(year, month, 0, 23, 59, 59, 999);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function eventWithinMonthRange(eventAt: string, fromMonth: string, toMonth: string): boolean {
  const from = monthBoundary(fromMonth, 'start');
  const to = monthBoundary(toMonth, 'end');
  if (from === null && to === null) return true;
  const t = new Date(eventAt).getTime();
  if (!Number.isFinite(t)) return false;
  if (from !== null && t < from) return false;
  if (to !== null && t > to) return false;
  return true;
}

function dayBoundary(value: string, boundary: 'start' | 'end'): number | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return null;
  const d =
    boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function eventWithinSingleDay(eventAt: string, dayValue: string): boolean {
  if (!dayValue) return true;
  const from = dayBoundary(dayValue, 'start');
  const to = dayBoundary(dayValue, 'end');
  const t = new Date(eventAt).getTime();
  if (!Number.isFinite(t) || from === null || to === null) return false;
  return t >= from && t <= to;
}

function offerKindLabel(kind?: string): string {
  switch (kind) {
    case 'incoming_campaign':
      return 'Kampanyaya katılım';
    case 'direct':
      return 'Doğrudan teklif';
    case 'counter_offer':
      return 'Karşı teklif';
    default:
      return 'Teklif';
  }
}

function excelCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadEventsAsExcel(events: AdminActivityEvent[], fileName: string) {
  const headers = [
    'Tarih',
    'Taraf',
    'Olay',
    'Marka',
    'Influencer',
	    'Kampanya',
	    'Teklif ID',
	    'Tutar',
    'Açıklama',
  ];

  const rows = events.map((e) => [
    formatTr(e.at),
    PERSP_LABEL[e.perspective] || e.perspective,
    KIND_LABELS[e.kind] || e.kind,
    e.brandName,
    e.influencerName,
	    e.campaignTitle,
	    e.offerId || '',
	    e.priceTry != null ? e.priceTry : '',
    e.description,
  ]);

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #e8f7fb; font-weight: 700; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; mso-number-format: "\\@"; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headers.map((h) => `<th>${excelCell(h)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows
        .map((row) => `<tr>${row.map((cell) => `<td>${excelCell(cell)}</td>`).join('')}</tr>`)
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadRegistrationsAsExcel(rows: AdminRegistrationSnapshotRow[], fileName: string) {
  const headers = [
    'Kayıt tarihi',
    'Hesap türü',
    'Marka / Influencer adı',
    'E-posta',
    'Mail doğrulama durumu',
    'Kayıt kaynağı',
    'Profil durumu',
    'Eklenen hesaplar',
    'UID',
  ];
  const body = rows.map((row) => [
    formatTr(row.createdAt),
    row.accountType === 'brand' ? 'Marka' : 'Influencer',
    row.displayName,
    row.email,
    row.emailVerified ? 'Mail doğrulandı' : 'Mail doğrulama bekliyor',
    row.source === 'main' ? 'Ana kayıt' : 'Geçici kayıt',
    row.status || '—',
    row.platformSummary || '—',
    row.uid,
  ]);

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #e8f7fb; font-weight: 700; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; mso-number-format: "\\@"; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headers.map((h) => `<th>${excelCell(h)}</th>`).join('')}</tr></thead>
    <tbody>
      ${body.map((row) => `<tr>${row.map((cell) => `<td>${excelCell(cell)}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function listOfferMediaItemsForAdmin(o: FirebaseOffer): OfferContentMediaItem[] {
  const rows =
    o.contentDeliveries && typeof o.contentDeliveries === 'object'
      ? Object.entries(o.contentDeliveries)
      : [];
  if (rows.length > 0) {
    return rows
      .map(([lineId, row], index) => {
        const url = typeof row?.contentUrl === 'string' ? row.contentUrl.trim() : '';
        if (!url) return null;
        const shareLink = typeof row?.shareLink === 'string' ? row.shareLink.trim() : '';
        return {
          url,
          label: `Teslim ${index + 1} (${lineId})`,
          ...(shareLink ? { shareLink } : {}),
        } satisfies OfferContentMediaItem;
      })
      .filter((row): row is OfferContentMediaItem => Boolean(row));
  }
  const direct = typeof o.contentLink === 'string' ? o.contentLink.trim() : '';
  return direct ? [{ url: direct, label: 'İçerik' }] : [];
}

export function AdminSystemActivityPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadAdminSystemActivity>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [perspective, setPerspective] = useState<'all' | AdminActivityPerspective>('all');
  const [kind, setKind] = useState<'all' | AdminActivityEventKind>('all');
  const [datePreset, setDatePreset] = useState<'7' | '30' | '90' | 'all'>('30');
  const [mainTab, setMainTab] = useState('timeline');
	  const [exportFromMonth, setExportFromMonth] = useState('');
	  const [exportToMonth, setExportToMonth] = useState('');
	  const [exportSingleDay, setExportSingleDay] = useState('');
	  const [exportPerspective, setExportPerspective] = useState<'all' | 'brand' | 'influencer'>('all');
	  const [exportContent, setExportContent] = useState<'all' | 'registrations'>('all');
  const [contentPreview, setContentPreview] = useState<{
    open: boolean;
    contentUrl: string;
    mediaItems: OfferContentMediaItem[];
    offerId?: string;
  }>({ open: false, contentUrl: '', mediaItems: [] });

  const openContentPreview = (mediaItems: OfferContentMediaItem[], offerId?: string, contentUrl?: string) => {
    const firstUrl = contentUrl?.trim() || mediaItems[0]?.url || '';
    if (!firstUrl) return;
    setContentPreview({
      open: true,
      contentUrl: firstUrl,
      mediaItems: mediaItems.length > 0 ? mediaItems : [{ url: firstUrl, label: 'İçerik' }],
      offerId,
    });
  };

  const runLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await loadAdminSystemActivity();
      setData(snap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runLoad();
  }, [runLoad]);

  const q = search.trim().toLowerCase();

  const textMatches = (s: string | undefined, needle: string) => {
    if (!needle) return true;
    return Boolean(s && s.toLowerCase().includes(needle));
  };

  const filteredEvents = useMemo(() => {
    if (!data) return [];
    return data.events.filter((e) => {
      if (perspective !== 'all' && e.perspective !== perspective) return false;
      if (kind !== 'all' && e.kind !== kind) return false;
      if (datePreset !== 'all') {
        const days = datePreset === '7' ? 7 : datePreset === '30' ? 30 : 90;
        if (!withinDays(e.at, days)) return false;
      }
      if (!q) return true;
      return (
        textMatches(e.title, q) ||
        textMatches(e.description, q) ||
        textMatches(e.brandName, q) ||
        textMatches(e.influencerName, q) ||
        textMatches(e.campaignTitle, q) ||
        textMatches(e.campaignId, q) ||
        textMatches(e.offerId, q) ||
        textMatches(e.brandId, q) ||
        textMatches(e.influencerId, q)
      );
    });
  }, [data, perspective, kind, datePreset, q]);

	  const exportEvents = useMemo(() => {
	    if (!data) return [];
	    return data.events.filter((e) => {
	      if (exportPerspective !== 'all' && e.perspective !== exportPerspective) return false;
	      if (exportSingleDay) return eventWithinSingleDay(e.at, exportSingleDay);
	      return eventWithinMonthRange(e.at, exportFromMonth, exportToMonth);
	    });
	  }, [data, exportPerspective, exportSingleDay, exportFromMonth, exportToMonth]);

	  const exportRegistrations = useMemo(() => {
	    if (!data) return [];
	    return data.registrations.filter((row) => {
	      if (exportPerspective !== 'all' && row.accountType !== exportPerspective) return false;
	      if (exportSingleDay) return eventWithinSingleDay(row.createdAt, exportSingleDay);
	      return eventWithinMonthRange(row.createdAt, exportFromMonth, exportToMonth);
	    });
	  }, [data, exportPerspective, exportSingleDay, exportFromMonth, exportToMonth]);

	  const exportCount = exportContent === 'registrations' ? exportRegistrations.length : exportEvents.length;

  const handleExcelExport = () => {
	    if (exportCount === 0) return;
    const scope =
      exportPerspective === 'brand'
        ? 'marka'
	          : exportPerspective === 'influencer'
	          ? 'influencer'
	          : 'tum-hareketler';
	    const content = exportContent === 'registrations' ? 'kayitlar' : 'hareketler';
	    const range = exportSingleDay || `${exportFromMonth || 'baslangic'}_${exportToMonth || 'bugun'}`;
	    if (exportContent === 'registrations') {
	      downloadRegistrationsAsExcel(exportRegistrations, `infuhub-sistem-${content}-${scope}-${range}.xls`);
	      return;
	    }
	    downloadEventsAsExcel(exportEvents, `infuhub-sistem-${content}-${scope}-${range}.xls`);
	  };

	  const filteredCampaigns = useMemo(() => {
    if (!data) return [];
    return data.campaigns.filter((c) => {
      if (datePreset !== 'all') {
        const days = datePreset === '7' ? 7 : datePreset === '30' ? 30 : 90;
        const t = c.updatedAt || c.createdAt;
        if (t && !withinDays(t, days)) return false;
      }
      if (!q) return true;
      return (
        textMatches(c.title, q) ||
        textMatches(c.brandName, q) ||
        textMatches(c.id, q) ||
        textMatches(c.brandId, q) ||
        textMatches(c.status, q)
      );
    });
	  }, [data, datePreset, q]);

	  const filteredRegistrations = useMemo(() => {
	    if (!data) return [];
	    return data.registrations.filter((row) => {
	      if (datePreset !== 'all') {
	        const days = datePreset === '7' ? 7 : datePreset === '30' ? 30 : 90;
	        if (!withinDays(row.createdAt, days)) return false;
	      }
	      if (!q) return true;
	      return (
	        textMatches(row.uid, q) ||
	        textMatches(row.displayName, q) ||
	        textMatches(row.email, q) ||
	        textMatches(row.accountType === 'brand' ? 'Marka' : 'Influencer', q) ||
	        textMatches(row.emailVerified ? 'Mail doğrulandı' : 'Mail doğrulama bekliyor', q) ||
	        textMatches(row.source === 'main' ? 'Ana kayıt' : 'Geçici kayıt', q) ||
	        textMatches(row.status, q)
	      );
	    });
	  }, [data, datePreset, q]);

  const [offerStatusF, setOfferStatusF] = useState<'all' | 'beklemede' | 'kabul' | 'red'>('all');

	  const filteredOffers = useMemo(() => {
    if (!data) return [];
    return data.offers.filter((o) => {
      if (offerStatusF !== 'all' && o.status !== offerStatusF) return false;
      if (datePreset !== 'all') {
        const days = datePreset === '7' ? 7 : datePreset === '30' ? 30 : 90;
        if (!withinDays(o.updatedAt, days)) return false;
      }
      if (!q) return true;
      return (
        textMatches(o.id, q) ||
        textMatches(data.brandNames[o.brandId], q) ||
	        textMatches(data.influencerNames[o.influencerId], q) ||
	        textMatches(data.campaigns.find((c) => c.brandId === o.brandId && c.id === o.campaignId)?.title, q) ||
	        textMatches(o.campaignId, q) ||
	        textMatches(offerKindLabel(o.offerKind), q) ||
	        textMatches(String(o.price), q) ||
        textMatches(o.message, q) ||
        textMatches(o.status, q)
      );
    });
	  }, [data, offerStatusF, datePreset, q]);

	  const campaignTitleByOfferKey = useMemo(() => {
	    const map = new Map<string, string>();
	    for (const c of data?.campaigns || []) {
	      map.set(`${c.brandId}::${c.id}`, c.title);
	    }
	    return map;
	  }, [data]);

  const stats = data?.stats;

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-[#08afd5] mb-3" />
        <p className="text-sm">Sistem hareketleri yükleniyor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <p className="font-medium">Yükleme hatası</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          type="button"
          onClick={() => void runLoad()}
          className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm hover:bg-rose-100"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GanttChart className="h-5 w-5 text-[#08afd5]" />
            Sistem hareketleri
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Realtime Database üzerindeki kampanyalar, teklifler, pazarlık adımları, içerik teslimi ve cüzdan
            hareketlerinin denetim görünümü. İnceleme ve olası uyuşmazlıklar için kullanın.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runLoad()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            { label: 'Kampanya', value: stats.totalCampaigns, icon: BarChart3 },
            { label: 'Teklif (tümü)', value: stats.offerTotal, icon: Radio },
            { label: 'Bekleyen', value: stats.offerBeklemede, icon: Package },
            { label: 'Kabul', value: stats.offerKabul, icon: Package },
            { label: 'Red', value: stats.offerRed, icon: Package },
            { label: 'İçerik yüklendi', value: stats.contentUploaded, icon: Eye },
            { label: 'Revizyon', value: stats.revisionRequested, icon: CalendarClock },
            { label: 'İçerik onaylı', value: stats.contentApproved, icon: CalendarClock },
          ].map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.label}
                className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between text-slate-500 text-xs uppercase tracking-wide">
                  {row.label}
                  <Icon className="h-4 w-4 opacity-50" />
                </div>
                <div className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{row.value}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row flex-wrap gap-3 items-stretch xl:items-end">
          <label className="flex flex-col gap-1 min-w-[200px] flex-1">
            <span className="text-xs text-slate-500">Ara</span>
            <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="ID, isim, kampanya, tutar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </span>
          </label>
          <label className="flex flex-col gap-1 min-w-[160px]">
            <span className="text-xs text-slate-500">Olay penceresi</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as typeof datePreset)}
            >
              <option value="7">Son 7 gün</option>
              <option value="30">Son 30 gün</option>
              <option value="90">Son 90 gün</option>
              <option value="all">Tüm zamanlar</option>
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex flex-col xl:flex-row flex-wrap gap-3 xl:items-end">
	            <div className="min-w-[170px]">
	              <div className="text-xs font-medium text-slate-500 mb-1">Excel kapsamı</div>
	              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                value={exportPerspective}
                onChange={(e) => setExportPerspective(e.target.value as typeof exportPerspective)}
              >
                <option value="all">Tüm hareketler</option>
                <option value="brand">Sadece marka</option>
	                <option value="influencer">Sadece influencer</option>
	              </select>
	            </div>
	            <div className="min-w-[170px]">
	              <div className="text-xs font-medium text-slate-500 mb-1">Excel içeriği</div>
	              <select
	                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
	                value={exportContent}
	                onChange={(e) => setExportContent(e.target.value as typeof exportContent)}
	              >
	                <option value="all">Tüm hareketler</option>
	                <option value="registrations">Sadece kayıtlar</option>
	              </select>
	            </div>
	            <label className="flex flex-col gap-1 min-w-[150px]">
	              <span className="text-xs font-medium text-slate-500">Tek gün</span>
	              <input
	                type="date"
	                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[#08afd5]/35"
	                value={exportSingleDay}
	                onChange={(e) => setExportSingleDay(e.target.value)}
	              />
	            </label>
	            <label className="flex flex-col gap-1 min-w-[150px]">
	              <span className="text-xs font-medium text-slate-500">Başlangıç ayı</span>
	              <input
	                type="month"
	                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[#08afd5]/35"
	                value={exportFromMonth}
	                disabled={Boolean(exportSingleDay)}
	                onChange={(e) => setExportFromMonth(e.target.value)}
	              />
	            </label>
            <label className="flex flex-col gap-1 min-w-[150px]">
              <span className="text-xs font-medium text-slate-500">Bitiş ayı</span>
              <input
	                type="month"
	                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[#08afd5]/35"
	                value={exportToMonth}
	                disabled={Boolean(exportSingleDay)}
	                onChange={(e) => setExportToMonth(e.target.value)}
	              />
            </label>
            <button
              type="button"
	              onClick={handleExcelExport}
	              disabled={exportCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#08afd5] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0798ba] disabled:cursor-not-allowed disabled:opacity-50"
            >
	              <Download className="h-4 w-4" />
	              Excel indir
	              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{exportCount}</span>
	            </button>
	            {(exportFromMonth || exportToMonth || exportSingleDay || exportPerspective !== 'all' || exportContent !== 'all') && (
	              <button
	                type="button"
	                onClick={() => {
	                  setExportFromMonth('');
	                  setExportToMonth('');
	                  setExportSingleDay('');
	                  setExportPerspective('all');
	                  setExportContent('all');
	                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Export filtresini sıfırla
              </button>
            )}
          </div>
        </div>

	        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
	          <TabsList className="grid w-full max-w-4xl grid-cols-4 h-auto p-1 bg-slate-100/90">
            <TabsTrigger value="timeline" className="text-xs sm:text-sm">
              Zaman çizelgesi
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs sm:text-sm">
              Kampanyalar
            </TabsTrigger>
	            <TabsTrigger value="offers" className="text-xs sm:text-sm">
	              Teklifler
	            </TabsTrigger>
	            <TabsTrigger value="registrations" className="text-xs sm:text-sm">
	              Kayıtlar
	            </TabsTrigger>
	          </TabsList>

          <TabsContent value="timeline" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 w-full sm:w-auto">Taraflar</span>
              {(
                [
                  ['all', 'Tümü'],
                  ['brand', 'Marka'],
                  ['influencer', 'Influencer'],
                  ['system', 'Cüzdan / sistem'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPerspective(k === 'all' ? 'all' : k)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                    (k === 'all' && perspective === 'all') || perspective === k
                      ? 'border-[#08afd5] bg-[#08afd5]/10 text-[#0a7a94]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="text-xs text-slate-500 ml-0 sm:ml-4">Olay türü</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs min-w-[200px]"
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                <option value="all">Tüm olay türleri</option>
                {(Object.keys(KIND_LABELS) as AdminActivityEventKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400">
              Gösterilen: {filteredEvents.length} kayıt
              {filteredEvents.length >= 500 ? ' (performans için üst sınır yok; tarayıcıyı aşırı yüklememek için filtre kullanın)' : ''}
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Tarih</th>
                    <th className="px-3 py-2 font-medium">Olay</th>
                    <th className="px-3 py-2 font-medium">Taraf</th>
                    <th className="px-3 py-2 font-medium">Marka</th>
                    <th className="px-3 py-2 font-medium">Influencer</th>
                    <th className="px-3 py-2 font-medium">Kampanya</th>
                    <th className="px-3 py-2 font-medium text-right">Tutar</th>
                    <th className="px-3 py-2 font-medium min-w-[180px]">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.slice(0, 500).map((e) => (
                    <tr key={e.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                      <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                        {formatTr(e.at)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex max-w-[220px] flex-col gap-0.5 rounded-md px-2 py-0.5 text-xs font-medium ${badgeClass(e.kind)}`}
                        >
                          {KIND_LABELS[e.kind] || e.kind}
                        </span>
                        {e.offerId && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                            teklif {e.offerId}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{PERSP_LABEL[e.perspective]}</td>
                      <td className="px-3 py-2 text-xs max-w-[140px]">
                        <div className="font-medium text-slate-800 truncate">{e.brandName}</div>
                        <div className="text-slate-400 font-mono text-[10px] truncate">{e.brandId}</div>
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[140px]">
                        <div className="font-medium text-slate-800 truncate">{e.influencerName}</div>
                        {e.influencerId !== '—' && (
                          <div className="text-slate-400 font-mono text-[10px] truncate">{e.influencerId}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[180px]">
                        <div className="text-slate-800 truncate" title={e.campaignTitle}>
                          {e.campaignTitle}
                        </div>
                        {e.campaignId !== '—' && (
                          <div className="text-slate-400 font-mono text-[10px] truncate">{e.campaignId}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                        {e.priceTry != null ? `₺${e.priceTry.toLocaleString('tr-TR')}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 max-w-xs">
                        <div className="line-clamp-3">{e.description}</div>
                        {(e.contentMediaItems?.length || e.contentUrl) && (
                          <button
                            type="button"
                            onClick={() => openContentPreview(e.contentMediaItems || [], e.offerId, e.contentUrl)}
                            className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#08afd5]/30 bg-[#08afd5]/10 px-2.5 py-1 text-[11px] font-medium text-[#0a7a94] hover:bg-[#08afd5]/15"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            İçeriği görüntüle
                          </button>
                        )}
                        {e.title && e.title !== KIND_LABELS[e.kind] && (
                          <div className="text-slate-400 mt-0.5 line-clamp-1">{e.title}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEvents.length === 0 && (
                <p className="p-6 text-sm text-slate-500 text-center">Bu filtreyle kayıt yok.</p>
              )}
            </div>
            {filteredEvents.length > 500 && (
              <p className="text-xs text-amber-700">
                İlk 500 satır listeleniyor. Aralığı daraltmak için filtre veya arama kullanın.
              </p>
            )}
          </TabsContent>

	          <TabsContent value="campaigns" className="mt-4">
	            <p className="text-xs text-slate-500 mb-2">Toplam {filteredCampaigns.length} kayıt</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-medium">Güncellendi</th>
                    <th className="px-3 py-2 font-medium">Kampanya</th>
                    <th className="px-3 py-2 font-medium">Marka</th>
                    <th className="px-3 py-2 font-medium">Durum</th>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="px-3 py-2 font-medium text-right">Bütçe</th>
                    <th className="px-3 py-2 font-medium text-center">Teklif (B / K / R)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((c) => (
                    <tr key={`${c.brandId}_${c.id}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                        {formatTr(c.updatedAt || c.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{c.title}</div>
                        <div className="text-[10px] font-mono text-slate-400">{c.id}</div>
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[160px]">
                        <div className="truncate">{c.brandName}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5">{c.status}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">{c.campaignModel || '—'}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">
                        ₺{c.budgetTotal.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-3 py-2 text-center text-xs tabular-nums">
                        {c.offerCount} / <span className="text-emerald-700">{c.acceptedCount}</span> /{' '}
                        <span className="text-rose-700">{c.rejectedCount}</span>
                        {c.pendingCount > 0 && (
                          <span className="text-amber-700"> ({c.pendingCount} bekler)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCampaigns.length === 0 && (
                <p className="p-6 text-sm text-slate-500 text-center">Kampanya yok veya filtre eşleşmedi.</p>
              )}
	            </div>
	          </TabsContent>

	          <TabsContent value="registrations" className="mt-4">
	            <p className="text-xs text-slate-500 mb-2">Toplam {filteredRegistrations.length} kayıt</p>
	            <div className="overflow-x-auto rounded-xl border border-slate-200">
	              <table className="min-w-full text-sm">
	                <thead>
	                  <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
	                    <th className="px-3 py-2 font-medium">Kayıt tarihi</th>
	                    <th className="px-3 py-2 font-medium">Tür</th>
	                    <th className="px-3 py-2 font-medium">Ad / Marka</th>
	                    <th className="px-3 py-2 font-medium">E-posta</th>
	                    <th className="px-3 py-2 font-medium">Mail doğrulama</th>
	                    <th className="px-3 py-2 font-medium">Kayıt kaynağı</th>
	                    <th className="px-3 py-2 font-medium">Profil durumu</th>
	                    <th className="px-3 py-2 font-medium">UID</th>
	                  </tr>
	                </thead>
	                <tbody>
	                  {filteredRegistrations.map((row) => (
	                    <tr key={`${row.accountType}_${row.uid}_${row.source}`} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
	                      <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
	                        {formatTr(row.createdAt)}
	                      </td>
	                      <td className="px-3 py-2 text-xs">
	                        <span
	                          className={`inline-flex rounded-full px-2 py-0.5 ${
	                            row.accountType === 'brand'
	                              ? 'bg-sky-100 text-sky-800'
	                              : 'bg-violet-100 text-violet-800'
	                          }`}
	                        >
	                          {row.accountType === 'brand' ? 'Marka' : 'Influencer'}
	                        </span>
	                      </td>
	                      <td className="px-3 py-2 text-xs font-medium text-slate-800 max-w-[180px]">
	                        <div className="truncate" title={row.displayName}>{row.displayName}</div>
	                      </td>
	                      <td className="px-3 py-2 text-xs text-slate-700 max-w-[220px]">
	                        <div className="truncate" title={row.email}>{row.email}</div>
	                      </td>
	                      <td className="px-3 py-2 text-xs">
	                        <span
	                          className={`inline-flex rounded-full px-2 py-0.5 ${
	                            row.emailVerified
	                              ? 'bg-emerald-100 text-emerald-800'
	                              : 'bg-amber-100 text-amber-800'
	                          }`}
	                        >
	                          {row.emailVerified ? 'Doğrulandı' : 'Bekliyor'}
	                        </span>
	                      </td>
	                      <td className="px-3 py-2 text-xs text-slate-600">
	                        {row.source === 'main' ? 'Ana kayıt' : 'Geçici kayıt'}
	                      </td>
	                      <td className="px-3 py-2 text-xs text-slate-600">{row.status || '—'}</td>
	                      <td className="px-3 py-2 text-[10px] font-mono text-slate-500 break-all max-w-[150px]">
	                        {row.uid}
	                      </td>
	                    </tr>
	                  ))}
	                </tbody>
	              </table>
	              {filteredRegistrations.length === 0 && (
	                <p className="p-6 text-sm text-slate-500 text-center">Kayıt yok veya filtre eşleşmedi.</p>
	              )}
	            </div>
	          </TabsContent>

	          <TabsContent value="offers" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500">Teklif durumu</span>
              {(
                [
                  ['all', 'Tümü'],
                  ['beklemede', 'Beklemede'],
                  ['kabul', 'Kabul'],
                  ['red', 'Red'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOfferStatusF(k)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                    offerStatusF === k
                      ? 'border-[#08afd5] bg-[#08afd5]/10 text-[#0a7a94]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Gösterilen: {filteredOffers.length} teklif</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-medium">Güncellendi</th>
                    <th className="px-3 py-2 font-medium">Teklif</th>
                    <th className="px-3 py-2 font-medium">Tür</th>
                    <th className="px-3 py-2 font-medium">Durum</th>
                    <th className="px-3 py-2 font-medium">Marka</th>
                    <th className="px-3 py-2 font-medium">Influencer</th>
                    <th className="px-3 py-2 font-medium">Kampanya</th>
                    <th className="px-3 py-2 font-medium text-right">Fiyat</th>
                    <th className="px-3 py-2 font-medium">İçerik</th>
                  </tr>
                </thead>
                <tbody>
	                  {filteredOffers.map((o) => {
	                    const campaignTitle = campaignTitleByOfferKey.get(`${o.brandId}::${o.campaignId}`) || 'Kampanya adı yok';
                      const offerMediaItems = listOfferMediaItemsForAdmin(o);
	                    return (
	                    <tr key={o.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                        {formatTr(o.updatedAt)}
                      </td>
                      <td className="px-3 py-2 text-[10px] font-mono text-slate-600 break-all max-w-[100px]">
                        {o.id}
                      </td>
	                      <td className="px-3 py-2 text-xs">{offerKindLabel(o.offerKind)}</td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 ${
                            o.status === 'kabul'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.status === 'red'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[120px] truncate" title={data.brandNames[o.brandId]}>
                        {data.brandNames[o.brandId] || o.brandId}
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[120px] truncate" title={data.influencerNames[o.influencerId]}>
                        {data.influencerNames[o.influencerId] || o.influencerId}
                      </td>
	                      <td className="px-3 py-2 text-xs text-slate-700 max-w-[180px]">
	                        <div className="truncate" title={campaignTitle}>{campaignTitle}</div>
	                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">₺{(o.price ?? 0).toLocaleString('tr-TR')}</td>
                      <td className="px-3 py-2 text-xs max-w-[200px]">
                        {offerMediaItems.length > 0 ? (
                          <span className="text-emerald-700">Link var</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {offerMediaItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openContentPreview(offerMediaItems, o.id)}
                            className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#08afd5]/30 bg-[#08afd5]/10 px-2 py-0.5 text-[10px] font-medium text-[#0a7a94] hover:bg-[#08afd5]/15"
                          >
                            <Eye className="h-3 w-3" />
                            Gör
                          </button>
                        )}
                        {o.contentApproved && <div className="text-[10px] text-emerald-600">onaylı</div>}
                        {(o.contentRejectedAt || o.contentRejectionReason) && (
                          <div className="text-[10px] text-rose-600">ret / revizyon</div>
                        )}
                      </td>
	                    </tr>
	                    );
	                  })}
                </tbody>
              </table>
              {filteredOffers.length === 0 && (
                <p className="p-6 text-sm text-slate-500 text-center">Teklif yok veya filtre eşleşmedi.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    <ContentViewerModal
      isOpen={contentPreview.open}
      onClose={() => setContentPreview({ open: false, contentUrl: '', mediaItems: [] })}
      contentUrl={contentPreview.contentUrl}
      mediaItems={contentPreview.mediaItems.length > 0 ? contentPreview.mediaItems : undefined}
      offerId={contentPreview.offerId}
      isBrandPanel={false}
      contentApproved={true}
    />
    </>
  );
}
