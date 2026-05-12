# 🎬 Influencer Dashboard Tasarım Kılavuzu

## 📋 Genel Bakış

İNFUHUB Influencer Dashboard'u, marka paneli ile aynı tasarım dilini kullanarak influencer'lara özel bir deneyim sunar. MacOS native hissiyatı ve modern SaaS estetiği korunmuştur.

## 🎨 Tasarım Prensipleri

### Marka Paneli ile Uyum
- ✅ Aynı MacOS native hissiyat
- ✅ Aynı card yapısı (4:3 aspect ratio)
- ✅ Aynı border radius (10-12px)
- ✅ Aynı renk paleti
- ✅ Aynı dark/light mode davranışı
- ✅ Aynı animasyon süreleri (150-250ms)

### Influencer'a Özel Farklar
- 🎯 Aksiyon odaklı metrikler
- 📊 Performans vurgusu
- 💰 Kazanç takibi
- ✅ Görev listesi yaklaşımı

## 📊 Dashboard Yapısı

### 1. Üst Metrik Kartları (4:3 Card)

#### Aktif Kampanyalar
```
┌─────────────────────────────┐
│ [💼]              [Badge]   │
│                             │
│ 0                           │
│ Aktif Kampanyalar           │
│ Üzerinde çalıştığın         │
└─────────────────────────────┘
```

#### Bekleyen Teklifler (Highlight)
```
┌─────────────────────────────┐
│ [⏰]              [Yeni]    │
│                             │
│ 0                           │
│ Bekleyen Teklifler          │
│ Yanıt bekleniyor            │
└─────────────────────────────┘
```
- **Özel:** Purple highlight ile vurgulanır
- **Amaç:** Acil aksiyon hissi verir

#### Toplam Kazanç
```
┌─────────────────────────────┐
│ [💰]         [Başlangıç]   │
│                             │
│ ₺0                          │
│ Toplam Kazanç               │
│ Bugüne kadar                │
└─────────────────────────────┘
```

#### Ödenecek Tutar
```
┌─────────────────────────────┐
│ [👛]              [Hazır]   │
│                             │
│ ₺0                          │
│ Ödenecek Tutar              │
│ Çekilebilir bakiye          │
└─────────────────────────────┘
```

### 2. Senden Beklenenler Kartı

