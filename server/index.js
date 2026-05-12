const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { generateUniqueId } = require('./utils/idGenerator');
const { admin } = require('./utils/firebaseClient');
const adminRoutes = require('./routes/admin');
const adminPendingEmailRoutes = require('./routes/adminPendingEmail');
const passwordResetRoutes = require('./routes/passwordReset');
const registrationVerificationRoutes = require('./routes/registrationVerification');
const transactionalEventsRoutes = require('./routes/transactionalEvents');
const { getTrackingBaseUrl } = require('./utils/siteOrigin');
const { logSmtpConfigurationWarningsOnStartup } = require('./services/mailService');

logSmtpConfigurationWarningsOnStartup();

const app = express();

const corsAllowedOrigins = new Set([
  'https://infuhub.ai',
  'https://www.infuhub.ai',
  'https://infuhub.cloud',
  'https://www.infuhub.cloud',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
]);
const PORT = process.env.PORT || 3002;

/**
 * Ters proxy arkasındaki gerçek istemci IP'si için. `true` kullanmayın: express-rate-limit
 * ERR_ERL_PERMISSIVE_TRUST_PROXY uyarısı verir ve X-Forwarded-For kolayca sahtelenebilir.
 * Tek katman nginx/Cloudflare: 1. Yerel doğrudan Node: TRUST_PROXY_HOPS=0
 */
(() => {
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw === "0" || raw === "false") {
    app.set("trust proxy", false);
    return;
  }
  const n = raw !== undefined && raw !== "" ? parseInt(raw, 10) : 1;
  app.set("trust proxy", Number.isFinite(n) && n >= 1 ? n : 1);
})();

// Middleware — üretim: infuhub.ai; geçiş: infuhub.cloud; geliştirme: localhost
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsAllowedOrigins.has(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/** Şifre sıfırlama (SMTP kodu + Firebase Admin) — kimlik doğrulaması gerektirmez */
app.use('/auth', passwordResetRoutes);
const isPublicRoute = (req) => {
  if (req.method === 'POST' && req.path === '/auth/login') return true;
  /** /api altında aynı router: hosting sadece /api -> Node proxy edebilir */
  if (req.method === 'POST' && req.path.startsWith('/auth/forgot-password')) return true;
  if (req.method === 'POST' && req.path === '/brands/register') return true;
  if (req.method === 'POST' && req.path === '/influencers/register') return true;
  if (req.method === 'GET' && req.path.startsWith('/tracking-links/offer/')) return true;
  /** Kayıt e-posta doğrulama (kod) — Bearer gerekmez */
  if (
    req.method === 'POST' &&
    (req.path?.includes('/auth/register/verify-email') || String(req.originalUrl || '').includes('/auth/register/verify-email'))
  ) {
    return true;
  }
  return false;
};

const verifyFirebaseAuth = async (req, res, next) => {
  if (isPublicRoute(req)) return next();

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Yetkisiz erişim' });
  }

  try {
    const token = authHeader.substring('Bearer '.length);
    req.user = await admin.auth().verifyIdToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Geçersiz token' });
  }
};

// /api altındaki endpointler için auth doğrulama
app.use('/api', verifyFirebaseAuth);
app.use('/api/auth', passwordResetRoutes);
app.use('/api/auth', registrationVerificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminPendingEmailRoutes);
app.use('/api/transactional-events', transactionalEventsRoutes);

// Login brute-force korumasÄ±
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 20, // 15 dakika iÃ§inde max 20 deneme
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çok fazla deneme. Lütfen 15 dakika sonra tekrar deneyin!',
  },
});

// Dosya yÃ¼kleme ayarlarÄ±
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece JPG, JPEG ve PNG dosyalarÄ± yÃ¼klenebilir!'), false);
    }
  }
});

// JSON dosyalarÄ±nÄ±n yollarÄ±
const BRANDS_FILE = path.join(__dirname, 'data', 'brands.json');
const INFLUENCERS_FILE = path.join(__dirname, 'data', 'influencers.json');
const CAMPAIGNS_FILE = path.join(__dirname, 'data', 'campaigns.json');
const OFFERS_FILE = path.join(__dirname, 'data', 'offers.json');
const CONTENTS_FILE = path.join(__dirname, 'data', 'contents.json');
const MESSAGES_FILE = path.join(__dirname, 'data', 'messages.json');
const CONVERSATIONS_FILE = path.join(__dirname, 'data', 'conversations.json');
const NOTIFICATIONS_FILE = path.join(__dirname, 'data', 'notifications.json');

// JSON dosyasÄ±nÄ± okuma fonksiyonu
async function readJSONFile(filePath) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// JSON dosyasÄ±na yazma fonksiyonu
async function writeJSONFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Ana sayfa
app.get('/', (req, res) => {
  res.json({ message: 'Ä°NFUHUB API Ã‡alÄ±ÅŸÄ±yor!' });
});

