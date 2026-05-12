import { get, ref } from 'firebase/database';
import { database } from '@/config/firebase';
import type { FirebaseCampaign } from '@/services/firebaseCampaignService';
import type { FirebaseOffer } from '@/services/firebaseOfferService';
import type { BrandWalletTransaction } from '@/services/firebaseBrandWalletService';
import type { OfferContentMediaItem } from '@/lib/offerContentCompleteness';

export type AdminActivityPerspective = 'brand' | 'influencer' | 'system';

export type AdminActivityEventKind =
  | 'brand_registered'
  | 'influencer_registered'
  | 'campaign_created'
  | 'campaign_updated'
  | 'offer_created'
  | 'offer_responded'
  | 'negotiation_step'
  | 'content_uploaded'
  | 'content_link_set'
  | 'content_share_link_set'
  | 'content_media_approved'
  | 'content_approved'
  | 'content_revision_requested'
  | 'content_rejected'
  | 'wallet_topup'
  | 'wallet_payment'
  | 'wallet_adjustment'
  | 'pending_wallet_debit_created';

export interface AdminActivityEvent {
  id: string;
  at: string;
  kind: AdminActivityEventKind;
  title: string;
  description: string;
  perspective: AdminActivityPerspective;
  brandId: string;
  brandName: string;
  campaignId: string;
  campaignTitle: string;
  offerId?: string;
  influencerId: string;
  influencerName: string;
  priceTry?: number;
  /** Orijinal alanlar — detay satırı / hata ayıklama */
  offerStatus?: string;
  offerKind?: string;
  contentUrl?: string;
  contentMediaItems?: OfferContentMediaItem[];
}

export interface AdminCampaignSnapshotRow {
  id: string;
  brandId: string;
  brandName: string;
  title: string;
  status: string;
  campaignModel?: string;
  createdAt: string;
  updatedAt: string;
  budgetTotal: number;
  perInfluencer?: number;
  visibility?: string;
  offerCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
}

export interface AdminRegistrationSnapshotRow {
  uid: string;
  accountType: 'brand' | 'influencer';
  displayName: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  source: 'main' | 'temporary';
  status?: string;
  platformSummary?: string;
}

export interface AdminSystemActivitySnapshot {
  events: AdminActivityEvent[];
  campaigns: AdminCampaignSnapshotRow[];
  offers: FirebaseOffer[];
  registrations: AdminRegistrationSnapshotRow[];
  brandNames: Record<string, string>;
  influencerNames: Record<string, string>;
  stats: {
    totalCampaigns: number;
    offerTotal: number;
    offerBeklemede: number;
    offerKabul: number;
    offerRed: number;
    withContentLink: number;
    contentUploaded: number;
    revisionRequested: number;
    contentApproved: number;
  };
}

const safeName = (v: unknown, fallback: string) =>
  typeof v === 'string' && v.trim() ? v.trim() : fallback;

function platformSummaryFromRaw(raw: unknown): string {
  if (!raw) return '';
  const entries = Array.isArray(raw)
    ? raw.map((item, index) => [String((item as { id?: unknown })?.id ?? index), item] as const)
    : typeof raw === 'object'
      ? Object.entries(raw as Record<string, unknown>)
      : [];

  return entries
    .map(([key, value]) => {
      if (!value || typeof value !== 'object') return '';
      const row = value as Record<string, unknown>;
      const platform = safeName(row.id, key);
      const username = safeName(row.username, 'kullanıcı adı yok');
      const followers = Number(row.followers);
      const followerText = Number.isFinite(followers)
        ? followers.toLocaleString('tr-TR')
        : 'takipçi yok';
      return `${platform}: @${username} (${followerText})`;
    })
    .filter(Boolean)
    .join(' | ');
}

function guessOfferInitiator(o: FirebaseOffer): AdminActivityPerspective {
  if (o.offerKind === 'counter_offer' && o.sourceType === 'influencer') return 'influencer';
  if (o.sourceType === 'influencer') return 'influencer';
  if (o.sourceType === 'brand') return 'brand';
  return 'brand';
}

