export function getCampaignModelLabel(model?: string): string {
  switch (model) {
    case 'ugc_video':
      return 'UGC Video';
    case 'collaboration':
      return 'İşbirliği';
    case 'social_post':
      return 'Sosyal Medya Postu';
    case 'shared_link':
      return 'Paylaşımlı Link';
    default:
      return 'Belirtilmemiş';
  }
}

/** Teklif / detay ekranlarında modelin ne anlama geldiğini kısaca anlatır */
export function getCampaignModelDescription(model?: string): string {
  switch (model) {
    case 'ugc_video':
      return 'Bu kampanya UGC video modelindedir: markanın kullanımına uygun, talep edilen format ve sürede video içerik üretimi beklenir.';
    case 'collaboration':
      return 'Bu kampanya işbirliği modelindedir: belirlenen platformlarda tanıtım / sponsorlu içerik veya çoklu içerik paketi şeklinde yürütülür.';
    case 'social_post':
      return 'Bu kampanya sosyal medya gönderisi modelindedir: feed veya story tarzı paylaşımlar hedeflenir.';
    case 'shared_link':
      return 'Bu kampanya paylaşımlı link modelindedir: izlenebilir bağlantı ve tıklama / dönüşüm odaklı bir akış söz konusudur.';
    default:
      return 'Kampanya oluşturulurken seçilen model (UGC video, işbirliği vb.) teslimat ve iş akışını belirler.';
  }
}

/** Paylaşımlı link kampanyası (teklif sırasında izlenebilir URL akışı vb.) */
export function isSharedLinkStyleCampaign(model?: string): boolean {
  return model === 'shared_link';
}

/** UGC ve işbirliği kampanyalarında izlenebilir kampanya linki alanı gösterilmez. */
export function shouldHideTrackableCampaignLinkSection(model?: string): boolean {
  return model === 'ugc_video' || model === 'collaboration';
}