// Login endpoint
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'E-posta ve ÅŸifre gerekli!' 
      });
    }

    // Check in brands
    const brands = await readJSONFile(BRANDS_FILE);
    const brand = brands.find(b => b.email === email && b.password === password);

    if (brand) {
      if (brand.status !== 'onayland\u0131') {
        return res.status(403).json({ 
          success: false, 
          message: 'HesabÄ±nÄ±z henÃ¼z onaylanmamÄ±ÅŸ!' 
        });
      }

      return res.json({ 
        success: true, 
        message: 'GiriÅŸ baÅŸarÄ±lÄ±!',
        user: {
          id: brand.id,
          email: brand.email,
          name: brand.brandName,
          userType: 'brand',
          industry: brand.industry,
          budget: brand.budget,
          website: brand.website
        }
      });
    }

    // Check in influencers
    const influencers = await readJSONFile(INFLUENCERS_FILE);
    const influencer = influencers.find(i => i.email === email && i.password === password);

    if (influencer) {
      if (influencer.status !== 'onayland\u0131') {
        return res.status(403).json({ 
          success: false, 
          message: 'HesabÄ±nÄ±z henÃ¼z onaylanmamÄ±ÅŸ!' 
        });
      }

      return res.json({ 
        success: true, 
        message: 'GiriÅŸ baÅŸarÄ±lÄ±!',
        user: {
          id: influencer.id,
          email: influencer.email,
          name: influencer.fullName,
          userType: 'influencer',
          platforms: influencer.platforms,
          followerRange: influencer.followerRange,
          categories: influencer.categories
        }
      });
    }

    return res.status(401).json({ 
      success: false, 
      message: 'E-posta veya ÅŸifre hatalÄ±!' 
    });
  } catch (error) {
    console.error('Login hatasÄ±:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatasÄ± oluÅŸtu!' 
    });
  }
});


// Marka kaydÄ±
app.post('/api/brands/register', async (req, res) => {
  try {
    const { brandName, email, password, industry, budget, website } = req.body;

    // Validasyon
    if (!brandName || !email || !password || !industry) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gerekli alanlarÄ± doldurun!' 
      });
    }

    const brands = await readJSONFile(BRANDS_FILE);

    // Email kontrolÃ¼
    const emailExists = brands.some(brand => brand.email === email);
    if (emailExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu e-posta adresi zaten kayÄ±tlÄ±!' 
      });
    }

    const newBrand = {
      id: generateUniqueId(),
      brandName,
      email,
      password, // GerÃ§ek uygulamada hashlenmelidir!
      industry,
      budget,
      website: website || '',
      status: 'beklemede',
      createdAt: new Date().toISOString()
    };

    brands.push(newBrand);
    await writeJSONFile(BRANDS_FILE, brands);

    res.status(201).json({ 
      success: true, 
      message: 'Marka kaydÄ± baÅŸarÄ±yla oluÅŸturuldu!',
      data: { id: newBrand.id, email: newBrand.email }
    });
  } catch (error) {
    console.error('Marka kaydÄ± hatasÄ±:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatasÄ± oluÅŸtu!' 
    });
  }
});

// Influencer kaydÄ±
app.post('/api/influencers/register', upload.single('verificationPhoto'), async (req, res) => {
  try {
    const { fullName, email, password, platforms, followerRange, categories } = req.body;

    // Validasyon
    if (!fullName || !email || !password || !platforms || !followerRange || !categories) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gerekli alanlarÄ± doldurun!' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'DoÄŸrulama fotoÄŸrafÄ± yÃ¼klemeniz gerekiyor!' 
      });
    }

    const influencers = await readJSONFile(INFLUENCERS_FILE);

    // Email kontrolÃ¼
    const emailExists = influencers.some(inf => inf.email === email);
    if (emailExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu e-posta adresi zaten kayÄ±tlÄ±!' 
      });
    }

    const newInfluencer = {
      id: generateUniqueId(),
      fullName,
      email,
      password, // GerÃ§ek uygulamada hashlenmelidir!
      platforms: JSON.parse(platforms),
      followerRange,
      categories: JSON.parse(categories),
      verificationPhoto: `/uploads/${req.file.filename}`,
      status: 'beklemede',
      createdAt: new Date().toISOString()
    };

    influencers.push(newInfluencer);
    await writeJSONFile(INFLUENCERS_FILE, influencers);

    res.status(201).json({ 
      success: true, 
      message: 'Influencer kaydÄ± baÅŸarÄ±yla oluÅŸturuldu!',
      data: { id: newInfluencer.id, email: newInfluencer.email }
    });
  } catch (error) {
    console.error('Influencer kaydÄ± hatasÄ±:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatasÄ± oluÅŸtu!' 
    });
  }
});

// TÃ¼m markalarÄ± getir
app.get('/api/brands', async (req, res) => {
  try {
    const brands = await readJSONFile(BRANDS_FILE);
    res.json({ success: true, data: brands });
  } catch (error) {
    console.error('Markalar getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// TÃ¼m influencer'larÄ± getir
app.get('/api/influencers', async (req, res) => {
  try {
    const influencers = await readJSONFile(INFLUENCERS_FILE);
    res.json({ success: true, data: influencers });
  } catch (error) {
    console.error('Influencer\'lar getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Marka durumunu gÃ¼ncelle
app.patch('/api/brands/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['beklemede', 'onayland\u0131', 'reddedildi'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'GeÃ§ersiz durum!' 
      });
    }

    const brands = await readJSONFile(BRANDS_FILE);
    const brandIndex = brands.findIndex(b => b.id === id);

    if (brandIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Marka bulunamadÄ±!' 
      });
    }

    brands[brandIndex].status = status;
    brands[brandIndex].updatedAt = new Date().toISOString();
    await writeJSONFile(BRANDS_FILE, brands);

    res.json({ 
      success: true, 
      message: 'Durum gÃ¼ncellendi!',
      data: brands[brandIndex]
    });
  } catch (error) {
    console.error('Durum gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Influencer durumunu gÃ¼ncelle
app.patch('/api/influencers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['beklemede', 'onayland\u0131', 'reddedildi'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'GeÃ§ersiz durum!' 
      });
    }

    const influencers = await readJSONFile(INFLUENCERS_FILE);
    const influencerIndex = influencers.findIndex(inf => inf.id === id);

    if (influencerIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Influencer bulunamadÄ±!' 
      });
    }

    influencers[influencerIndex].status = status;
    influencers[influencerIndex].updatedAt = new Date().toISOString();
    await writeJSONFile(INFLUENCERS_FILE, influencers);

    res.json({ 
      success: true, 
      message: 'Durum gÃ¼ncellendi!',
      data: influencers[influencerIndex]
    });
  } catch (error) {
    console.error('Durum gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// ==================== TRACKING LINK ENDPOINTS ====================

const { createTrackingLink, getTrackingLink, getTrackingLinkByOfferId } = require('./services/trackingLinkService');
const { recordClick, getClickCountByOfferId } = require('./services/clickService');

// Tracking link oluÅŸtur
app.post('/api/tracking-links', async (req, res) => {
  try {
    const { offerId, targetUrl, platform = 'instagram' } = req.body;

    if (!offerId || !targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'offerId ve targetUrl gerekli!',
      });
    }

    // URL validasyonu
    try {
      new URL(targetUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'GeÃ§erli bir URL girin!',
      });
    }

    const result = await createTrackingLink(offerId, targetUrl, platform);

    res.json({
      success: true,
      message: 'Tracking link baÅŸarÄ±yla oluÅŸturuldu!',
      data: result,
    });
  } catch (error) {
    console.error('Tracking link oluÅŸturma hatasÄ±:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Tracking link oluÅŸturulurken bir hata oluÅŸtu!',
    });
  }
});