**Görünüm:**
```
┌─────────────────────────────────────────┐
│ [⚠️] Senden Beklenenler                 │
│     Acil aksiyonlar ve görevler         │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ [📄] Onay Bekleyen Teklifler  [0]│   │
│ │     Yeni kampanya teklifleri    │   │
│ └─────────────────────────────────┘   │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ [📤] İçerik Yüklemen Gereken  [0]│   │
│ │     Teslim tarihi yaklaşan      │   │
│ └─────────────────────────────────┘   │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ [⚠️] Revizyon İsteyen Markalar[0]│   │
│ │     İçeriklerinde değişiklik    │   │
│ └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Özellikler:**
- Bildirim değil, görev listesi mantığı
- Her item tıklanabilir
- Count badge'leri
- Renk kodlu ikonlar:
  - 🔵 Mavi: Teklifler
  - 🟠 Turuncu: İçerik
  - 🔴 Kırmızı: Revizyon

**Boş Durum:**
```
✅ Harika! Şu anda bekleyen görevin yok 🎉
```

### 3. Performans Snapshot

**Metrikler:**
- Toplam Tıklama (Son 30 gün)
- Etkileşim (Ortalama oran)
- Dönüşüm (Başarılı)
- Tamamlanan (Kampanya sayısı)

**Amaç:**
> "Ben değerliyim" hissini güçlendirir 😎

## 🧭 Sol Menü Yapısı

### Ana Menü

```
📊 Dashboard
📄 Teklifler
💼 Kampanyalarım
📤 İçerik Teslimleri
💰 Kazançlar
💬 Mesajlar
📈 Performans
👤 Profilim
⚙️ Ayarlar
```

### Menü Detayları

#### 1. Dashboard
- Ana sayfa
- Metrikler ve görevler

#### 2. Teklifler
- Gelen teklifler
- Kabul / Reddet
- Teklif detayları

#### 3. Kampanyalarım
- Aktif kampanyalar
- Tamamlanan kampanyalar
- Kampanya detayları

#### 4. İçerik Teslimleri
- Yüklenecek içerikler
- Onay bekleyenler
- Revizyon talepleri

#### 5. Kazançlar
- Toplam kazanç
- Bekleyen ödeme
- Ödeme geçmişi
- IBAN / PayPal ayarları

#### 6. Mesajlar
- Marka ile chat
- Bildirimler

#### 7. Performans
- Kampanya bazlı istatistikler
- Grafikler
- Raporlar

#### 8. Profilim
- Bio
- Sosyal hesaplar
- Portfolio

#### 9. Ayarlar
- Bildirimler
- Tema (dark/light)
- Hesap ayarları

## 🎨 Tasarım Davranışları

### Popup / Slide-over Mantığı
- ✅ Sol menü slide-over olarak açılır
- ✅ Yeni sayfa YOK
- ✅ Ana içerik alanı değişir
- ✅ ESC tuşu ile kapatılabilir

### Card Bazlı Yapı
- ✅ 4:3 oran korunur
- ✅ Grid sisteminde hizalı
- ✅ Hover animasyonları
- ✅ Soft shadow'lar

### Dark / Light Mode
- ✅ Aynı sistem
- ✅ Toggle button
- ✅ Sistem teması algılama

## 🎯 Metrik Kartı Özellikleri

### Normal Kart
```css
Background: white / dark:gray-900
Border: gray-200/50 / dark:gray-800/50
Icon Background: purple-100 / dark:purple-900/30
Icon Color: purple-600 / dark:purple-400
```

### Highlight Kart (Bekleyen Teklifler)
```css
Background: purple-50 / dark:purple-900/20
Border: purple-500/50
Icon Background: purple-200 / dark:purple-800/50
Icon Color: purple-700 / dark:purple-300
```

## 🔔 Aksiyon Item Renkleri

### Teklif (Offer)
```css
Icon: blue-600 / dark:blue-400
Background: blue-100 / dark:blue-900/30
```

### İçerik (Content)
```css
Icon: orange-600 / dark:orange-400
Background: orange-100 / dark:orange-900/30
```

### Revizyon (Revision)
```css
Icon: red-600 / dark:red-400
Background: red-100 / dark:red-900/30
```

## 📱 Responsive Tasarım

### Breakpoints
```css
Mobile (< 768px):   1 kolon
Tablet (768-1024):  2 kolon
Desktop (> 1024):   4 kolon
```

### Grid Yapısı
- Üst metrikler: 4 kolon (desktop)
- Performans: 4 kolon (desktop)
- Senden Beklenenler: Full width (tek kolon)

## 🎭 Animasyonlar

### Hover Animasyonları
```css
Metric Card: y: -4px, shadow artışı
Action Item: x: 4px
Duration: 150ms ease-out
```

### Sidebar Animasyonu
```css
Initial: x: -280px
Animate: x: 0
Duration: 200ms ease-out
```

## 🔄 Veri Akışı

### Dashboard Yükleme
```
1. Component mount
   ↓
2. localStorage'dan user ID al
   ↓
3. Firebase'den veriler çek:
   - Aktif kampanyalar
   - Bekleyen teklifler
   - Kazançlar
   - Performans metrikleri
   ↓
4. State'leri güncelle
   ↓
5. UI render
```

## 📦 Component Yapısı

```
src/
└── pages/
    └── influencer/
        ├── InfluencerDashboard.tsx      # Eski (yedek)
        └── InfluencerDashboardNew.tsx   # Yeni (aktif)
