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

Backend varsayılan olarak **3001** portunda çalışır.