// Offer'a ait tracking link'i getir
app.get('/api/tracking-links/offer/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    const trackingLink = await getTrackingLinkByOfferId(offerId);

    if (!trackingLink) {
      return res.json({
        success: true,
        data: null,
        message: 'Tracking link bulunamadı',
      });
    }

    // Click sayÄ±sÄ±nÄ± da ekle
    const clickCount = await getClickCountByOfferId(offerId);
    
    // Tracking URL'i ekle
    const baseUrl = getTrackingBaseUrl();
    const trackingUrl = `${baseUrl}/c/${trackingLink.shortCode}`;

    res.json({
      success: true,
      data: {
        ...trackingLink,
        clickCount,
        trackingUrl,
      },
    });
  } catch (error) {
    console.error('Tracking link getirme hatasÄ±:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Tracking link getirilirken bir hata oluÅŸtu!',
    });
  }
});

// Redirect endpoint - Tracking link'e tÄ±klama
app.get('/c/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Tracking link'i bul
    const trackingLink = await getTrackingLink(shortCode);

    if (!trackingLink) {
      return res.status(404).send('Link bulunamadÄ±');
    }

    // Link aktif deÄŸilse
    if (!trackingLink.isActive) {
      return res.status(404).send('Link aktif deÄŸil');
    }

    // Click bilgilerini topla
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const referrer = req.headers.referer || req.headers.referrer || '';

    // Click kaydÄ± oluÅŸtur (async - blocking olmadan)
    // ArtÄ±k clicks tracking_links altÄ±nda tutuluyor
    recordClick(shortCode, {
      source: trackingLink.platform,
      ip,
      userAgent,
      referrer,
    }).catch((error) => {
      console.error('Click kaydÄ± hatasÄ± (non-blocking):', error);
    });

    // 302 Redirect
    res.redirect(302, trackingLink.targetUrl);
  } catch (error) {
    console.error('Redirect hatasÄ±:', error);
    res.status(500).send('Bir hata oluÅŸtu');
  }
});

// ==================== KAMPANYA ENDPOINTS ====================