function guessResponsePerspective(o: FirebaseOffer): AdminActivityPerspective | null {
  if (!o.respondedAt) return null;
  if (o.status !== 'kabul' && o.status !== 'red') return null;
  if (o.offerKind === 'incoming_campaign' && o.sourceType === 'influencer') {
    return 'brand';
  }
  if (o.offerKind === 'counter_offer') {
    if (o.sourceType === 'influencer') return 'brand';
    if (o.sourceType === 'brand') return 'influencer';
  }
  if (o.sourceType === 'brand' && o.destinationType === 'influencer') {
    return 'influencer';
  }
  if (o.sourceType === 'influencer' && o.destinationType === 'brand') {
    return 'brand';
  }
  return 'influencer';
}

function offerKindLabel(k?: string): string {
  switch (k) {
    case 'incoming_campaign':
      return 'Kampanyaya katılım';
    case 'counter_offer':
      return 'Karşı teklif';
    case 'direct':
      return 'Doğrudan teklif';
    default:
      return 'Teklif';
  }
}

function listAdminOfferMediaItems(o: FirebaseOffer): OfferContentMediaItem[] {
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

function countShareLinks(o: FirebaseOffer): number {
  if (!o.contentDeliveries || typeof o.contentDeliveries !== 'object') return 0;
  return Object.values(o.contentDeliveries).filter((row) => typeof row?.shareLink === 'string' && row.shareLink.trim()).length;
}

/**
 * Admin panel: RTDB’den markalar, influencerlar, teklifler, cüzdan ve bekleyen kesintiler;
 * denetim için tekilleştirilmiş olay listesi.
 */
export async function loadAdminSystemActivity(): Promise<AdminSystemActivitySnapshot> {
  const [brandsSnap, influencersSnap, offersSnap, pendingDebitsSnap, tempBrandsSnap, tempInfluencersSnap] = await Promise.all([
    get(ref(database, 'brands')),
    get(ref(database, 'influencers')),
    get(ref(database, 'offers')),
    get(ref(database, 'pendingBrandWalletDebits')).catch(() => null),
    get(ref(database, 'geciciMarkalar')).catch(() => null),
    get(ref(database, 'geciciInfluencerlar')).catch(() => null),
  ]);

  const brandNames: Record<string, string> = {};
  const influencerNames: Record<string, string> = {};

  const campaigns: AdminCampaignSnapshotRow[] = [];
  const events: AdminActivityEvent[] = [];
  const offerList: FirebaseOffer[] = [];
  const registrations: AdminRegistrationSnapshotRow[] = [];

  if (influencersSnap.exists()) {
    const raw = influencersSnap.val() as Record<string, Record<string, unknown>>;
    for (const [id, row] of Object.entries(raw)) {
      influencerNames[id] = safeName(row?.fullName, id);
      const createdAt = typeof row?.createdAt === 'string' ? row.createdAt : '';
      registrations.push({
        uid: id,
        accountType: 'influencer',
        displayName: influencerNames[id],
        email: safeName(row?.email, '—'),
        createdAt,
        emailVerified: true,
        source: 'main',
        status: typeof row?.status === 'string' ? row.status : undefined,
        platformSummary: platformSummaryFromRaw(row?.platforms),
      });
      if (createdAt) {
        events.push({
          id: `inf_reg_${id}`,
          at: createdAt,
          kind: 'influencer_registered',
          title: 'Influencer kaydı oluşturuldu',
          description: safeName(row?.email, 'E-posta yok'),
          perspective: 'influencer',
          brandId: '—',
          brandName: '—',
          campaignId: '—',
          campaignTitle: '—',
          influencerId: id,
          influencerName: influencerNames[id],
        });
      }
    }
  }

  if (brandsSnap.exists()) {
    const brandsVal = brandsSnap.val() as Record<string, Record<string, unknown>>;

    for (const [brandId, b] of Object.entries(brandsVal)) {
      const bn = safeName(b?.brandName, brandId);
      brandNames[brandId] = bn;
      const brandCreatedAt = typeof b?.createdAt === 'string' ? b.createdAt : '';
      registrations.push({
        uid: brandId,
        accountType: 'brand',
        displayName: bn,
        email: safeName(b?.email, '—'),
        createdAt: brandCreatedAt,
        emailVerified: true,
        source: 'main',
        status: typeof b?.status === 'string' ? b.status : undefined,
      });
      if (brandCreatedAt) {
        events.push({
          id: `brand_reg_${brandId}`,
          at: brandCreatedAt,
          kind: 'brand_registered',
          title: 'Marka kaydı oluşturuldu',
          description: safeName(b?.email, 'E-posta yok'),
          perspective: 'brand',
          brandId,
          brandName: bn,
          campaignId: '—',
          campaignTitle: '—',
          influencerId: '—',
          influencerName: '—',
        });
      }

      const txs = b?.walletTransactions;
      if (txs && typeof txs === 'object') {
        for (const tx of Object.values(txs) as Record<string, unknown>[]) {
          if (!tx || typeof tx !== 'object') continue;
          const t = tx as unknown as BrandWalletTransaction;
          const at = String(t.createdAt || '');
          if (!at) continue;
          const kindMap: Record<string, AdminActivityEventKind> = {
            topup: 'wallet_topup',
            payment: 'wallet_payment',
            adjustment: 'wallet_adjustment',
          };
          const kind = kindMap[t.type || ''] || 'wallet_adjustment';
          const amount = Number(t.amount) || 0;
          events.push({
            id: `wt_${brandId}_${t.id || at}`,
            at,
            kind,
            title:
              t.type === 'topup'
                ? 'Cüzdan yüklemesi'
                : t.type === 'payment'
                  ? 'Cüzdan ödemesi (teklif)'
                  : 'Cüzdan düzeltmesi',
            description: t.note
              ? `${t.note} · Bakiye: ₺${Number(t.balanceAfter).toLocaleString('tr-TR')}`
              : `Tutar: ₺${amount.toLocaleString('tr-TR')}`,
            perspective: 'brand',
            brandId,
            brandName: bn,
            campaignId: t.campaignId || '—',
            campaignTitle: t.campaignId ? String(t.campaignId) : '—',
            offerId: t.offerId,
            influencerId: t.influencerId || '—',
            influencerName: t.influencerId ? influencerNames[t.influencerId] || t.influencerId : '—',
            priceTry: amount,
          });
        }
      }

      const camp = b?.campaigns;
      if (camp && typeof camp === 'object') {
        for (const [cid, c] of Object.entries(camp as Record<string, Record<string, unknown>>)) {
          if (!c || typeof c !== 'object') continue;
          const campRow = c as unknown as FirebaseCampaign;
          const title =
            (typeof c.title === 'string' && c.title) ||
            (typeof c.campaignName === 'string' && c.campaignName) ||
            cid;

          const created = String(campRow.createdAt || '');
          const updated = String(campRow.updatedAt || created);
          if (created) {
            events.push({
              id: `camp_${cid}_created`,
              at: created,
              kind: 'campaign_created',
              title: 'Kampanya oluşturuldu',
              description: `Durum: ${campRow.status || '—'}`,
              perspective: 'brand',
              brandId,
              brandName: bn,
              campaignId: cid,
              campaignTitle: title,
              influencerId: '—',
              influencerName: '—',
            });
          }
          if (updated && updated !== created) {
            events.push({
              id: `camp_${cid}_upd`,
              at: updated,
              kind: 'campaign_updated',
              title: 'Kampanya güncellendi',
              description: `Durum: ${campRow.status || '—'}`,
              perspective: 'brand',
              brandId,
              brandName: bn,
              campaignId: cid,
              campaignTitle: title,
              influencerId: '—',
              influencerName: '—',
            });
          }
        }
      }
    }
  }

  if (offersSnap.exists()) {
    const rawOffers = offersSnap.val() as Record<string, Record<string, unknown>>;
    for (const [oid, o] of Object.entries(rawOffers)) {
      if (!o || typeof o !== 'object') continue;
      const offer = { ...o, id: o.id || oid } as FirebaseOffer;
      offerList.push(offer);
    }
  }

  const offerStats = { beklemede: 0, kabul: 0, red: 0, withContent: 0, contentUploads: 0, revisions: 0, contentOk: 0 };

  for (const o of offerList) {
    const bName = brandNames[o.brandId] || o.brandId;
    const iName = influencerNames[o.influencerId] || o.influencerId;
    const campRef = o.campaignId;

    if (o.status === 'beklemede') offerStats.beklemede++;
    if (o.status === 'kabul') offerStats.kabul++;
    if (o.status === 'red') offerStats.red++;
    const mediaItems = listAdminOfferMediaItems(o);
    if (mediaItems.length > 0 || o.contentLink) {
      offerStats.withContent++;
    }
    if (mediaItems.length > 0) offerStats.contentUploads++;
    if (o.contentApproved) offerStats.contentOk++;

    const campTitle = 'Kampanya';

    const msg = o.message?.trim();
    events.push({
      id: `off_c_${o.id}`,
      at: o.createdAt,
      kind: 'offer_created',
      title: `${offerKindLabel(o.offerKind)} · oluşturuldu`,
      description: msg
        ? msg.slice(0, 200) + (msg.length > 200 ? '…' : '')
        : `₺${(o.price ?? 0).toLocaleString('tr-TR')}`,
      perspective: guessOfferInitiator(o),
      brandId: o.brandId,
      brandName: bName,
      campaignId: campRef,
      campaignTitle: campTitle,
      offerId: o.id,
      influencerId: o.influencerId,
      influencerName: iName,
      priceTry: o.price,
      offerStatus: o.status,
      offerKind: o.offerKind,
    });

    if (o.negotiationHistory && typeof o.negotiationHistory === 'object') {
      const entries = Object.values(o.negotiationHistory).sort((a, b) =>
        String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''))
      );
      for (let i = 0; i < entries.length; i++) {
        const h = entries[i] as { actor?: string; price?: number; message?: string; createdAt?: string; type?: string };
        if (!h?.createdAt) continue;
        const actor = h.actor === 'brand' ? 'Marka' : h.actor === 'influencer' ? 'Influencer' : h.actor;
        events.push({
          id: `neg_${o.id}_${i}`,
          at: h.createdAt,
          kind: 'negotiation_step',
          title: `Pazarlık · ${actor}`,
          description: `₺${(h.price ?? 0).toLocaleString('tr-TR')}${h.message ? ` · ${h.message.slice(0, 120)}` : ''}`,
          perspective: h.actor === 'brand' ? 'brand' : 'influencer',
          brandId: o.brandId,
          brandName: bName,
          campaignId: campRef,
          campaignTitle: campTitle,
          offerId: o.id,
          influencerId: o.influencerId,
          influencerName: iName,
          priceTry: h.price,
        });
      }
    }

    if (o.respondedAt) {
      const resp = guessResponsePerspective(o);
      events.push({
        id: `off_r_${o.id}`,
        at: o.respondedAt,
        kind: 'offer_responded',
        title: o.status === 'kabul' ? 'Teklif kabul edildi' : 'Teklif reddedildi',
        description: `Tutar: ₺${(o.price ?? 0).toLocaleString('tr-TR')}`,
        perspective: resp || 'system',
        brandId: o.brandId,
        brandName: bName,
        campaignId: campRef,
        campaignTitle: campTitle,
        offerId: o.id,
        influencerId: o.influencerId,
        influencerName: iName,
        priceTry: o.price,
        offerStatus: o.status,
        offerKind: o.offerKind,
      });
    }

    if (o.contentLink) {
      events.push({
        id: `ct_l_${o.id}`,
        at: o.contentApprovedAt || o.contentRejectedAt || o.updatedAt,
        kind: 'content_link_set',
        title: 'İçerik teslimi (link)',
        description: o.contentLink.slice(0, 120) + (o.contentLink.length > 120 ? '…' : ''),
        perspective: 'influencer',
        brandId: o.brandId,
        brandName: bName,
        campaignId: campRef,
        campaignTitle: campTitle,
        offerId: o.id,
        influencerId: o.influencerId,
        influencerName: iName,
        contentUrl: o.contentLink,
        contentMediaItems: mediaItems,
      });
    }

    if (mediaItems.length > 0 && (o.lastContentDeliveryAt || o.updatedAt)) {
      events.push({
        id: `ct_up_${o.id}`,
        at: o.lastContentDeliveryAt || o.updatedAt,
        kind: 'content_uploaded',
        title: 'İçerik yüklendi',
        description: `${mediaItems.length} dosya teslim edildi`,
        perspective: 'influencer',
        brandId: o.brandId,
        brandName: bName,
        campaignId: campRef,
        campaignTitle: campTitle,
        offerId: o.id,
        influencerId: o.influencerId,
        influencerName: iName,
        contentUrl: mediaItems[0]?.url,
        contentMediaItems: mediaItems,
      });
    }

    const shareLinkCount = countShareLinks(o);
    if (shareLinkCount > 0) {
      events.push({
        id: `ct_share_${o.id}`,
        at: o.lastContentDeliveryAt || o.updatedAt,
        kind: 'content_share_link_set',
        title: 'Paylaşım linki eklendi',
        description: `${shareLinkCount} paylaşım linki eklendi`,
        perspective: 'influencer',
        brandId: o.brandId,
        brandName: bName,
        campaignId: campRef,
        campaignTitle: campTitle,
        offerId: o.id,
        influencerId: o.influencerId,
        influencerName: iName,
        contentUrl: mediaItems[0]?.url,
        contentMediaItems: mediaItems,
      });
    }

    if (o.contentMediaApproved && o.contentMediaApprovedAt) {
      events.push({
        id: `ct_raw_ok_${o.id}`,
        at: o.contentMediaApprovedAt,
        kind: 'content_media_approved',
        title: 'Ham içerik onaylandı',
        description: 'Marka ham video/görsel içeriğini onayladı',
        perspective: 'brand',
        brandId: o.brandId,
        brandName: bName,
        campaignId: campRef,
        campaignTitle: campTitle,
        offerId: o.id,
        influencerId: o.influencerId,
        influencerName: iName,
        contentUrl: mediaItems[0]?.url,
        contentMediaItems: mediaItems,
      });
    }

    if (o.contentApproved && o.contentApprovedAt) {
      events.push({
        id: `ct_ok_${o.id}`,
        at: o.contentApprovedAt,
        kind: 'content_approved',
        title: 'İçerik onaylandı',
        description: 'Marka içeriği onayladı',
        perspective: 'brand',
        brandId: o.brandId,
        brandName: bName,
        campaignId: campRef,
        campaignTitle: campTitle,
        offerId: o.id,
        influencerId: o.influencerId,
        influencerName: iName,
        contentUrl: mediaItems[0]?.url || o.contentLink,
        contentMediaItems: mediaItems,
      });
    }

    if (o.revisions && typeof o.revisions === 'object') {
      const revisions = Object.entries(o.revisions).sort((a, b) =>
        String(a[1]?.createdAt || '').localeCompare(String(b[1]?.createdAt || ''))
      );
      offerStats.revisions += revisions.length;
      for (const [revisionId, revision] of revisions) {
        if (!revision?.createdAt) continue;
        events.push({
          id: `ct_rev_${o.id}_${revisionId}`,
          at: revision.createdAt,
          kind: 'content_revision_requested',
          title: 'Revizyon istendi',
          description: revision.note ? String(revision.note).slice(0, 200) : 'Revizyon notu yok',
          perspective: 'brand',
          brandId: o.brandId,
          brandName: bName,
          campaignId: campRef,
          campaignTitle: campTitle,
          offerId: o.id,
          influencerId: o.influencerId,
          influencerName: iName,
          contentUrl: mediaItems[0]?.url,
          contentMediaItems: mediaItems,
        });
      }
    }

    if (o.contentRejectedAt) {
      events.push({
        id: `ct_rej_${o.id}`,
        at: o.contentRejectedAt,
        kind: 'content_rejected',
        title: 'İçerik reddedildi / revizyon',
        description: o.contentRejectionReason
          ? String(o.contentRejectionReason).slice(0, 200)
          : '—',
        perspective: 'brand',
        brandId: o.brandId,
        brandName: bName,
        campaignId: campRef,
        campaignTitle: campTitle,
        offerId: o.id,
        influencerId: o.influencerId,
        influencerName: iName,
        contentUrl: mediaItems[0]?.url,
        contentMediaItems: mediaItems,
      });
    }
  }

  const byCampaign: Record<string, { accepted: number; rejected: number; pending: number; total: number }> = {};

  for (const o of offerList) {
    const key = `${o.brandId}__${o.campaignId}`;
    if (!byCampaign[key]) {
      byCampaign[key] = { accepted: 0, rejected: 0, pending: 0, total: 0 };
    }
    byCampaign[key].total++;
    if (o.status === 'kabul') byCampaign[key].accepted++;
    else if (o.status === 'red') byCampaign[key].rejected++;
    else byCampaign[key].pending++;
  }

  if (brandsSnap.exists()) {
    const brandsVal = brandsSnap.val() as Record<string, Record<string, unknown>>;
    for (const [brandId, b] of Object.entries(brandsVal)) {
      const bn = brandNames[brandId] || brandId;
      const camp = b?.campaigns;
      if (!camp || typeof camp !== 'object') continue;
      for (const [cid, c] of Object.entries(camp as Record<string, Record<string, unknown>>)) {
        if (!c || typeof c !== 'object') continue;
        const campRow = c as unknown as FirebaseCampaign;
        const key = `${brandId}__${cid}`;
        const title =
          (typeof c.title === 'string' && c.title) ||
          (typeof c.campaignName === 'string' && c.campaignName) ||
          cid;
        const st = byCampaign[key] || { accepted: 0, rejected: 0, pending: 0, total: 0 };
        const budget = campRow.budget?.total;
        campaigns.push({
          id: cid,
          brandId,
          brandName: bn,
          title,
          status: String(campRow.status || '—'),
          campaignModel: campRow.campaignModel,
          createdAt: String(campRow.createdAt || ''),
          updatedAt: String(campRow.updatedAt || ''),
          budgetTotal: typeof budget === 'number' ? budget : Number(budget) || 0,
          perInfluencer: campRow.budget?.perInfluencer,
          visibility: campRow.visibility,
          offerCount: st.total,
          acceptedCount: st.accepted,
          rejectedCount: st.rejected,
          pendingCount: st.pending,
        });
      }
    }
  }

  const campaignTitleByKey = new Map(
    campaigns.map((c) => [`${c.brandId}::${c.id}`, c.title] as const)
  );
  if (pendingDebitsSnap?.exists()) {
    const pending = pendingDebitsSnap.val() as Record<string, Record<string, Record<string, unknown>>>;
    for (const [bid, offers] of Object.entries(pending)) {
      if (!offers || typeof offers !== 'object') continue;
      for (const [oid, row] of Object.entries(offers)) {
        if (!row || typeof row !== 'object') continue;
        const r = row as {
          amount?: number;
          influencerId?: string;
          campaignId?: string;
          createdAt?: string;
        };
        const at = String(r.createdAt || '');
        if (!at) continue;
        const bn = brandNames[bid] || bid;
        const inf = r.influencerId ? influencerNames[r.influencerId] || r.influencerId : '—';
        events.push({
          id: `pnd_${bid}_${oid}`,
          at,
          kind: 'pending_wallet_debit_created',
          title: 'Bekleyen cüzdan kesintisi (kabul sonrası)',
          description: `₺${(r.amount ?? 0).toLocaleString('tr-TR')} · Marka panelinde işlenmeyi bekliyor olabilir`,
          perspective: 'influencer',
          brandId: bid,
          brandName: bn,
          campaignId: r.campaignId || '—',
          campaignTitle: r.campaignId || '—',
          offerId: oid,
          influencerId: r.influencerId || '—',
          influencerName: inf,
          priceTry: r.amount,
        });
      }
    }
	  }

  for (const e of events) {
    if (e.campaignId && e.campaignId !== '—' && e.brandId) {
      const t = campaignTitleByKey.get(`${e.brandId}::${e.campaignId}`);
      if (t) e.campaignTitle = t;
    }
  }

  const pushTemporaryRegistrations = (
    snap: typeof tempBrandsSnap,
    accountType: 'brand' | 'influencer'
  ) => {
    if (!snap?.exists()) return;
    const raw = snap.val() as Record<string, Record<string, unknown>>;
    for (const [uid, row] of Object.entries(raw)) {
      if (!row || typeof row !== 'object') continue;
      const email = safeName(row.email, '—');
      const displayName =
        accountType === 'brand'
          ? safeName(row.brandName, email)
          : safeName(row.fullName, email);
      const createdAt = typeof row.createdAt === 'string' ? row.createdAt : '';
      registrations.push({
        uid,
        accountType,
        displayName,
        email,
        createdAt,
        emailVerified: false,
        source: 'temporary',
        status: 'mail_bekliyor',
        platformSummary: platformSummaryFromRaw(row.platforms),
      });
    }
  };
  pushTemporaryRegistrations(tempBrandsSnap, 'brand');
  pushTemporaryRegistrations(tempInfluencersSnap, 'influencer');

  events.sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  return {
    events,
    campaigns: campaigns.sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)),
    offers: offerList.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    registrations: registrations.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    brandNames,
    influencerNames,
    stats: {
      totalCampaigns: campaigns.length,
      offerTotal: offerList.length,
      offerBeklemede: offerStats.beklemede,
      offerKabul: offerStats.kabul,
      offerRed: offerStats.red,
      withContentLink: offerStats.withContent,
      contentUploaded: offerStats.contentUploads,
      revisionRequested: offerStats.revisions,
      contentApproved: offerStats.contentOk,
    },
  };
}