```

## ✅ Tamamlanan Özellikler

- ✅ MacOS native tasarım
- ✅ Üst metrik kartları (4 adet)
- ✅ Senden Beklenenler kartı
- ✅ Performans snapshot (4 metrik)
- ✅ Sol menü (9 öğe)
- ✅ Slide-over sidebar
- ✅ Dark/Light mode
- ✅ Responsive grid
- ✅ Hover animasyonları
- ✅ Empty state'ler
- ✅ Mac scrollbar
- ✅ Firebase profil entegrasyonu
- ✅ Profil ayarları sayfası
- ✅ Profil fotoğrafı yükleme
- ✅ Sosyal medya hesapları yönetimi
- ✅ İlgi alanları seçimi
- ✅ Fiyatlandırma ayarları

## 🔜 Gelecek Özellikler

- ⏳ Teklifler paneli (Firebase entegrasyonu)
- ⏳ Kampanyalarım paneli (Firebase entegrasyonu)
- ⏳ İçerik teslimleri
- ⏳ Kazançlar paneli
- ⏳ Mesajlaşma sistemi
- ⏳ Performans grafikleri
- ⏳ Gerçek zamanlı bildirimler
- ⏳ Dashboard metriklerinin Firebase'den çekilmesi

## 🎯 Kullanıcı Deneyimi Hedefleri

### İlk İzlenim
> "Burası benim için tasarlanmış, ne yapmam gerektiğini hemen anlıyorum"

### Aksiyon Odaklı
> "Bekleyen görevlerimi görüyorum ve hemen harekete geçebiliyorum"

### Değer Hissi
> "Performansımı ve kazancımı takip edebiliyorum, değerliyim"

### Profesyonel
> "Bu platform ciddi ve güvenilir görünüyor"

## 📝 Notlar

- Marka paneli ile aynı kod yapısı kullanılır
- Component'ler yeniden kullanılabilir
- Firebase entegrasyonu sonraki aşamada
- Tüm metrikler şu anda mock data
- Gerçek veriler API'den gelecek

## 🔗 İlgili Dosyalar

- `src/pages/influencer/InfluencerDashboardNew.tsx` - Ana dashboard
- `src/pages/brand/BrandDashboardNew.tsx` - Referans (marka paneli)
- `BRAND_DASHBOARD_GUIDE.md` - Marka paneli kılavuzu
- `src/components/theme-provider.tsx` - Tema yönetimi


## 🔥 Firebase Entegrasyonu

### Profil Servisi

Influencer profil yönetimi için `firebaseInfluencerService.ts` servisi oluşturuldu.

#### Profil Yapısı

```typescript
interface InfluencerProfile {
  id: string;
  fullName: string;
  email: string;
  profilePhotoURL?: string;
  bio?: string;
  
  platforms: {
    instagram?: { username: string; followers: number };
    tiktok?: { username: string; followers: number };
    youtube?: { username: string; followers: number };
    twitter?: { username: string; followers: number };
  };
  
  categories: string[];
  averageAdPrice?: number;
  
