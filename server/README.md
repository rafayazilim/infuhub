# İNFUHUB Backend API

## Kurulum

```bash
cd server
npm install
```

## Çalıştırma

```bash
npm start
# veya development için
npm run dev
```

## API Endpoint'leri

### Marka Kaydı
```
POST /api/brands/register
Body: {
  "brandName": "string",
  "email": "string",
  "password": "string",
  "industry": "string",
  "budget": number,
  "website": "string (opsiyonel)"
}
```

### Influencer Kaydı
```
POST /api/influencers/register
Content-Type: multipart/form-data
Body: {
  "fullName": "string",
  "email": "string",
  "password": "string",
  "platforms": "string (JSON array)",
  "followerRange": "string",
  "categories": "string (JSON array)",
  "verificationPhoto": file
}
```

### Markaları Getir
```
GET /api/brands
```

### Influencer'ları Getir
```
GET /api/influencers
```

### Marka Durumunu Güncelle
```
PATCH /api/brands/:id/status
Body: {
  "status": "beklemede" | "onaylandı" | "reddedildi"
}
```

### Influencer Durumunu Güncelle
```
PATCH /api/influencers/:id/status
Body: {
  "status": "beklemede" | "onaylandı" | "reddedildi"
}
```

## Port

Backend varsayılan olarak `PORT` ile belirlenir (ör. `server/.env` içinde `PORT=3002`).

## E-posta (Google Workspace SMTP)

Transactional e-postalar (kayıt doğrulama, şifre sıfırlama, marka/influencer onay ve ret, ödeme doğrulama vb.) **Nodemailer** ile `server/services/mailService.js` üzerinden tek transporter ile gider. HTML şablonları `server/services/mail/` altında merkezidir: `renderEmailLayout.js`, `designTokens.js`, `templates/*`.

Logo (üst header): `INFUHUB_LOGO_URL` (mutlak HTTPS) tanımlı değilse e-posta **INFU**+**HUB** iki tonlu metin logo kullanır.

Gerekli ortam değişkenleri — ayrıntılar ve örnek değerler için `server/.env.example`:

- `SMTP_HOST` (ör. `smtp.gmail.com`)
- `SMTP_PORT` (ör. `465`)
- `SMTP_SECURE` (`true` / `false` string)
- `SMTP_USER` (Google Workspace hesabı, örn. `no-reply@infuhub.ai`)
- `SMTP_PASS` (Google **uygulama şifresi**; repoda ve loglarda tutulmamalı)
- `MAIL_FROM_EMAIL` (görünen gönderen adresi; genelde `SMTP_USER` ile aynı)
- `MAIL_FROM_NAME` (ör. `INFUHUB`)

Uygulama başlarken eksik değişkenler `console.warn` ile bildirilir; süreç bilinçli olarak sonlandırılmaz.

İsteğe bağlı test: `ENABLE_TEST_EMAIL_ENDPOINT=true` iken `POST /api/admin/test-email` + `Authorization: Bearer <Firebase ID token>` ve JSON gövde `{ "to": "..." }`.

