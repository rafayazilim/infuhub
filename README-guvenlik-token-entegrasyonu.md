# INFUHUB - Güvenlik ve Token Entegrasyonu

Bu doküman, sistemin kimlik doðrulama, token taþýma, Firebase Rules ve eriþim kontrolü katmanýný açýklar.

## 1) Güvenlik Katmanlarý (Özet)

Projede güvenlik 3 ana katmanda ele alýnýyor:

1. Firebase Authentication (kimlik)
2. Firebase Realtime Database / Storage Rules (veri eriþim yetkisi)
3. Legacy Express API tarafýnda Bearer token doðrulama (`firebase-admin`)

## 2) Auth ve Oturum Yapýsý

Ana dosyalar:

- `src/config/firebase.ts`
- `src/services/firebaseAuthService.ts`
- `src/pages/Login.tsx`

Akýþ:

- Kullanýcý Firebase Auth ile kayýt/giriþ yapar.
- Giriþte email doðrulamasý zorunlu (`EMAIL_NOT_VERIFIED` kontrolü).
- Giriþ sonrasý kullanýcý profili RTDB’den alýnýr (`brands/{uid}` veya `influencers/{uid}`).
- Frontend `localStorage` içine:
  - `user` (profil snapshot’ý)
  - `token` (þu anda `uid` olarak yazýlýyor)
  - `isVerified`

Not:

- API isteklerinde kullanýlan gerçek kimlik doðrulama token’ý `localStorage.token` deðil, Firebase `getIdToken()` çýktýsýdýr.

## 3) Token Entegrasyonu (Frontend -> API)

Ana dosya:

- `src/services/authToken.ts`

Mekanizma:

- `getAuthHeaders()` fonksiyonu:
  - `auth.currentUser` varsa veya kýsa bekleme ile user gelirse
  - `user.getIdToken()` alýr
  - Header döner: `Authorization: Bearer <firebase-id-token>`

Bu header, legacy REST servis katmanýnda kullanýlýr:

- `src/services/campaignService.ts`
- `src/services/offerService.ts`
- `src/services/influencerService.ts`
- `src/services/trackingLinkService.ts`

## 4) Legacy Backend Token Doðrulama

Ana dosyalar:

- `server/index.js`
- `server/utils/firebaseClient.js`

Akýþ:

1. `server/utils/firebaseClient.js` Firebase Admin SDK baþlatýr.
2. `verifyFirebaseAuth` middleware’i Authorization header’dan Bearer token alýr.
3. `admin.auth().verifyIdToken(token)` ile doðrular.
4. Geçerliyse `req.user` set edilir; deðilse `401` döner.

Not:

- Middleware `/api` altýnda uygulanýr.
- Backendde ayrýca rate-limit (özellikle login) mevcuttur.

## 5) Realtime Database Rules Mantýðý

Ana dosya:

- `firebase/database.rules.json`

Genel prensip:

- Global `.read`: `auth != null` (sadece giriþ yapan kullanýcýlar okuyabilir)
- Yazma izinleri node bazlý sahiplik + admin kontrolü ile tanýmlanýr.

### 5.1 Admin node

- `admins/{uid}`:
  - Adminler okuyabilir.
  - Yazma: mevcut admin veya ilk kurulumda `admins` boþsa izin.

### 5.2 Marka alaný

- `brands/{brandId}` yazma:
  - Sadece marka sahibi (`auth.uid == brandId`) veya admin.
- `campaigns/incomingOffers` özel kuralý:
  - Marka, ilgili influencer veya admin yazabilir.
- `walletTransactions`:
  - Marka sahibi veya admin yazabilir.

### 5.3 Influencer alaný

- `influencers/{influencerId}` yazma:
  - Influencer sahibi veya admin.

### 5.4 Teklifler

- `offers/{offerId}` okuma: auth olan herkes
- yazma:
  - Offer içindeki `brandId` veya `influencerId` ile eþleþen kullanýcý
  - veya admin

### 5.5 Doðrulama talepleri

- `verificationRequests/{brand|influencer}/{uid}`
  - Ýlgili kullanýcý veya admin okuyup yazabilir.

### 5.6 Ödeme doðrulama talepleri

- `payoutVerificationRequests/influencer`
  - Liste okuma admin’e açýk
  - Tek kayýt okuma/yazma influencer sahibi veya admin

## 6) Storage Rules Mantýðý

Ana dosya:

- `firebase/storage.rules`

Özet kurallar:

- Profil/kampanya medyasý: auth gerekir, yazma çoðunlukla dosya sahibine kýsýtlýdýr.
- `offer-contents/...`: yazma influencer sahibine, okuma auth kullanýcýlarýna.
- Doðrulama belgeleri (`verification-photos`, `brand-verification-documents`): sahibi okur/yazar.
- `payout-tax-docs/{userId}`:
  - Yazma sadece dosya sahibi
  - boyut < 20MB
  - tür: image/* veya PDF
  - okuma/silme sadece sahibi
- Tanýmsýz tüm path’ler tamamen kapalý (`allow read, write: if false`).

## 7) Uygulama Davranýþýnda Güvenlik Ýlgili Kritik Notlar

1. `localStorage.token` alaný UID tutuyor; JWT deðil.
- Güvenlik kritik kararlar için kullanýlmamalý.

2. `server/index.js` içindeki public route check fonksiyonu path’i `/auth/login` gibi kontrol ediyor.
- Middleware `/api` altýnda çalýþtýðý için gerçek path ile eþleþme dikkatle doðrulanmalý.

3. `firebaseOfferService.approveContent` içinde `auth.currentUser === offer.influencerId` kontrolü var.
- Brand paneli onay akýþýnda bu kontrol ödeme yazýmlarýný erken kesebiliyor.
- Finansal state tutarlýlýðý için gözden geçirilmeli.

4. `admins` ilk kurulum kuralý (`!root.child('admins').exists()`) bootstrap için pratik ama dikkat gerektirir.
- Ýlk admin oluþturma süreci kontrollü yapýlmalý.

## 8) Operasyonel Öneriler (Kýsa)

1. Kritik ödeme yazýmlarýný mümkünse backend (Admin SDK / transaction) tarafýnda merkezileþtirin.
2. Rule testlerini emülatör ile otomatikleþtirin (izinli/izinsiz senaryolar).
3. `localStorage`’daki role/verification bilgilerini UI cache olarak tutup, yetki kararýný her zaman Auth + Rules ile verin.
4. API public route eþleþmelerini netleþtirip testleyin.
