# 🎯 Kampanya Paneli Tasarım Kılavuzu

## 📋 Genel Bakış

İNFUHUB Kampanya Paneli, Marka Dashboard'un ana içerik alanında gösterilir. Sol menüden "Kampanyalar" seçildiğinde, dashboard içeriği kampanya içeriği ile değiştirilir. Tüm tasarım prensipleri ve stil kuralları Marka Dashboard ile birebir uyumludur.

## 🎨 Tasarım Bağlılığı (KRİTİK)

### Zorunlu Uyum
- ✅ Aynı card yapısı (4:3 aspect ratio)
- ✅ Aynı border radius (10-12px)
- ✅ Aynı renk paleti
- ✅ Aynı dark/light mode davranışı
- ✅ Aynı animasyon süreleri (150-250ms)
- ✅ MacOS native hissiyat korunuyor

### Yasak
- ❌ Yeni layout mantığı
- ❌ Yeni grid sistemi
- ❌ Yeni frame yapısı
- ❌ Farklı tasarım dili

## 🧭 Panel Yapısı

### Görüntüleme Davranışı
- Sol menüden "Kampanyalar" tıklandığında ana içerik alanında gösterilir
- **Popup/Slide-over DEĞİL**, ana içerik değişir
- Dashboard ile aynı layout yapısını kullanır
- Sidebar menü her zaman erişilebilir durumda

### İçerik Alanı
- Ana içerik alanında (main) render edilir
- Maksimum genişlik: 7xl (1280px)
- Merkeze hizalı
- Responsive grid yapısı

## ➕ Üst Aksiyon Alanı

### Başlık Bölümü
```
[X] Kampanyalar
    Tüm kampanyalarınızı görüntüleyin ve yönetin
                                    [+ Yeni Kampanya Oluştur]
```

### Özellikler
- Başlık: "Kampanyalar" (3xl, bold)
- Alt başlık: Açıklama metni
- Sağ üst: Primary button
- Button hover ve active state'leri var
- Button tıklandığında kampanya oluşturma modal'ı açılır

## 🔍 Filtre Alanı

### Filtre Seçenekleri

#### Durum Filtresi
- Tümü
- Aktif
- Taslak
- Tamamlandı
- İptal

#### Platform Filtresi
- Tüm Platformlar
- Instagram
- TikTok
- YouTube

### Filtre Davranışı
- Dropdown/Select şeklinde
- Minimal tasarım
- Paneli boğmaz
- Gerçek zamanlı filtreleme

## 📦 Kampanya Kartları

### Kart Yapısı
```
┌─────────────────────────────┐
│ Kampanya Adı        [Badge] │
│                             │
│ [📱] [🎵] [📺]             │
│                             │
│ 💰 50.000 TL                │
│ 📅 2 hafta                  │
│                             │
│ [Detaylar] [Teklifler] [✏️] │
└─────────────────────────────┘
```

### Kart İçeriği

#### Üst Bölüm
- **Kampanya Adı**: Bold, 2 satır max (line-clamp-2)
- **Durum Badge**: Sağ üst köşe
  - Aktif: Yeşil
  - Taslak: Gri
  - Tamamlandı: Mavi
  - İptal: Kırmızı

#### Platform İkonları
- Instagram, TikTok, YouTube
- Pill şeklinde ikonlar
- Purple background

#### Bilgi Alanı
- **Bütçe**: Para ikonu + tutar (TRY formatında)
- **Süre**: Takvim ikonu + süre

#### Aksiyon Butonları
- **Detaylar**: Outline button + Eye icon
- **Teklifler**: Outline button + Users icon
- **Düzenle**: Ghost button + Edit icon

### Kart Davranışı
- Hover'da:
  - y: -4px yükselme
  - Shadow artışı
  - 150ms ease-out animasyon
- 4:3 aspect ratio korunur
- Grid sisteminde hizalı

## 🎨 Grid Sistemi

### Responsive Breakpoints
```css
Mobile (< 768px):   1 kolon
Tablet (768-1024):  2 kolon
Desktop (> 1024):   3 kolon
```

### Grid Özellikleri
- Gap: 1.5rem (24px)
- Kartlar asla full-width olmaz
- Maksimum 3 kolon
- Merkeze hizalı

## 🧩 Boş Durum (Empty State)

### Görünüm
```
┌─────────────────────────────┐
│                             │
│         [📢 Icon]           │
│                             │
│   Henüz Kampanya Yok        │
│   İlk kampanyanızı          │
│   oluşturarak başlayın      │
│                             │
│  [İlk Kampanyanı Oluştur]   │
│                             │
└─────────────────────────────┘
```

### Özellikler
- 4:3 aspect ratio card
- Merkeze hizalı
- İkon + başlık + açıklama + CTA button
- Filtre aktifse farklı mesaj gösterir