  followerRange: string;
  verificationPhotoURL?: string;
  status: 'beklemede' | 'onaylandı' | 'reddedildi';
  userType: 'influencer';
  createdAt: string;
  updatedAt: string;
}
```

#### Servis Fonksiyonları

**Profil Getir:**
```typescript
const profile = await getInfluencerProfile(influencerId);
```

**Profil Güncelle:**
```typescript
await updateInfluencerProfile(influencerId, {
  fullName: "Yeni İsim",
  bio: "Yeni bio",
  categories: ["Moda", "Teknoloji"],
  averageAdPrice: 5000
});
```

**Profil Fotoğrafı Yükle:**
```typescript
const photoURL = await uploadProfilePhoto(influencerId, file);
```

**Platform Bilgisi Güncelle:**
```typescript
await updatePlatformInfo(influencerId, 'instagram', '@kullaniciadi', 50000);
```

**Platform Sil:**
```typescript
await removePlatform(influencerId, 'instagram');
```

### Profil Ayarları Component'i

`ProfileSettings.tsx` component'i influencer'ların profillerini düzenlemesini sağlar.

#### Özellikler:

- ✅ Profil fotoğrafı yükleme ve önizleme
- ✅ Ad soyad düzenleme
- ✅ Bio düzenleme
- ✅ Sosyal medya hesapları (Instagram, TikTok, YouTube, Twitter)
- ✅ Her platform için kullanıcı adı ve takipçi sayısı
- ✅ Platform ekleme/silme
- ✅ İlgi alanları seçimi (12 kategori)
- ✅ Ortalama reklam fiyatı belirleme
- ✅ Düzenleme modu (Edit/Save/Cancel)
- ✅ Form validasyonu
- ✅ Loading states
- ✅ Error handling

#### Kullanım:

```typescript
<ProfileSettings 
  influencerId={influencerId}
  onProfileUpdate={loadProfileData}
/>
```

### Dashboard Entegrasyonu

Dashboard artık Firebase'den profil verilerini çeker:

```typescript
const [profileData, setProfileData] = useState<any>(null);

useEffect(() => {
  if (influencerId) {
    loadProfileData();
  }
}, [influencerId]);

const loadProfileData = async () => {
  const profile = await getInfluencerProfile(influencerId);
  setProfileData(profile);
};
```

Dashboard header'da influencer ismi gösterilir:
```
Hoş geldin, Ahmet Yılmaz! İşte senin için önemli bilgiler
```

## 📱 Profil Ayarları Sayfası

### Tasarım

Profil ayarları sayfası 4 ana kart içerir:

#### 1. Temel Bilgiler Kartı
- Profil fotoğrafı (yuvarlak, 128x128px)
- Fotoğraf değiştirme butonu (edit mode'da)
- Ad Soyad input
- E-posta (read-only)
- Bio textarea

#### 2. Sosyal Medya Hesapları Kartı
- 4 platform: Instagram, TikTok, YouTube, Twitter
- Her platform için:
  - Platform ikonu
  - Kullanıcı adı input
  - Takipçi sayısı input
  - Hesabı kaldır butonu (edit mode'da)
- Hesap eklenmemişse "Hesap eklenmemiş" mesajı

#### 3. İlgi Alanları Kartı
- 12 kategori pill button'ları:
  - Moda, Güzellik, Teknoloji, Oyun
  - Seyahat, Yemek, Fitness, Lifestyle
  - Eğitim, Müzik, Sanat, İş
- Çoklu seçim
- Seçili olanlar purple, diğerleri gray

#### 4. Fiyatlandırma Kartı
- Ortalama reklam fiyatı input (₺)
- DollarSign ikonu
- Açıklama: "Markalar bu fiyatı görecek ve teklif verecek"

### Düzenleme Modu

**Normal Mod:**
- Tüm alanlar disabled
- "Düzenle" butonu sağ üstte

**Edit Mod:**
- Tüm alanlar editable
- "İptal" ve "Kaydet" butonları
- Profil fotoğrafı değiştirme aktif
- Platform ekleme/silme aktif

**Kaydetme:**
1. Profil fotoğrafı varsa önce yükle
2. Profil bilgilerini güncelle
3. Edit mode'dan çık
4. Profili yeniden yükle
5. Parent component'e bildir (onProfileUpdate)
6. Başarı mesajı göster

**İptal:**
1. Edit mode'dan çık
2. Profili yeniden yükle (değişiklikleri geri al)
3. Fotoğraf preview'ı temizle

## 🎨 Stil Detayları

### Profil Fotoğrafı
```css
Width: 128px
Height: 128px
Border Radius: 50% (yuvarlak)
Background: gray-200 / dark:gray-800
Object Fit: cover
```

### Fotoğraf Değiştir Butonu
```css
Position: absolute (bottom-right)
Background: purple-600
Border Radius: 50%
Padding: 8px
Icon: Camera (16px)
Hover: purple-700
```

### Platform Kartları
```css
Padding: 16px
Border Radius: 10px
Border: gray-200/50 / dark:gray-700/50
Background: gray-50 / dark:gray-800/50
```

### Kategori Pill'leri
```css
Padding: 8px 16px
Border Radius: 10px
Font Weight: medium
Transition: 150ms

