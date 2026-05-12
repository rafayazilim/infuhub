# 🔥 Firebase Entegrasyon Kılavuzu

## 📋 Genel Bakış

İNFUHUB projesi artık Firebase ile entegre edilmiştir. Kullanıcı kayıtları, authentication ve veri yönetimi Firebase üzerinden yapılmaktadır.

## 🎯 Firebase Yapısı

### Realtime Database Yapısı

```
infuhub-c5ce7/
├── brands/
│   └── {userId}/
│       ├── id: string
│       ├── brandName: string
│       ├── email: string
│       ├── industry: string
│       ├── budget: number
│       ├── website: string (optional)
│       ├── status: "beklemede" | "onaylandı" | "reddedildi"
│       ├── userType: "brand"
│       ├── createdAt: string (ISO)
│       ├── updatedAt: string (ISO)
│       └── campaigns/
│           └── {campaignId}/
│               ├── id: string
│               ├── brandId: string
│               ├── title: string
│               ├── productInfo: string
│               ├── productDescription: string (optional)
│               ├── targetAudience:
│               │   ├── ageRange: string
│               │   ├── interests: string
│               │   └── location: string
│               ├── budget:
│               │   ├── total: number
│               │   └── perInfluencer: number (optional)
│               ├── duration:
│               │   ├── start: string (ISO)
│               │   ├── end: string (ISO)
│               │   └── period: string (optional)
│               ├── platforms: string[]
│               ├── contentFormats: string[]
│               ├── status: "aktif" | "taslak" | "tamamlandı" | "iptal"
│               ├── createdAt: string (ISO)
│               └── updatedAt: string (ISO)
│
└── influencers/
    └── {userId}/
        ├── id: string
        ├── fullName: string
        ├── email: string
        ├── platforms: Array<{id: string, username: string}>
        ├── followerRange: string
        ├── categories: string[]
        ├── verificationPhotoURL: string (optional)
        ├── status: "beklemede" | "onaylandı" | "reddedildi"
        ├── userType: "influencer"
        ├── createdAt: string (ISO)
        └── updatedAt: string (ISO)
```

### Firebase Storage Yapısı

```
infuhub-c5ce7.appspot.com/
├── verification-photos/
│   └── {userId}/
│       └── {timestamp}_{filename}
│
└── campaign-images/
    └── {campaignId}/
        └── {timestamp}_{filename}
```

## 🔧 Kurulum

### 1. Firebase SDK Kurulumu

```bash
npm install firebase
```

### 2. Firebase Konfigürasyonu

Firebase konfigürasyonu `src/config/firebase.ts` dosyasında bulunmaktadır:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAGXh4nB-DI--cUD2y7nsxVBnEZ8KkxA3I",
  authDomain: "infuhub-c5ce7.firebaseapp.com",
  databaseURL: "https://infuhub-c5ce7-default-rtdb.firebaseio.com",
  projectId: "infuhub-c5ce7",
  storageBucket: "infuhub-c5ce7.firebasestorage.app",
  messagingSenderId: "332869931268",
  appId: "1:332869931268:web:627cc14c944d79e3b6c051",
  measurementId: "G-GHLPRT96WS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
```

## 📦 Servisler

### 1. Firebase Auth Service (`src/services/firebaseAuthService.ts`)

#### Marka Kaydı
```typescript
import { registerBrand } from '@/services/firebaseAuthService';

await registerBrand(email, password, {
  brandName: "Örnek Marka",
  industry: "Teknoloji",
  budget: 2,
  website: "https://example.com"
});
```

#### Influencer Kaydı
```typescript
import { registerInfluencer } from '@/services/firebaseAuthService';

await registerInfluencer(email, password, {
  fullName: "Ahmet Yılmaz",
  platforms: [{ id: "instagram", username: "ahmetyilmaz" }],
  followerRange: "10K - 50K",
  categories: ["Moda", "Teknoloji"]
});
```

#### Giriş
```typescript
import { loginUser } from '@/services/firebaseAuthService';

const { user, userData } = await loginUser(email, password);
// userData.userType: "brand" | "influencer"
// userData.status: "beklemede" | "onaylandı" | "reddedildi"
```

#### Çıkış
```typescript
import { logoutUser } from '@/services/firebaseAuthService';

await logoutUser();
```

### 2. Firebase Campaign Service (`src/services/firebaseCampaignService.ts`)

#### Kampanya Oluştur
```typescript
import { createCampaign } from '@/services/firebaseCampaignService';

await createCampaign(brandId, {
  title: "Yeni Ürün Lansmanı",
  productInfo: "Yeni Ürün",
  productDescription: "Detaylı açıklama",
  targetAudience: {
    ageRange: "18-35",
    interests: "Teknoloji, Moda",
    location: "Türkiye"
  },
  budget: {
    total: 50000,
    perInfluencer: 5000
  },
  duration: {
    start: "2026-01-15",
    end: "2026-02-15"
  },
  platforms: ["instagram", "tiktok"],
  contentFormats: ["reel", "story"]
});
```

#### Marka Kampanyalarını Getir
```typescript
import { getBrandCampaigns } from '@/services/firebaseCampaignService';