// Kampanya oluÅŸtur
app.post('/api/campaigns/create', async (req, res) => {
  try {
    const { brandId, productInfo, duration, targetAudience, budget, platforms, contentFormats } = req.body;

    // Validate required fields with trimmed values
    if (!brandId || !productInfo?.trim() || !duration || !targetAudience?.trim() || !budget) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gerekli alanlarÄ± doldurun!' 
      });
    }

    // Validate budget is positive
    if (budget <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'BÃ¼tÃ§e 0\'dan bÃ¼yÃ¼k olmalÄ±dÄ±r!' 
      });
    }

    // Validate platforms array
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'En az bir platform seÃ§melisiniz!' 
      });
    }

    // Validate contentFormats array
    if (!contentFormats || !Array.isArray(contentFormats) || contentFormats.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'En az bir iÃ§erik formatÄ± seÃ§melisiniz!' 
      });
    }

    const campaigns = await readJSONFile(CAMPAIGNS_FILE);

    const newCampaign = {
      id: generateUniqueId(),
      brandId,
      productInfo,
      duration,
      targetAudience,
      budget,
      platforms: platforms || [],
      contentFormats: contentFormats || [],
      status: 'aktif',
      createdAt: new Date().toISOString(),
      matchedInfluencers: []
    };

    campaigns.push(newCampaign);
    await writeJSONFile(CAMPAIGNS_FILE, campaigns);

    res.status(201).json({ 
      success: true, 
      message: 'Kampanya baÅŸarÄ±yla oluÅŸturuldu!',
      data: newCampaign
    });
  } catch (error) {
    console.error('Kampanya oluÅŸturma hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Marka kampanyalarÄ±nÄ± getir
app.get('/api/campaigns/brand/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const brandCampaigns = campaigns.filter(c => c.brandId === brandId);
    
    res.json({ success: true, data: brandCampaigns });
  } catch (error) {
    console.error('Kampanyalar getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Kampanya detayÄ± getir
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const campaign = campaigns.find(c => c.id === id);
    
    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kampanya bulunamadÄ±!' 
      });
    }

    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Kampanya getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Kampanya gÃ¼ncelle
app.put('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { productInfo, duration, targetAudience, budget, platforms, contentFormats, title, description } = req.body;

    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const campaignIndex = campaigns.findIndex(c => c.id === id);

    if (campaignIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kampanya bulunamadÄ±!' 
      });
    }

    // Update campaign
    campaigns[campaignIndex] = {
      ...campaigns[campaignIndex],
      title: title || campaigns[campaignIndex].title,
      productInfo: productInfo || campaigns[campaignIndex].productInfo,
      duration: duration || campaigns[campaignIndex].duration,
      targetAudience: targetAudience || campaigns[campaignIndex].targetAudience,
      budget: budget !== undefined ? budget : campaigns[campaignIndex].budget,
      platforms: platforms || campaigns[campaignIndex].platforms,
      contentFormats: contentFormats || campaigns[campaignIndex].contentFormats,
      description: description !== undefined ? description : campaigns[campaignIndex].description,
      updatedAt: new Date().toISOString()
    };

    await writeJSONFile(CAMPAIGNS_FILE, campaigns);

    res.json({ 
      success: true, 
      message: 'Kampanya gÃ¼ncellendi!',
      data: campaigns[campaignIndex]
    });
  } catch (error) {
    console.error('Kampanya gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Kampanya sil (soft delete)
app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const offers = await readJSONFile(OFFERS_FILE);
    
    const campaignIndex = campaigns.findIndex(c => c.id === id);

    if (campaignIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kampanya bulunamadÄ±!' 
      });
    }

    // Soft delete campaign
    campaigns[campaignIndex].deletedAt = new Date().toISOString();
    campaigns[campaignIndex].status = 'iptal';
    campaigns[campaignIndex].updatedAt = new Date().toISOString();

    // Update related offers
    const campaignOffers = offers.filter(o => o.campaignId === id);
    campaignOffers.forEach(offer => {
      if (offer.status === 'beklemede') {
        offer.status = 'iptal';
        offer.updatedAt = new Date().toISOString();
      }
    });

    await writeJSONFile(CAMPAIGNS_FILE, campaigns);
    await writeJSONFile(OFFERS_FILE, offers);

    res.json({ 
      success: true, 
      message: 'Kampanya silindi!',
      data: campaigns[campaignIndex]
    });
  } catch (error) {
    console.error('Kampanya silme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Kampanya durumunu gÃ¼ncelle
app.patch('/api/campaigns/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['aktif', 'tamamlandÄ±', 'iptal', 'taslak'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'GeÃ§ersiz durum!' 
      });
    }

    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const campaignIndex = campaigns.findIndex(c => c.id === id);

    if (campaignIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kampanya bulunamadÄ±!' 
      });
    }

    campaigns[campaignIndex].status = status;
    campaigns[campaignIndex].updatedAt = new Date().toISOString();
    await writeJSONFile(CAMPAIGNS_FILE, campaigns);

    res.json({ 
      success: true, 
      message: 'Kampanya durumu gÃ¼ncellendi!',
      data: campaigns[campaignIndex]
    });
  } catch (error) {
    console.error('Durum gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Kampanya iÃ§in uygun influencer'larÄ± getir
app.get('/api/campaigns/:id/matched-influencers', async (req, res) => {
  try {
    const { id } = req.params;
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const influencers = await readJSONFile(INFLUENCERS_FILE);
    
    const campaign = campaigns.find(c => c.id === id);
    
    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kampanya bulunamadÄ±!' 
      });
    }

    // Sadece onaylanmÄ±ÅŸ influencer'larÄ± filtrele
    const matchedInfluencers = influencers.filter(inf => {
      if (inf.status !== 'onayland\u0131') return false;
      
      // Platform eÅŸleÅŸmesi kontrolÃ¼
      if (campaign.platforms && campaign.platforms.length > 0) {
        const hasMatchingPlatform = inf.platforms.some(p => 
          campaign.platforms.includes(p.id)
        );
        if (!hasMatchingPlatform) return false;
      }

      // Kategori eÅŸleÅŸmesi kontrolÃ¼
      if (campaign.targetAudience && inf.categories) {
        const hasMatchingCategory = inf.categories.some(c => 
          campaign.targetAudience.toLowerCase().includes(c.toLowerCase()) ||
          c.toLowerCase().includes(campaign.targetAudience.toLowerCase())
        );
        if (!hasMatchingCategory) return false;
      }

      return true;
    });

    res.json({ success: true, data: matchedInfluencers });
  } catch (error) {
    console.error('EÅŸleÅŸen influencer\'lar getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// ==================== TEKLÄ°F ENDPOINTS ====================

// Teklif gÃ¶nder
app.post('/api/offers/send', async (req, res) => {
  try {
    const { campaignId, brandId, influencerId, price, contentFormat, deliveryDate, campaignLink, notes } = req.body;

    if (!campaignId || !brandId || !influencerId || !price || !contentFormat || !deliveryDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gerekli alanlarÄ± doldurun!' 
      });
    }

    const offers = await readJSONFile(OFFERS_FILE);

    const newOffer = {
      id: generateUniqueId(),
      campaignId,
      brandId,
      influencerId,
      price,
      contentFormat,
      deliveryDate,
      campaignLink: campaignLink || '',
      notes: notes || '',
      status: 'beklemede',
      createdAt: new Date().toISOString()
    };

    offers.push(newOffer);
    await writeJSONFile(OFFERS_FILE, offers);

    // Create notification for influencer
    await createNotification(
      influencerId,
      'influencer',
      'offer_response',
      'Yeni Teklif',
      'Size yeni bir teklif geldi.',
      `/offers/${newOffer.id}`
    );

    res.status(201).json({ 
      success: true, 
      message: 'Teklif baÅŸarÄ±yla gÃ¶nderildi!',
      data: newOffer
    });
  } catch (error) {
    console.error('Teklif gÃ¶nderme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Influencer'a gelen teklifleri getir
app.get('/api/offers/influencer/:influencerId', async (req, res) => {
  try {
    const { influencerId } = req.params;
    const offers = await readJSONFile(OFFERS_FILE);
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const brands = await readJSONFile(BRANDS_FILE);
    
    const influencerOffers = offers.filter(o => o.influencerId === influencerId);
    
    // Enrich offers with campaign and brand info
    const enrichedOffers = influencerOffers.map(offer => {
      const campaign = campaigns.find(c => c.id === offer.campaignId);
      const brand = brands.find(b => b.id === offer.brandId);
      
      return {
        ...offer,
        campaign: campaign || null,
        brand: brand ? { id: brand.id, name: brand.brandName } : null
      };
    });

    res.json({ success: true, data: enrichedOffers });
  } catch (error) {
    console.error('Teklifler getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Teklif durumunu gÃ¼ncelle (kabul/red)
app.patch('/api/offers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['beklemede', 'kabul', 'red'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'GeÃ§ersiz durum!' 
      });
    }

    const offers = await readJSONFile(OFFERS_FILE);
    const offerIndex = offers.findIndex(o => o.id === id);

    if (offerIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teklif bulunamadÄ±!' 
      });
    }

    const offer = offers[offerIndex];
    offers[offerIndex].status = status;
    offers[offerIndex].updatedAt = new Date().toISOString();
    offers[offerIndex].respondedAt = new Date().toISOString();
    await writeJSONFile(OFFERS_FILE, offers);

    // Create notification for brand
    const notificationMessages = {
      kabul: 'Teklifiniz kabul edildi!',
      red: 'Teklifiniz reddedildi.'
    };

    if (status !== 'beklemede') {
      await createNotification(
        offer.brandId,
        'brand',
        'offer_response',
        'Teklif YanÄ±tÄ±',
        notificationMessages[status],
        `/offers/${id}`
      );
    }

    res.json({ 
      success: true, 
      message: 'Teklif durumu gÃ¼ncellendi!',
      data: offers[offerIndex]
    });
  } catch (error) {
    console.error('Teklif gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Marka'nÄ±n gÃ¶nderdiÄŸi teklifleri getir
app.get('/api/offers/brand/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const offers = await readJSONFile(OFFERS_FILE);
    const influencers = await readJSONFile(INFLUENCERS_FILE);
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    
    const brandOffers = offers.filter(o => o.brandId === brandId);
    
    // Enrich offers
    const enrichedOffers = brandOffers.map(offer => {
      const influencer = influencers.find(i => i.id === offer.influencerId);
      const campaign = campaigns.find(c => c.id === offer.campaignId);
      
      return {
        ...offer,
        influencer: influencer ? { 
          id: influencer.id, 
          name: influencer.fullName,
          platforms: influencer.platforms,
          followerRange: influencer.followerRange
        } : null,
        campaign: campaign || null
      };
    });

    res.json({ success: true, data: enrichedOffers });
  } catch (error) {
    console.error('Teklifler getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Helper function for creating notifications
async function createNotification(userId, userType, type, title, message, actionUrl = null) {
  const notifications = await readJSONFile(NOTIFICATIONS_FILE);
  const notification = {
    id: generateUniqueId(),
    userId,
    userType,
    type,
    title,
    message,
    actionUrl,
    read: false,
    createdAt: new Date().toISOString()
  };
  notifications.push(notification);
  await writeJSONFile(NOTIFICATIONS_FILE, notifications);
  return notification;
}

// ==================== CONTENT ENDPOINTS ====================

// Upload content
app.post('/api/contents/upload', async (req, res) => {
  try {
    const { offerId, campaignId, influencerId, brandId, type, url, description } = req.body;

    if (!offerId || !campaignId || !influencerId || !brandId || !type || !url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gerekli alanlarÄ± doldurun!' 
      });
    }

    const contents = await readJSONFile(CONTENTS_FILE);

    const newContent = {
      id: generateUniqueId(),
      offerId,
      campaignId,
      influencerId,
      brandId,
      type,
      url,
      description: description || '',
      status: 'onay_bekliyor',
      uploadedAt: new Date().toISOString()
    };

    contents.push(newContent);
    await writeJSONFile(CONTENTS_FILE, contents);

    // Create notification for brand
    await createNotification(
      brandId,
      'brand',
      'content_approval',
      'Yeni Ä°Ã§erik OnayÄ±',
      'Bir influencer yeni iÃ§erik yÃ¼kledi.',
      `/content/${newContent.id}`
    );

    res.status(201).json({ 
      success: true, 
      message: 'Ä°Ã§erik baÅŸarÄ±yla yÃ¼klendi!',
      data: newContent
    });
  } catch (error) {
    console.error('Ä°Ã§erik yÃ¼kleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Get brand contents
app.get('/api/contents/brand/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const contents = await readJSONFile(CONTENTS_FILE);
    const influencers = await readJSONFile(INFLUENCERS_FILE);
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    
    const brandContents = contents.filter(c => c.brandId === brandId);
    
    // Enrich contents
    const enrichedContents = brandContents.map(content => {
      const influencer = influencers.find(i => i.id === content.influencerId);
      const campaign = campaigns.find(c => c.id === content.campaignId);
      
      return {
        ...content,
        influencer: influencer ? { id: influencer.id, name: influencer.fullName } : null,
        campaign: campaign ? { id: campaign.id, title: campaign.productInfo } : null
      };
    });

    res.json({ success: true, data: enrichedContents });
  } catch (error) {
    console.error('Ä°Ã§erikler getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Get content by ID
app.get('/api/contents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contents = await readJSONFile(CONTENTS_FILE);
    const content = contents.find(c => c.id === id);
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ä°Ã§erik bulunamadÄ±!' 
      });
    }

    res.json({ success: true, data: content });
  } catch (error) {
    console.error('Ä°Ã§erik getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Review content (approve, request revision, reject)
app.patch('/api/contents/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!['approve', 'request_revision', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'GeÃ§ersiz aksiyon!' 
      });
    }

    const contents = await readJSONFile(CONTENTS_FILE);
    const contentIndex = contents.findIndex(c => c.id === id);

    if (contentIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ä°Ã§erik bulunamadÄ±!' 
      });
    }

    const content = contents[contentIndex];
    const statusMap = {
      approve: 'onayland\u0131',
      request_revision: 'revizyon_gerekli',
      reject: 'reddedildi'
    };

    contents[contentIndex].status = statusMap[action];
    contents[contentIndex].reviewedAt = new Date().toISOString();
    
    if (action === 'request_revision') {
      contents[contentIndex].revisionNotes = notes || '';
    } else if (action === 'reject') {
      contents[contentIndex].rejectionReason = notes || '';
    }

    await writeJSONFile(CONTENTS_FILE, contents);

    // Create notification for influencer
    const notificationMessages = {
      approve: 'Ä°Ã§eriÄŸiniz onayland\u0131!',
      request_revision: 'Ä°Ã§eriÄŸiniz iÃ§in revizyon talep edildi.',
      reject: 'Ä°Ã§eriÄŸiniz reddedildi.'
    };

    await createNotification(
      content.influencerId,
      'influencer',
      'content_approval',
      'Ä°Ã§erik Durumu',
      notificationMessages[action],
      `/content/${id}`
    );

    res.json({ 
      success: true, 
      message: 'Ä°Ã§erik durumu gÃ¼ncellendi!',
      data: contents[contentIndex]
    });
  } catch (error) {
    console.error('Ä°Ã§erik gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// ==================== MESSAGE ENDPOINTS ====================

// Get conversations for a user
app.get('/api/messages/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query;
    
    const conversations = await readJSONFile(CONVERSATIONS_FILE);
    const messages = await readJSONFile(MESSAGES_FILE);
    const brands = await readJSONFile(BRANDS_FILE);
    const influencers = await readJSONFile(INFLUENCERS_FILE);
    
    // Filter conversations for this user
    const userConversations = conversations.filter(c => {
      if (userType === 'brand') {
        return c.brandId === userId && !c.archived;
      } else {
        return c.influencerId === userId && !c.archived;
      }
    });

    // Enrich with last message and other user info
    const enrichedConversations = userConversations.map(conv => {
      const convMessages = messages.filter(m => m.conversationId === conv.id);
      const lastMessage = convMessages.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];
      
      const unreadCount = convMessages.filter(m => 
        !m.read && m.senderId !== userId
      ).length;

      let otherUser = null;
      if (userType === 'brand') {
        const influencer = influencers.find(i => i.id === conv.influencerId);
        if (influencer) {
          otherUser = {
            id: influencer.id,
            name: influencer.fullName,
            avatar: influencer.verificationPhoto
          };
        }
      } else {
        const brand = brands.find(b => b.id === conv.brandId);
        if (brand) {
          otherUser = {
            id: brand.id,
            name: brand.brandName,
            avatar: brand.logo
          };
        }
      }

      return {
        ...conv,
        lastMessage,
        unreadCount,
        otherUser
      };
    });

    // Sort by last message timestamp
    enrichedConversations.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(a.createdAt);
      const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(b.createdAt);
      return bTime - aTime;
    });

    res.json({ success: true, data: enrichedConversations });
  } catch (error) {
    console.error('KonuÅŸmalar getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Get messages for a conversation
app.get('/api/messages/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await readJSONFile(MESSAGES_FILE);
    
    const conversationMessages = messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({ success: true, data: conversationMessages });
  } catch (error) {
    console.error('Mesajlar getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Send message
app.post('/api/messages/send', async (req, res) => {
  try {
    const { conversationId, brandId, influencerId, senderId, senderType, content, attachments } = req.body;

    if (!senderId || !senderType || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gerekli alanlarÄ± doldurun!' 
      });
    }

    let finalConversationId = conversationId;

    // Create conversation if it doesn't exist
    if (!conversationId) {
      if (!brandId || !influencerId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Yeni konuÅŸma iÃ§in brandId ve influencerId gerekli!' 
        });
      }

      const conversations = await readJSONFile(CONVERSATIONS_FILE);
      
      // Check if conversation already exists
      const existingConv = conversations.find(c => 
        c.brandId === brandId && c.influencerId === influencerId
      );

      if (existingConv) {
        finalConversationId = existingConv.id;
      } else {
        const newConversation = {
          id: generateUniqueId(),
          brandId,
          influencerId,
          createdAt: new Date().toISOString(),
          archived: false
        };
        conversations.push(newConversation);
        await writeJSONFile(CONVERSATIONS_FILE, conversations);
        finalConversationId = newConversation.id;
      }
    }

    const messages = await readJSONFile(MESSAGES_FILE);

    const newMessage = {
      id: generateUniqueId(),
      conversationId: finalConversationId,
      senderId,
      senderType,
      content,
      attachments: attachments || [],
      timestamp: new Date().toISOString(),
      read: false
    };

    messages.push(newMessage);
    await writeJSONFile(MESSAGES_FILE, messages);

    // Create notification for receiver
    const receiverId = senderType === 'brand' ? influencerId : brandId;
    const receiverType = senderType === 'brand' ? 'influencer' : 'brand';

    await createNotification(
      receiverId,
      receiverType,
      'message',
      'Yeni Mesaj',
      'Size yeni bir mesaj geldi.',
      `/messages/${finalConversationId}`
    );

    res.status(201).json({ 
      success: true, 
      message: 'Mesaj gÃ¶nderildi!',
      data: newMessage
    });
  } catch (error) {
    console.error('Mesaj gÃ¶nderme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Mark message as read
app.patch('/api/messages/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await readJSONFile(MESSAGES_FILE);
    const messageIndex = messages.findIndex(m => m.id === id);

    if (messageIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mesaj bulunamadÄ±!' 
      });
    }

    messages[messageIndex].read = true;
    await writeJSONFile(MESSAGES_FILE, messages);

    res.json({ 
      success: true, 
      message: 'Mesaj okundu olarak iÅŸaretlendi!',
      data: messages[messageIndex]
    });
  } catch (error) {
    console.error('Mesaj gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Archive conversation
app.post('/api/messages/conversation/:conversationId/archive', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversations = await readJSONFile(CONVERSATIONS_FILE);
    const conversationIndex = conversations.findIndex(c => c.id === conversationId);

    if (conversationIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'KonuÅŸma bulunamadÄ±!' 
      });
    }

    conversations[conversationIndex].archived = true;
    await writeJSONFile(CONVERSATIONS_FILE, conversations);

    res.json({ 
      success: true, 
      message: 'KonuÅŸma arÅŸivlendi!',
      data: conversations[conversationIndex]
    });
  } catch (error) {
    console.error('KonuÅŸma arÅŸivleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// ==================== NOTIFICATION ENDPOINTS ====================

// Create notification
app.post('/api/notifications/create', async (req, res) => {
  try {
    const { userId, userType, type, title, message, actionUrl, read } = req.body;
    
    if (!userId || !userType || !type || !title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Eksik bilgi!' 
      });
    }

    const notifications = await readJSONFile(NOTIFICATIONS_FILE);
    
    const newNotification = {
      id: generateId(),
      userId,
      userType,
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      read: read || false,
      createdAt: new Date().toISOString()
    };

    notifications.push(newNotification);
    await writeJSONFile(NOTIFICATIONS_FILE, notifications);

    res.json({ 
      success: true, 
      message: 'Bildirim oluÅŸturuldu!',
      notification: newNotification
    });
  } catch (error) {
    console.error('Bildirim oluÅŸturma hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Get notifications for a user
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await readJSONFile(NOTIFICATIONS_FILE);
    
    const userNotifications = notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, notifications: userNotifications });
  } catch (error) {
    console.error('Bildirimler getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notifications = await readJSONFile(NOTIFICATIONS_FILE);
    const notificationIndex = notifications.findIndex(n => n.id === id);

    if (notificationIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bildirim bulunamadÄ±!' 
      });
    }

    notifications[notificationIndex].read = true;
    await writeJSONFile(NOTIFICATIONS_FILE, notifications);

    res.json({ 
      success: true, 
      message: 'Bildirim okundu!',
      data: notifications[notificationIndex]
    });
  } catch (error) {
    console.error('Bildirim gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Mark all notifications as read
app.patch('/api/notifications/read-all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await readJSONFile(NOTIFICATIONS_FILE);
    
    notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });

    await writeJSONFile(NOTIFICATIONS_FILE, notifications);

    res.json({ 
      success: true, 
      message: 'TÃ¼m bildirimler okundu!'
    });
  } catch (error) {
    console.error('Bildirimler gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Delete notification
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notifications = await readJSONFile(NOTIFICATIONS_FILE);
    const filteredNotifications = notifications.filter(n => n.id !== id);

    if (notifications.length === filteredNotifications.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bildirim bulunamadÄ±!' 
      });
    }

    await writeJSONFile(NOTIFICATIONS_FILE, filteredNotifications);

    res.json({ 
      success: true, 
      message: 'Bildirim silindi!'
    });
  } catch (error) {
    console.error('Bildirim silme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

// Get analytics overview
app.get('/api/analytics/overview/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const offers = await readJSONFile(OFFERS_FILE);
    
    const brandCampaigns = campaigns.filter(c => c.brandId === brandId && !c.deletedAt);
    const brandOffers = offers.filter(o => o.brandId === brandId);
    
    const activeCampaigns = brandCampaigns.filter(c => c.status === 'aktif').length;
    const acceptedOffers = brandOffers.filter(o => o.status === 'kabul');
    const totalSpent = acceptedOffers.reduce((sum, o) => sum + (o.price || 0), 0);
    
    const offerAcceptanceRate = brandOffers.length > 0 
      ? (acceptedOffers.length / brandOffers.length) * 100 
      : 0;
    
    // Calculate average response time (in hours)
    const respondedOffers = brandOffers.filter(o => o.respondedAt);
    const avgResponseTime = respondedOffers.length > 0
      ? respondedOffers.reduce((sum, o) => {
          const created = new Date(o.createdAt);
          const responded = new Date(o.respondedAt);
          return sum + (responded - created) / (1000 * 60 * 60);
        }, 0) / respondedOffers.length
      : 0;

    res.json({ 
      success: true, 
      data: {
        totalCampaigns: brandCampaigns.length,
        activeCampaigns,
        totalSpent,
        roi: 0, // Placeholder - needs revenue data
        offerAcceptanceRate: Math.round(offerAcceptanceRate * 100) / 100,
        averageResponseTime: Math.round(avgResponseTime * 100) / 100
      }
    });
  } catch (error) {
    console.error('Analytics getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Get campaign performance
app.get('/api/analytics/campaigns/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const offers = await readJSONFile(OFFERS_FILE);
    
    const brandCampaigns = campaigns.filter(c => c.brandId === brandId && !c.deletedAt);
    
    const campaignPerformance = brandCampaigns.map(campaign => {
      const campaignOffers = offers.filter(o => o.campaignId === campaign.id);
      const acceptedOffers = campaignOffers.filter(o => o.status === 'kabul');
      const spentBudget = acceptedOffers.reduce((sum, o) => sum + (o.price || 0), 0);
      const completionRate = acceptedOffers.length > 0
        ? (acceptedOffers.length / campaignOffers.length) * 100
        : 0;

      return {
        campaignId: campaign.id,
        campaignName: campaign.productInfo,
        totalOffers: campaignOffers.length,
        acceptedOffers: acceptedOffers.length,
        spentBudget,
        completionRate: Math.round(completionRate * 100) / 100
      };
    });

    res.json({ success: true, data: campaignPerformance });
  } catch (error) {
    console.error('Kampanya performansÄ± getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Get trends
app.get('/api/analytics/trends/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const { period = 'monthly' } = req.query;
    const offers = await readJSONFile(OFFERS_FILE);
    
    const brandOffers = offers.filter(o => o.brandId === brandId);
    
    // Group by month
    const monthlyData = {};
    brandOffers.forEach(offer => {
      const date = new Date(offer.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          offers: 0,
          spent: 0,
          accepted: 0
        };
      }
      
      monthlyData[monthKey].offers++;
      if (offer.status === 'kabul') {
        monthlyData[monthKey].accepted++;
        monthlyData[monthKey].spent += offer.price || 0;
      }
    });

    const monthly = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    res.json({ success: true, data: { monthly, weekly: [] } });
  } catch (error) {
    console.error('Trend verileri getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Get category breakdown
app.get('/api/analytics/categories/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const influencers = await readJSONFile(INFLUENCERS_FILE);
    const offers = await readJSONFile(OFFERS_FILE);
    
    const brandOffers = offers.filter(o => o.brandId === brandId && o.status === 'kabul');
    
    const categoryCount = {};
    brandOffers.forEach(offer => {
      const influencer = influencers.find(i => i.id === offer.influencerId);
      if (influencer && influencer.categories) {
        influencer.categories.forEach(cat => {
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
      }
    });

    const total = Object.values(categoryCount).reduce((sum, count) => sum + count, 0);
    const categoryData = Object.entries(categoryCount).map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0
    }));

    res.json({ success: true, data: categoryData });
  } catch (error) {
    console.error('Kategori verileri getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// ==================== BUDGET ENDPOINTS ====================

// Get budget overview
app.get('/api/budget/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const brands = await readJSONFile(BRANDS_FILE);
    const offers = await readJSONFile(OFFERS_FILE);
    
    const brand = brands.find(b => b.id === brandId);
    if (!brand) {
      return res.status(404).json({ 
        success: false, 
        message: 'Marka bulunamadÄ±!' 
      });
    }

    const brandOffers = offers.filter(o => o.brandId === brandId);
    
    const used = brandOffers
      .filter(o => o.status === 'kabul')
      .reduce((sum, o) => sum + (o.price || 0), 0);
    
    const reserved = brandOffers
      .filter(o => o.status === 'beklemede')
      .reduce((sum, o) => sum + (o.price || 0), 0);
    
    const total = brand.budget || 0;
    const available = total - used - reserved;

    res.json({ 
      success: true, 
      data: {
        total,
        used,
        reserved,
        available
      }
    });
  } catch (error) {
    console.error('BÃ¼tÃ§e getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Get budget breakdown by campaign
app.get('/api/budget/breakdown/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const campaigns = await readJSONFile(CAMPAIGNS_FILE);
    const offers = await readJSONFile(OFFERS_FILE);
    
    const brandCampaigns = campaigns.filter(c => c.brandId === brandId && !c.deletedAt);
    
    const breakdown = brandCampaigns.map(campaign => {
      const campaignOffers = offers.filter(o => o.campaignId === campaign.id);
      
      const used = campaignOffers
        .filter(o => o.status === 'kabul')
        .reduce((sum, o) => sum + (o.price || 0), 0);
      
      const reserved = campaignOffers
        .filter(o => o.status === 'beklemede')
        .reduce((sum, o) => sum + (o.price || 0), 0);
      
      const allocated = campaign.budget || 0;
      const remaining = allocated - used - reserved;

      return {
        campaignId: campaign.id,
        campaignName: campaign.productInfo,
        allocated,
        used,
        reserved,
        remaining
      };
    });

    res.json({ success: true, data: breakdown });
  } catch (error) {
    console.error('BÃ¼tÃ§e detayÄ± getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

// Get payment history
app.get('/api/budget/history/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const offers = await readJSONFile(OFFERS_FILE);
    const influencers = await readJSONFile(INFLUENCERS_FILE);
    
    const completedOffers = offers.filter(o => 
      o.brandId === brandId && o.status === 'kabul'
    );
    
    const history = completedOffers.map(offer => {
      const influencer = influencers.find(i => i.id === offer.influencerId);
      
      return {
        id: offer.id,
        offerId: offer.id,
        influencerName: influencer ? influencer.fullName : 'Unknown',
        amount: offer.price,
        date: offer.updatedAt || offer.createdAt,
        status: 'completed'
      };
    });

    // Sort by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Ã–deme geÃ§miÅŸi getirme hatasÄ±:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatasÄ±!' });
  }
});

app.listen(PORT, () => {
  console.log('[Infuhub] API server listening on port ' + PORT);
});
