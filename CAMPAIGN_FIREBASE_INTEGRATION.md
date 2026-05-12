# 🎯 Kampanya Firebase Entegrasyonu

## 📋 Genel Bakış

Kampanya sistemi artık Firebase Realtime Database ile entegre edilmiştir. Her marka kendi cluster'ı altında kampanyalarını yönetebilir.

## 🗂️ Firebase Veri Yapısı

### Kampanya Cluster Yapısı

```
brands/
└── {brandId}/
    ├── brandName: "Örnek Marka"
    ├── email: "marka@example.com"
    ├── ...
    └── campaigns/
        ├── {campaignId1}/
        │   ├── id: "campaign-123"
        │   ├── brandId: "brand-456"
        │   ├── title: "Yeni Ürün Lansmanı"
        │   ├── productInfo: "Yeni Ürün"
        │   ├── productDescription: "Detaylı açıklama"
        │   ├── targetAudience:
        │   │   ├── ageRange: "18-35"
        │   │   ├── interests: "Teknoloji, Moda"
        │   │   └── location: "Türkiye"
        │   ├── budget:
        │   │   ├── total: 50000
        │   │   └── perInfluencer: 5000
        │   ├── duration:
        │   │   ├── start: "2026-01-15T00:00:00.000Z"
        │   │   ├── end: "2026-02-15T00:00:00.000Z"
        │   │   └── period: "1 ay"
        │   ├── platforms: ["instagram", "tiktok"]
        │   ├── contentFormats: ["reel", "story"]
        │   ├── status: "aktif"
        │   ├── createdAt: "2026-01-10T15:30:00.000Z"
        │   └── updatedAt: "2026-01-10T15:30:00.000Z"
        │
        └── {campaignId2}/
            └── ...
```

## 🎯 Özellikler

### 1. Kampanya Oluşturma

**Konum:** Marka Dashboard → Kampanyalar → Yeni Kampanya Oluştur

**Akış:**
1. Kullanıcı kampanya formunu doldurur
2. `createCampaign()` fonksiyonu çağrılır
3. Firebase'de `brands/{brandId}/campaigns/{campaignId}` altına kaydedilir
4. Otomatik olarak `status: "aktif"` atanır
5. Kampanya listesi güncellenir

**Kod:**
```typescript
import { createCampaign } from '@/services/firebaseCampaignService';

await createCampaign(brandId, {
  title: "Kampanya Başlığı",
  productInfo: "Ürün Adı",
  targetAudience: { ageRange: "18-35", interests: "Moda", location: "TR" },
  budget: { total: 50000, perInfluencer: 5000 },
  duration: { start: "2026-01-15", end: "2026-02-15" },
  platforms: ["instagram"],
  contentFormats: ["reel"]
});
```

### 2. Kampanya Listeleme

**Konum:** Marka Dashboard → Kampanyalar

**Özellikler:**
- Marka bazlı filtreleme (sadece kendi kampanyaları)
- Durum filtreleme (Tümü, Aktif, Taslak, Tamamlandı, İptal)
- Platform filtreleme (Instagram, TikTok, YouTube)
- Gerçek zamanlı güncelleme
- 4:3 aspect ratio kartlar
- Hover animasyonları

**Kod:**
```typescript
import { getBrandCampaigns } from '@/services/firebaseCampaignService';

const campaigns = await getBrandCampaigns(brandId);
```

### 3. Dashboard İstatistikleri

**Konum:** Marka Dashboard → Ana Sayfa

**Metrikler:**
- Toplam Kampanya Sayısı
- Aktif Kampanya Sayısı
- Taslak Kampanya Sayısı
- Tamamlanan Kampanya Sayısı

**Kod:**
```typescript
import { getCampaignSummary } from '@/services/firebaseCampaignService';

const stats = await getCampaignSummary(brandId);
// {
//   totalCampaigns: 12,
//   activeCampaigns: 5,
//   completedCampaigns: 4,
//   draftCampaigns: 3
// }
```

### 4. Kampanya Kartı

**Görüntülenen Bilgiler:**
- Kampanya başlığı
- Durum badge'i (Aktif, Taslak, Tamamlandı, İptal)
- Platform ikonları
- Toplam bütçe (TRY formatında)
- Kampanya süresi
- Aksiyon butonları (Detaylar, Teklifler, Düzenle)

**Özellikler:**
- 4:3 aspect ratio
- Hover animasyonu (y: -4px)
- MacOS native hissiyat
- Dark/Light mode uyumlu

## 🔧 Servis Fonksiyonları

### `createCampaign(brandId, campaignData)`
Yeni kampanya oluşturur ve Firebase'e kaydeder.

**Parametreler:**
- `brandId`: Marka ID'si
- `campaignData`: Kampanya bilgileri

**Dönüş:** `Promise<FirebaseCampaign>`

### `getBrandCampaigns(brandId)`
Markaya ait tüm kampanyaları getirir.

**Parametreler:**
- `brandId`: Marka ID'si

**Dönüş:** `Promise<FirebaseCampaign[]>`

### `getCampaignById(brandId, campaignId)`
Belirli bir kampanyayı getirir.

**Parametreler:**
- `brandId`: Marka ID'si
- `campaignId`: Kampanya ID'si

**Dönüş:** `Promise<FirebaseCampaign | null>`

### `updateCampaign(brandId, campaignId, updates)`
Kampanya bilgilerini günceller.

**Parametreler:**
- `brandId`: Marka ID'si
- `campaignId`: Kampanya ID'si
- `updates`: Güncellenecek alanlar

**Dönüş:** `Promise<void>`

### `updateCampaignStatus(brandId, campaignId, status)`
Kampanya durumunu günceller.