Seçili:
  Background: purple-600
  Color: white
  Shadow: sm

Seçili Değil:
  Background: gray-100 / dark:gray-800
  Color: gray-700 / dark:gray-300
  Hover: gray-200 / dark:gray-700
```

## 🔄 Veri Akışı

### Profil Yükleme
```
1. Component mount
   ↓
2. getInfluencerProfile(influencerId)
   ↓
3. Firebase'den profil verisi çek
   ↓
4. State'leri doldur:
   - fullName
   - bio
   - selectedCategories
   - averageAdPrice
   - platforms
   - profilePhotoPreview
   ↓
5. UI render
```

### Profil Güncelleme
```
1. Kullanıcı "Düzenle" butonuna tıklar
   ↓
2. Edit mode aktif olur
   ↓
3. Kullanıcı değişiklik yapar
   ↓
4. "Kaydet" butonuna tıklar
   ↓
5. Profil fotoğrafı varsa:
   - uploadProfilePhoto(influencerId, file)
   - Storage'a yükle
   - URL al
   ↓
6. updateInfluencerProfile(influencerId, updates)
   ↓
7. Firebase'de güncelle
   ↓
8. Edit mode kapat
   ↓
9. Profili yeniden yükle
   ↓
10. Parent'a bildir (onProfileUpdate)
   ↓
11. Başarı mesajı
```

## 🔐 Güvenlik

### Firebase Rules

```json
{
  "rules": {
    "influencers": {
      "$influencerId": {
        ".read": "auth != null && auth.uid == $influencerId",
        ".write": "auth != null && auth.uid == $influencerId"
      }
    }
  }
}
```

### Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-photos/{influencerId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == influencerId;
    }
  }
}
```

## 📝 Kullanım Örnekleri

### Dashboard'da Profil Gösterme

```typescript
const [profileData, setProfileData] = useState<any>(null);

useEffect(() => {
  if (influencerId) {
    loadProfileData();
  }
}, [influencerId]);

const loadProfileData = async () => {
  try {
    const profile = await getInfluencerProfile(influencerId);
    setProfileData(profile);
  } catch (error) {
    console.error('Profil yükleme hatası:', error);
  }
};

// Header'da kullan
<p>Hoş geldin{profileData?.fullName ? `, ${profileData.fullName}` : ''}!</p>
```

### Profil Ayarları Sayfası

```typescript
{activeMenu === 'profile' && influencerId && (
  <ProfileSettings 
    influencerId={influencerId}
    onProfileUpdate={loadProfileData}
  />
)}
```

## 🐛 Hata Yönetimi

Tüm Firebase işlemleri try-catch ile sarılmıştır:

```typescript
try {
  await updateInfluencerProfile(influencerId, updates);
  alert('Profil başarıyla güncellendi!');
} catch (error: any) {
  console.error('Profil güncelleme hatası:', error);
  alert(error.message || 'Profil güncellenirken bir hata oluştu!');
}
```

## 📊 Component Yapısı

```
src/
├── services/
│   └── firebaseInfluencerService.ts    # Influencer profil servisi
├── components/
│   └── influencer/
│       └── ProfileSettings.tsx         # Profil ayarları component'i
└── pages/
    └── influencer/
        └── InfluencerDashboardNew.tsx  # Ana dashboard (Firebase entegre)
```