const campaigns = await getBrandCampaigns(brandId);
```

#### Kampanya Güncelle
```typescript
import { updateCampaign } from '@/services/firebaseCampaignService';

await updateCampaign(brandId, campaignId, {
  title: "Güncellenmiş Başlık",
  status: "aktif"
});
```

#### Kampanya Durumunu Güncelle
```typescript
import { updateCampaignStatus } from '@/services/firebaseCampaignService';

await updateCampaignStatus(brandId, campaignId, "tamamlandı");
```

#### Kampanya İstatistikleri
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

### 3. Firebase Storage Service (`src/services/firebaseStorageService.ts`)

#### Doğrulama Fotoğrafı Yükleme
```typescript
import { uploadVerificationPhoto } from '@/services/firebaseStorageService';

const photoURL = await uploadVerificationPhoto(userId, file);
```

#### Kampanya Görseli Yükleme
```typescript
import { uploadCampaignImage } from '@/services/firebaseStorageService';

const imageURL = await uploadCampaignImage(campaignId, file);
```

## 🔐 Güvenlik Kuralları

### Realtime Database Rules

```json
{
  "rules": {
    "brands": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "influencers": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
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
    match /verification-photos/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /campaign-images/{campaignId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 👨‍💼 Admin Panel

### Firebase Admin Panel (`admin-panel-firebase.html`)

Admin paneli artık Firebase Realtime Database'den veri çeker:

**Özellikler:**
- ✅ Gerçek zamanlı veri senkronizasyonu
- ✅ Marka ve Influencer listesi
- ✅ Durum güncelleme (Onayla/Reddet/Beklemede)
- ✅ İstatistikler
- ✅ Doğrulama fotoğrafı görüntüleme

**Kullanım:**
1. `admin-panel-firebase.html` dosyasını tarayıcıda açın
2. Firebase'den otomatik olarak veriler yüklenecek
3. Durum butonlarıyla kullanıcıları onaylayın/reddedin

## 🚀 Kullanım Akışı

### Marka Kayıt Akışı

1. Kullanıcı `/kayit/marka` sayfasından kayıt olur
2. Firebase Authentication'da kullanıcı oluşturulur
3. Realtime Database'de `brands/{userId}` altına veri kaydedilir
4. Durum otomatik olarak "beklemede" olarak ayarlanır
5. Admin panel'den onay beklenir

### Influencer Kayıt Akışı

1. Kullanıcı `/kayit/influencer` sayfasından kayıt olur
2. Doğrulama fotoğrafı yüklenir (Firebase Storage)
3. Firebase Authentication'da kullanıcı oluşturulur
4. Realtime Database'de `influencers/{userId}` altına veri kaydedilir
5. Fotoğraf URL'i kullanıcı verisine eklenir
6. Durum otomatik olarak "beklemede" olarak ayarlanır
7. Admin panel'den onay beklenir

### Giriş Akışı

1. Kullanıcı `/giris` sayfasından giriş yapar
2. Firebase Authentication ile doğrulama yapılır
3. Realtime Database'den kullanıcı verisi çekilir
4. Durum kontrolü yapılır (onaylandı mı?)
5. UserType'a göre yönlendirme:
   - Marka → `/marka/dashboard`
   - Influencer → `/influencer/dashboard`

## 📊 Veri Yönetimi

### Kullanıcı Durumu Güncelleme (Admin)

```typescript
import { updateUserStatus } from '@/services/firebaseAuthService';

await updateUserStatus(userId, 'brand', 'onaylandı');
await updateUserStatus(userId, 'influencer', 'reddedildi');
```

### Tüm Kullanıcıları Getirme (Admin)

```typescript
import { getAllBrands, getAllInfluencers } from '@/services/firebaseAuthService';

const brands = await getAllBrands();
const influencers = await getAllInfluencers();
```

### Kullanıcı Verisi Getirme

```typescript
import { getUserData } from '@/services/firebaseAuthService';

const userData = await getUserData(userId, 'brand');
const userData = await getUserData(userId, 'influencer');
```

## 🔄 Eski Sistemden Geçiş

### JSON Dosyalarından Firebase'e Veri Aktarımı

Eski sistemdeki JSON dosyalarındaki verileri Firebase'e aktarmak için:

```javascript
// Eski verileri oku
const oldBrands = JSON.parse(localStorage.getItem('brands') || '[]');
const oldInfluencers = JSON.parse(localStorage.getItem('influencers') || '[]');

// Firebase'e aktar
import { ref, set } from 'firebase/database';
import { database } from '@/config/firebase';

oldBrands.forEach(brand => {
  set(ref(database, `brands/${brand.id}`), brand);
});

oldInfluencers.forEach(influencer => {
  set(ref(database, `influencers/${influencer.id}`), influencer);
});
```

## 🐛 Hata Yönetimi

Tüm Firebase işlemleri try-catch bloklarıyla sarılmıştır:

```typescript
try {
  await registerBrand(email, password, brandData);
} catch (error: any) {
  console.error('Kayıt hatası:', error);
  alert(error.message || 'Kayıt sırasında bir hata oluştu');
}
```

## 📝 Notlar

- Firebase Authentication email/password yöntemi kullanılmaktadır
- Realtime Database gerçek zamanlı senkronizasyon sağlar
- Storage'da dosya boyutu limiti 5MB'dır
- Admin panel için özel authentication gerekebilir (gelecekte eklenecek)
- Tüm tarihler ISO 8601 formatında saklanır

## 🔗 Faydalı Linkler

- [Firebase Console](https://console.firebase.google.com/project/infuhub-c5ce7)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Realtime Database](https://firebase.google.com/docs/database)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Storage](https://firebase.google.com/docs/storage)

## ✅ Tamamlanan Özellikler

- ✅ Firebase SDK entegrasyonu
- ✅ Authentication (Email/Password)
- ✅ Realtime Database yapısı
- ✅ Storage entegrasyonu
- ✅ Marka kayıt sistemi
- ✅ Influencer kayıt sistemi
- ✅ Giriş sistemi
- ✅ Admin panel (Firebase versiyonu)
- ✅ Durum yönetimi
- ✅ Doğrulama fotoğrafı yükleme
- ✅ Kampanya oluşturma (Firebase)
- ✅ Kampanya listeleme (Marka bazlı)
- ✅ Kampanya istatistikleri
- ✅ Dashboard metrik entegrasyonu
- ✅ Influencer profil yönetimi
- ✅ Profil fotoğrafı yükleme
- ✅ Sosyal medya hesapları yönetimi
- ✅ İlgi alanları ve fiyatlandırma

## 🔜 Gelecek Özellikler

- ⏳ Admin authentication
- ⏳ Email verification
- ⏳ Password reset
- ⏳ Social login (Google, Facebook)
- ⏳ Kampanya düzenleme
- ⏳ Kampanya silme
- ⏳ Teklif sistemi (Firebase)
- ⏳ Mesajlaşma sistemi (Firestore)
- ⏳ Bildirimler (FCM)


## 👤 Influencer Profil Yönetimi

### Influencer Profile Service (`src/services/firebaseInfluencerService.ts`)

#### Profil Getir
```typescript
import { getInfluencerProfile } from '@/services/firebaseInfluencerService';

const profile = await getInfluencerProfile(influencerId);
```

#### Profil Güncelle
```typescript
import { updateInfluencerProfile } from '@/services/firebaseInfluencerService';

await updateInfluencerProfile(influencerId, {
  fullName: "Ahmet Yılmaz",
  bio: "Moda ve teknoloji influencer'ı",
  categories: ["Moda", "Teknoloji"],
  averageAdPrice: 5000,
  platforms: {
    instagram: { username: "@ahmetyilmaz", followers: 50000 },
    tiktok: { username: "@ahmetyilmaz", followers: 30000 }
  }
});
```

#### Profil Fotoğrafı Yükle
```typescript
import { uploadProfilePhoto } from '@/services/firebaseInfluencerService';

const photoURL = await uploadProfilePhoto(influencerId, file);
```

#### Platform Bilgisi Güncelle
```typescript
import { updatePlatformInfo } from '@/services/firebaseInfluencerService';

await updatePlatformInfo(influencerId, 'instagram', '@kullaniciadi', 50000);
```

#### Platform Sil
```typescript
import { removePlatform } from '@/services/firebaseInfluencerService';

await removePlatform(influencerId, 'instagram');
```

#### İlgi Alanları Güncelle
```typescript
import { updateCategories } from '@/services/firebaseInfluencerService';

await updateCategories(influencerId, ["Moda", "Güzellik", "Teknoloji"]);
```

#### Ortalama Reklam Fiyatı Güncelle
```typescript
import { updateAverageAdPrice } from '@/services/firebaseInfluencerService';

await updateAverageAdPrice(influencerId, 5000);
```

### Profil Veri Yapısı

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

### Firebase Storage Yapısı (Güncellenmiş)

```
infuhub-c5ce7.appspot.com/
├── verification-photos/
│   └── {userId}/
│       └── {timestamp}_{filename}
│
├── profile-photos/
│   └── {influencerId}/
│       └── {timestamp}_{filename}
│
└── campaign-images/
    └── {campaignId}/
        └── {timestamp}_{filename}
```

### Component Kullanımı

#### Influencer Dashboard
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

#### Profile Settings Component
```typescript
import { ProfileSettings } from '@/components/influencer/ProfileSettings';

{activeMenu === 'profile' && influencerId && (
  <ProfileSettings 
    influencerId={influencerId}
    onProfileUpdate={loadProfileData}
  />
)}
```