**Parametreler:**
- `brandId`: Marka ID'si
- `campaignId`: Kampanya ID'si
- `status`: "aktif" | "taslak" | "tamamlandı" | "iptal"

**Dönüş:** `Promise<void>`

### `deleteCampaign(brandId, campaignId)`
Kampanyayı soft delete yapar (status: "iptal").

**Parametreler:**
- `brandId`: Marka ID'si
- `campaignId`: Kampanya ID'si

**Dönüş:** `Promise<void>`

### `getCampaignSummary(brandId)`
Dashboard için kampanya özetini getirir.

**Parametreler:**
- `brandId`: Marka ID'si

**Dönüş:** `Promise<CampaignSummary>`

## 🎨 Component Yapısı

```
src/
├── services/
│   └── firebaseCampaignService.ts    # Firebase kampanya servisi
├── components/
│   └── brand/
│       ├── CampaignModal.tsx         # Kampanya oluşturma modal'ı
│       ├── CampaignsContent.tsx      # Kampanya listesi
│       └── CampaignCard.tsx          # Kampanya kartı
└── pages/
    └── brand/
        └── BrandDashboardNew.tsx     # Ana dashboard
```

## 🔄 Veri Akışı

### Kampanya Oluşturma Akışı

```
1. Kullanıcı "Yeni Kampanya Oluştur" butonuna tıklar
   ↓
2. CampaignModal açılır
   ↓
3. Kullanıcı formu doldurur
   ↓
4. "Kampanyayı Kaydet" butonuna tıklar
   ↓
5. createCampaign(brandId, data) çağrılır
   ↓
6. Firebase'e kaydedilir: brands/{brandId}/campaigns/{campaignId}
   ↓
7. Modal kapanır
   ↓
8. Kampanya listesi otomatik güncellenir
   ↓
9. Dashboard istatistikleri güncellenir
```

### Kampanya Listeleme Akışı

```
1. Kullanıcı "Kampanyalar" menüsüne tıklar
   ↓
2. CampaignsContent component render edilir
   ↓
3. getBrandCampaigns(brandId) çağrılır
   ↓
4. Firebase'den veriler çekilir
   ↓
5. Filtreler uygulanır (durum, platform)
   ↓
6. CampaignCard'lar render edilir
   ↓
7. Kullanıcı kartları görür ve etkileşime geçer
```

## 🔐 Güvenlik

### Firebase Rules

```json
{
  "rules": {
    "brands": {
      "$brandId": {
        ".read": "auth != null && auth.uid == $brandId",
        ".write": "auth != null && auth.uid == $brandId",
        "campaigns": {
          "$campaignId": {
            ".read": "auth != null && auth.uid == $brandId",
            ".write": "auth != null && auth.uid == $brandId"
          }
        }
      }
    }
  }
}
```

**Açıklama:**
- Sadece giriş yapmış kullanıcılar veri okuyabilir/yazabilir
- Her marka sadece kendi kampanyalarını görebilir/düzenleyebilir
- Cross-brand erişim engellenir

## 📊 Veri Tipleri

### FirebaseCampaign

```typescript
interface FirebaseCampaign {
  id: string;
  brandId: string;
  title: string;
  productInfo: string;
  productDescription?: string;
  targetAudience: {
    ageRange?: string;
    interests?: string;
    location?: string;
  };
  budget: {
    total: number;
    perInfluencer?: number;
  };
  duration: {
    start?: string;
    end?: string;
    period?: string;
  };
  platforms: string[];
  contentFormats: string[];
  status: 'aktif' | 'taslak' | 'tamamlandı' | 'iptal';
  createdAt: string;
  updatedAt: string;
}
```

## ✅ Tamamlanan Özellikler

- ✅ Firebase kampanya servisi
- ✅ Marka bazlı cluster yapısı
- ✅ Kampanya oluşturma
- ✅ Kampanya listeleme
- ✅ Durum filtreleme
- ✅ Platform filtreleme
- ✅ Dashboard istatistikleri
- ✅ Gerçek zamanlı veri senkronizasyonu
- ✅ 4:3 aspect ratio kartlar
- ✅ MacOS native tasarım
- ✅ Dark/Light mode

## 🔜 Gelecek Özellikler

- ⏳ Kampanya düzenleme modal'ı
- ⏳ Kampanya detay modal'ı
- ⏳ Kampanya silme (soft delete)
- ⏳ Kampanya kopyalama
- ⏳ Toplu işlemler
- ⏳ Kampanya şablonları
- ⏳ Kampanya analitikleri
- ⏳ Teklif sistemi entegrasyonu
- ⏳ Influencer eşleştirme

## 🐛 Bilinen Sorunlar

Şu anda bilinen bir sorun bulunmamaktadır.

## 📝 Notlar

- Tüm kampanyalar marka cluster'ı altında saklanır
- Kampanya ID'leri Firebase tarafından otomatik oluşturulur
- Tarihler ISO 8601 formatında saklanır
- Bütçe değerleri number tipinde saklanır (TRY)
- Platform ve content format değerleri lowercase olarak saklanır
- Soft delete kullanılır (status: "iptal")

## 🔗 İlgili Dosyalar

- `src/services/firebaseCampaignService.ts` - Kampanya servisi
- `src/components/brand/CampaignModal.tsx` - Oluşturma modal'ı
- `src/components/brand/CampaignsContent.tsx` - Liste component'i
- `src/components/brand/CampaignCard.tsx` - Kart component'i
- `src/pages/brand/BrandDashboardNew.tsx` - Ana dashboard
- `FIREBASE_INTEGRATION_GUIDE.md` - Genel Firebase kılavuzu
