# 🎨 Marka Dashboard Tasarım Kılavuzu

## 📋 Genel Bakış

İNFUHUB Marka Dashboard'u, MacOS native uygulama hissiyatı ve modern SaaS estetiği ile tasarlanmıştır. Apple, Linear ve Stripe'tan ilham alınarak oluşturulmuştur.

## 🎯 Tasarım Prensipleri

### MacOS Native Hissiyat
- ✅ Hafif yuvarlatılmış köşeler (border-radius: 10-12px)
- ✅ İnce, soft gölgeler
- ✅ Minimal border kullanımı
- ✅ Mac tarzı ince scrollbar
- ✅ Smooth animasyonlar (150-250ms, ease-out)

### Kart Yapısı
- ✅ Tüm içerikler kart (card) yapısında
- ✅ Kart maksimum oranı: 4:3
- ✅ Kartlar grid sisteminde hizalanmış
- ✅ Ekranın bir ucundan diğer ucuna uzanan geniş frameler YOK
- ✅ Full-width section YOK

### Dark / Light Mode
- ✅ İki tema da eşit kaliteli
- ✅ Sistem temasını algılama
- ✅ Manuel toggle
- ✅ Dark mode: Koyu gri tonları (tam siyah değil)
- ✅ Light mode: Kırık beyaz, göz yormayan kontrast

## 🧭 Sol Menü (Slide-Over)

### Özellikler
- ✅ Sol menü yeni sayfaya yönlendirme YAPMAZ
- ✅ Menü tıklandığında sağdan/soldan popup/slide-over panel açılır
- ✅ Arkaplan blur efekti
- ✅ ESC tuşu ile kapatılabilir
- ✅ Backdrop tıklaması ile kapatılabilir

### Menü Elemanları
1. Dashboard
2. Kampanyalar
3. Bütçe & Harcamalar
4. Influencer Teklifleri
5. Mesajlar
6. Analitik
7. Takip Linkleri
8. Raporlar
9. Bildirimler
10. Ayarlar

## 📊 Dashboard (Ana Ekran)

### Metrikler
Kart bazlı metrikler gösterilir:

1. **Toplam Kampanya Sayısı**
   - İkon + değer + açıklama
   - Trend badge'i

2. **Aktif Kampanya Sayısı**
   - Şu anda çalışan kampanyalar

3. **Beklemede Olan Influencer Teklifleri**
   - Yanıt bekleyen teklifler

4. **Takip Linklerinden Gelen Toplam Tıklama**
   - Link performans metrikleri

5. **Toplam Dönüşüm Sayısı**
   - Başarılı dönüşümler

6. **Dönüşüm Oranı**
   - Yüzdelik performans

### Kart Özellikleri
- Her metrik ayrı bir kart
- İkon + değer + küçük açıklama
- Hover'da hafif yükselme animasyonu (y: -4px)
- 4:3 aspect ratio
- Grid sisteminde hizalı

## 🧩 Kampanya Oluşturma (Modal)

### Özellikler
- ✅ Ayrı sayfa değil, büyük bir modal/popup
- ✅ ESC tuşu ile kapatılabilir
- ✅ Kaydetmeden çıkarken uyarı gösterilir
- ✅ Loading state var
- ✅ Smooth animasyonlar

### Form Alanları

#### 1. Ürün Bilgileri
- Ürün adı (zorunlu)
- Ürün açıklaması

#### 2. Hedef Kitle
- Yaş aralığı
- İlgi alanları
- Lokasyon

#### 3. Bütçe
- Toplam bütçe (zorunlu)
- Influencer başı teklif

#### 4. Kampanya Süresi
- Başlangıç tarihi
- Bitiş tarihi

#### 5. Platform Seçimi
- Instagram
- TikTok
- YouTube
(Pill button şeklinde)

#### 6. İçerik Formatı
- Story
- Reels
- Post
- Video
(Pill button şeklinde)

## 💾 Veri Yönetimi

### Şu Anki Yapı
- JSON dosyasına yazılıyor
- Local mock data yapısı
- localStorage kullanımı

### Veri Yapısı
```json
{
  "campaignId": "uuid",
  "product": {
    "name": "string",
    "description": "string"
  },
  "targetAudience": {
    "ageRange": "string",
    "interests": "string",
    "location": "string"
  },
  "budget": {
    "total": "number",
    "perInfluencer": "number"
  },
  "duration": {
    "start": "date",
    "end": "date"
  },
  "platforms": ["array"],
  "contentFormats": ["array"],
  "status": "active | pending | completed",
  "createdAt": "timestamp"
}
```

## 🎨 UI Bileşen Stilleri

### Button'lar
- Hafif yuvarlak (10px)
- Net primary/secondary ayrımı
- Hover efektleri
- Loading state'leri

### Card'lar
- 4:3 oran
- Asla tam ekran genişliği yok
- İnce border (0.5px opacity)
- Soft shadow

### Animasyonlar
- 150-250ms süre
- Ease-out timing
- Smooth transitions

### Scrollbar
- Mac tarzı ince scrollbar
- Transparent track
- Rounded thumb
- Hover efekti

## 🌓 Dark / Light Mode

### Light Mode
- Background: Kırık beyaz (#FAFAFA)
- Card: Beyaz (#FFFFFF)
- Text: Koyu gri (#1A1A1A)
- Border: Açık gri (opacity: 0.5)

### Dark Mode
- Background: Koyu gri (#0A0A0A)
- Card: Koyu gri (#121212)
- Text: Açık gri (#F5F5F5)
- Border: Koyu gri (opacity: 0.5)

## 🧠 UX Davranışları

### Popup Açıldığında
- ESC ile kapatılabilir
- Backdrop blur efekti
- Smooth animasyon

### Kaydetmeden Çıkarken
- Uyarı gösterilir
- Confirm dialog

### Boş State'ler
- İllustration
- Kısa açıklama
- Call-to-action

## 📱 Responsive Tasarım

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Grid Sistemi
- Mobile: 1 kolon
- Tablet: 2 kolon
- Desktop: 3 kolon

## 🚀 Kullanılan Teknolojiler

- **React** + **TypeScript**
- **Tailwind CSS** - Styling
- **Framer Motion** - Animasyonlar
- **Lucide React** - İkonlar
- **shadcn/ui** - UI bileşenleri

## 📦 Component Yapısı

```
src/
├── components/
│   └── brand/
│       ├── CampaignModal.tsx
│       ├── SidebarMenu.tsx
│       └── MetricCard.tsx
├── pages/
│   └── brand/
│       └── BrandDashboardNew.tsx
```

## 🎯 Hedef

Ortaya çıkan panel:
- ✅ Kurumsal markaların rahatça kullanabileceği
- ✅ Karmaşık ama asla karışık görünmeyen
- ✅ MacOS uygulaması gibi hissettiren
- ✅ Influencer marketing için premium SaaS paneli

## 🔗 Erişim

Dashboard'a erişim: `http://localhost:8081/marka/dashboard`

## 📝 Notlar

- Tüm animasyonlar performans odaklı
- Accessibility standartlarına uygun
- Keyboard navigation destekli
- Screen reader uyumlu
