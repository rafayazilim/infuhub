# INFUHUB - Genel Teknik Dokümantasyon

Bu doküman, projeye yeni katýlan bir geliþtiricinin kod tabanýný hýzlýca anlayabilmesi için hazýrlanmýþtýr.

## 1) Projenin Kýsa Özeti

INFUHUB, marka ve influencer tarafýný bir araya getiren bir influencer marketing platformudur.

- Marka tarafý: kampanya oluþturur, teklif yönetir, bütçe yükler, influencerlarla mesajlaþýr.
- Influencer tarafý: kampanyalara teklif verir, gelen teklifleri kabul/red eder, içerik teslim eder, kazanç ve çekim süreçlerini yönetir.
- Admin tarafý: marka/influencer doðrulama ve ödeme doðrulama taleplerini yönetir.

## 2) Kullanýlan Teknolojiler

Frontend (`/`):

- React 18 + TypeScript + Vite
- React Router (`src/App.tsx`)
- TanStack Query
- Tailwind CSS + shadcn/ui + Radix UI
- Firebase Web SDK (`auth`, `database`, `storage`, `analytics`)

Backend (`/server`):

- Node.js + Express
- `firebase-admin` (ID token doðrulama için)
- JSON dosya tabanlý legacy veri saklama (`server/data/*.json`)

Firebase:

- Firebase Auth
- Firebase Realtime Database
- Firebase Storage
- Firebase Analytics (client-side)
- Rules dosyalarý:
  - `firebase/database.rules.json`
  - `firebase/storage.rules`

## 3) Dizin ve Modül Haritasý

- `src/pages/*`: sayfalar ve dashboard ekranlarý
- `src/components/*`: UI ve domain componentleri
- `src/services/*`: iþ mantýðý ve Firebase/API eriþim katmaný
- `src/config/firebase.ts`: Firebase init
- `firebase/*`: database/storage rules ve snippetler
- `server/*`: legacy REST API

Özellikle bakýlacak ana servisler:

- Kimlik/doðrulama: `src/services/firebaseAuthService.ts`
- Kampanya: `src/services/firebaseCampaignService.ts`
- Teklif: `src/services/firebaseOfferService.ts`
- Marka cüzdaný: `src/services/firebaseBrandWalletService.ts`
- Influencer ödeme/çekim: `src/services/firebaseInfluencerPayoutService.ts`
- Dosya yükleme: `src/services/firebaseStorageService.ts`
- Profil doðrulama: `src/services/firebaseVerificationService.ts`

## 4) Uygulama Akýþý (Yüksek Seviye)

### 4.1 Auth ve rol belirleme

- Kayýt/giriþ iþlemleri Firebase Auth ile yapýlýr (`firebaseAuthService`).
- Kayýt sonrasý kullanýcýya göre `brands/{uid}` veya `influencers/{uid}` node’u oluþturulur.
- Login sonrasý role göre yönlendirme:
  - Marka: `/marka/dashboard`
  - Influencer: `/influencer/dashboard`
- `status` alaný ile doðrulama durumu (onaylý/beklemede/reddedildi) yönetilir.

### 4.2 Dashboardlar

- Yeni dashboardlar:
  - `src/pages/brand/BrandDashboardNew.tsx`
  - `src/pages/influencer/InfluencerDashboardNew.tsx`
- Eski dashboard route’larý da korunmuþ:
  - `/marka/dashboard-old`
  - `/influencer/dashboard-old`

### 4.3 Teklif ve kampanya döngüsü

- Marka kampanya oluþturur (`firebaseCampaignService`).
- Teklifler `offers` altýnda tutulur (`firebaseOfferService`).
- Teklif kabulünde marka cüzdanýndan otomatik kesinti denenir.
- Ýçerik teslim/onay adýmlarý `offer.contentLink` ve `contentApproved` alanlarýyla yürür.

## 5) Firebase Entegrasyonu

### 5.1 Firebase konfigürasyonu

`src/config/firebase.ts` içinde tek noktadan init edilir:

- `getAuth(app)`
- `getDatabase(app)`
- `getAnalytics(app)`

### 5.2 Realtime Database modeli (özet)

Temel node’lar:

- `brands/{brandId}`
- `influencers/{influencerId}`
- `offers/{offerId}`
- `admins/{uid}`
- `verificationRequests/{brand|influencer}/{uid}`
- `payoutVerificationRequests/influencer/{influencerId}`

Cüzdan/ödeme alanlarý:

- Marka:
  - `brands/{brandId}/walletBalance`
  - `brands/{brandId}/walletLoadedTotal`
  - `brands/{brandId}/walletSpentTotal`
  - `brands/{brandId}/walletTransactions/{txId}`
- Influencer:
  - `influencers/{influencerId}/walletTransactions/{txId}` (içerik onayý sonrasý ödeme geçmiþi)
  - `influencers/{influencerId}/withdrawals/{withdrawalId}`
  - `influencers/{influencerId}/payoutProfile`

### 5.3 Storage yapýsý

Önemli path’ler:

- `profile-photos/{userId}`
- `campaign-images/{brandId}/{campaignId}`
- `offer-contents/{influencerId}/{campaignId}/{offerId}`
- `verification-photos/{userId}`
- `brand-verification-documents/{userId}`
- `payout-tax-docs/{userId}`

## 6) Legacy API Notu (`/server`)

Projede iki yaklaþým birlikte duruyor:

- Yeni yaklaþým: Frontend’in Firebase’e doðrudan yazmasý (aktif kullaným büyük ölçüde burada)
- Legacy yaklaþým: `server/index.js` altýndaki REST endpointleri ve JSON dosya depolama

Ayrýca REST çaðrýlarý için token taþýyan servisler de var (`campaignService.ts`, `offerService.ts`, `trackingLinkService.ts`). Bu katman yeni dashboard akýþlarýnda sýnýrlý/karma kullanýmda.

## 7) Çalýþtýrma

Frontend:

- `npm install`
- `npm run dev`

Test:

- `npm run test`

Backend (legacy gerekiyorsa):

- `cd server`
- `npm install`
- `npm run dev`

## 8) Yeni Geliþtirici için Ýlk Kontrol Listesi

1. `src/App.tsx` route haritasýný oku.
2. `firebaseAuthService`, `firebaseCampaignService`, `firebaseOfferService` dosyalarýný sýrasýyla incele.
3. `BrandDashboardNew` ve `InfluencerDashboardNew` içinde hangi componentin hangi servisi çaðýrdýðýný takip et.
4. `firebase/database.rules.json` ve `firebase/storage.rules` dosyalarýný mutlaka oku.
5. Ödeme süreçleri için ayrýca `README-odeme.md` dosyasýna geç.
6. Güvenlik/token yapýsý için `README-guvenlik-token-entegrasyonu.md` dosyasýna geç.