### Mesajlar
- **Filtre yok**: "Henüz Kampanya Yok"
- **Filtre var**: "Kampanya Bulunamadı"

## 💾 Veri Yönetimi

### API Entegrasyonu
```typescript
// Campaign Service kullanımı
import { getCampaignsByBrand } from '@/services/campaignService';

// Kampanyaları yükle
const campaigns = await getCampaignsByBrand(brandId);
```

### Fallback Davranışı
- API başarısız olursa localStorage'dan okur
- Demo için mock data desteği

### Veri Yapısı
```typescript
interface Campaign {
  id?: string;
  brandId: string;
  title?: string;
  productInfo: string;
  duration: string;
  targetAudience: string;
  budget: number;
  platforms: string[];
  contentFormats: string[];
  status?: 'aktif' | 'tamamlandı' | 'iptal' | 'taslak';
  createdAt?: string;
}
```

## 🎯 Aksiyon Davranışları

### Detayları Gör
- Kampanya detay modal'ı açılır (TODO)
- Tüm kampanya bilgileri gösterilir

### Teklifler
- Influencer teklifleri modal'ı açılır (TODO)
- Gelen teklifler listelenir

### Düzenle
- Kampanya düzenleme modal'ı açılır (TODO)
- Mevcut bilgiler form'a yüklenir

## 🎨 Stil Detayları

### Renkler
```css
/* Light Mode */
Background: #FAFAFA
Card: #FFFFFF
Border: rgba(0,0,0,0.1)

/* Dark Mode */
Background: #0A0A0A
Card: #121212
Border: rgba(255,255,255,0.1)
```

### Animasyonlar
```css
Hover: 150ms ease-out
Panel Slide: 250ms cubic-bezier(0.16, 1, 0.3, 1)
```

### Gölgeler
```css
Default: 0 1px 3px rgba(0,0,0,0.05)
Hover: 0 20px 40px rgba(0,0,0,0.1)
```

## 📱 Responsive Davranış

### Mobile (< 768px)
- Panel full width
- 1 kolon grid
- Butonlar stack olabilir

### Tablet (768-1024px)
- Panel 90% genişlik
- 2 kolon grid
- Tüm özellikler aktif

### Desktop (> 1024px)
- Panel 85% genişlik
- 3 kolon grid
- Optimal görünüm

## 🔗 Component Yapısı

```
src/
├── components/
│   └── brand/
│       ├── CampaignsContent.tsx  # Ana kampanya içeriği
│       ├── CampaignCard.tsx      # Kampanya kartı
│       ├── CampaignModal.tsx     # Oluşturma modal'ı
│       └── ...
├── pages/
│   └── brand/
│       └── BrandDashboardNew.tsx # Ana dashboard (içerik yönetimi)
```

## 🚀 Kullanım

### Dashboard'dan Gösterme
```typescript
// Sol menüden "Kampanyalar" seçildiğinde
{activeMenu === 'campaigns' && (
  <CampaignsContent
    onCreateCampaign={() => setIsCreateCampaignOpen(true)}
    brandId={brandId}
  />
)}
```

### Component Props
```typescript
<CampaignsContent
  onCreateCampaign={() => setIsCreateCampaignOpen(true)}
  brandId={brandId}
/>
```

## ✅ Tamamlanan Özellikler

- ✅ Ana içerik alanında gösterim
- ✅ Kampanya kartları (4:3 ratio)
- ✅ Durum ve platform filtreleri
- ✅ Empty state
- ✅ Loading state
- ✅ Responsive grid
- ✅ Dark/Light mode
- ✅ Hover animasyonları
- ✅ Sidebar menü entegrasyonu

## 🔜 Gelecek Özellikler

- ⏳ Kampanya detay modal'ı
- ⏳ Teklifler modal'ı
- ⏳ Kampanya düzenleme
- ⏳ Kampanya silme
- ⏳ Durum güncelleme
- ⏳ Sıralama seçenekleri
- ⏳ Arama fonksiyonu

## 🎯 Hedef Deneyim

Kullanıcı kampanya bölümüne geçtiğinde:
- Ana içerik alanı sorunsuz değişir
- "Bu dashboard'un doğal bir parçası" hissi
- Karmaşık kampanyalar bile temiz görünür
- Premium SaaS kalitesi
- MacOS native hissiyat
- Hızlı ve akıcı navigasyon
- Sol menü her zaman erişilebilir

## 📝 Notlar

- Tüm animasyonlar performans odaklı
- Accessibility standartlarına uygun
- Keyboard navigation destekli
- Screen reader uyumlu
- API ve localStorage desteği
- Popup değil, ana içerik değişimi
- Tüm sol menü öğeleri aynı şekilde çalışacak
