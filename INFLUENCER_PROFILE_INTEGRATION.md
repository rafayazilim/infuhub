# 👤 Influencer Profil Entegrasyonu

## 📋 Genel Bakış

Influencer dashboard'una Firebase profil yönetimi entegre edilmiştir. Influencer'lar artık profillerini düzenleyebilir, sosyal medya hesaplarını yönetebilir ve fiyatlandırma ayarlarını yapabilir.

## ✅ Tamamlanan Özellikler

### 1. Firebase Influencer Servisi
- ✅ Profil getirme (`getInfluencerProfile`)
- ✅ Profil güncelleme (`updateInfluencerProfile`)
- ✅ Profil fotoğrafı yükleme (`uploadProfilePhoto`)
- ✅ Profil fotoğrafı silme (`deleteProfilePhoto`)
- ✅ Platform bilgisi güncelleme (`updatePlatformInfo`)
- ✅ Platform silme (`removePlatform`)
- ✅ İlgi alanları güncelleme (`updateCategories`)
- ✅ Fiyatlandırma güncelleme (`updateAverageAdPrice`)

### 2. Profil Ayarları Component'i
- ✅ Profil fotoğrafı yükleme ve önizleme
- ✅ Ad soyad düzenleme
- ✅ Bio düzenleme
- ✅ Sosyal medya hesapları (Instagram, TikTok, YouTube, Twitter)
- ✅ Platform ekleme/silme
- ✅ İlgi alanları seçimi (12 kategori)
- ✅ Ortalama reklam fiyatı belirleme
- ✅ Düzenleme modu (Edit/Save/Cancel)
- ✅ MacOS native tasarım

### 3. Dashboard Entegrasyonu
- ✅ Firebase'den profil verilerini çekme
- ✅ Dashboard header'da influencer ismi gösterme
- ✅ Profil menüsünden ProfileSettings component'ine yönlendirme
- ✅ Profil güncellemelerinde dashboard'u yenileme

## 🗂️ Dosya Yapısı

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

## 🎨 Profil Ayarları Sayfası

### Kartlar

#### 1. Temel Bilgiler
- Profil fotoğrafı (128x128px, yuvarlak)
- Fotoğraf değiştirme butonu
- Ad Soyad
- E-posta (read-only)
- Bio (3 satır)

#### 2. Sosyal Medya Hesapları
- Instagram, TikTok, YouTube, Twitter
- Her platform için:
  - Kullanıcı adı
  - Takipçi sayısı
  - Hesabı kaldır butonu

#### 3. İlgi Alanları
- 12 kategori pill button:
  - Moda, Güzellik, Teknoloji, Oyun
  - Seyahat, Yemek, Fitness, Lifestyle
  - Eğitim, Müzik, Sanat, İş
- Çoklu seçim

#### 4. Fiyatlandırma
- Ortalama reklam fiyatı (₺)
- Açıklama metni

### Düzenleme Modu

**Normal Mod:**
- Tüm alanlar disabled
- "Düzenle" butonu

**Edit Mod:**
- Tüm alanlar editable
- "İptal" ve "Kaydet" butonları
- Profil fotoğrafı değiştirme aktif

## 🔄 Kullanım

### Dashboard'da Profil Gösterme

```typescript
import { getInfluencerProfile } from '@/services/firebaseInfluencerService';

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
```

### Profil Ayarları Component'i

```typescript
import { ProfileSettings } from '@/components/influencer/ProfileSettings';

{activeMenu === 'profile' && influencerId && (
  <ProfileSettings 
    influencerId={influencerId}
    onProfileUpdate={loadProfileData}
  />
)}
```

## 📊 Veri Yapısı

### Firebase Realtime Database

```
influencers/
└── {influencerId}/
    ├── id: string
    ├── fullName: string
    ├── email: string
    ├── profilePhotoURL: string (optional)
    ├── bio: string (optional)
    ├── platforms:
    │   ├── instagram: { username: string, followers: number }
    │   ├── tiktok: { username: string, followers: number }
    │   ├── youtube: { username: string, followers: number }
    │   └── twitter: { username: string, followers: number }
    ├── categories: string[]
    ├── averageAdPrice: number (optional)
    ├── followerRange: string
    ├── verificationPhotoURL: string (optional)
    ├── status: "beklemede" | "onaylandı" | "reddedildi"
    ├── userType: "influencer"
    ├── createdAt: string (ISO)
    └── updatedAt: string (ISO)
```

### Firebase Storage

```
profile-photos/
└── {influencerId}/
    └── {timestamp}_{filename}
```

## 🔐 Güvenlik

### Realtime Database Rules

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

## 🎯 Servis Fonksiyonları

### Profil Getir
```typescript
const profile = await getInfluencerProfile(influencerId);
```

### Profil Güncelle
```typescript
await updateInfluencerProfile(influencerId, {
  fullName: "Ahmet Yılmaz",
  bio: "Moda ve teknoloji influencer'ı",
  categories: ["Moda", "Teknoloji"],
  averageAdPrice: 5000
});
```

### Profil Fotoğrafı Yükle
```typescript
const photoURL = await uploadProfilePhoto(influencerId, file);
```

### Platform Bilgisi Güncelle
```typescript
await updatePlatformInfo(influencerId, 'instagram', '@kullaniciadi', 50000);
```

### Platform Sil
```typescript
await removePlatform(influencerId, 'instagram');
```

### İlgi Alanları Güncelle
```typescript
await updateCategories(influencerId, ["Moda", "Güzellik", "Teknoloji"]);
```

### Fiyatlandırma Güncelle
```typescript
await updateAverageAdPrice(influencerId, 5000);
```

## 🎨 Tasarım Özellikleri

### MacOS Native Hissiyat
- Border radius: 10-12px
- Soft shadows
- Smooth transitions (150-250ms)
- Purple accent color (#9333ea)

### Dark/Light Mode
- Tüm component'ler dark mode destekli
- Otomatik tema algılama
- Manuel toggle

### Responsive
- Mobile: 1 kolon
- Tablet: 2 kolon
- Desktop: Optimum layout

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

## 🔜 Sonraki Adımlar

- ⏳ Teklifler sistemi (Firebase)
- ⏳ Kampanyalarım paneli (Firebase)
- ⏳ Kazançlar takibi
- ⏳ Performans metrikleri
- ⏳ Mesajlaşma sistemi

## 📝 Notlar

- Profil fotoğrafı maksimum 5MB
- Desteklenen formatlar: JPG, PNG, GIF
- Platform kullanıcı adları @ ile başlamalı
- Takipçi sayısı pozitif integer olmalı
- En az 1 ilgi alanı seçilmeli
- Ortalama reklam fiyatı opsiyonel

## 🔗 İlgili Dosyalar

- `src/services/firebaseInfluencerService.ts` - Profil servisi
- `src/components/influencer/ProfileSettings.tsx` - Profil ayarları
- `src/pages/influencer/InfluencerDashboardNew.tsx` - Ana dashboard
- `INFLUENCER_DASHBOARD_GUIDE.md` - Dashboard kılavuzu
- `FIREBASE_INTEGRATION_GUIDE.md` - Firebase kılavuzu
