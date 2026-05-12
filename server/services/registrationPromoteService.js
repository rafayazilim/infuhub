const { admin, database } = require('../utils/firebaseClient');

const GECICI_MARKA = (uid) => `geciciMarkalar/${uid}`;
const GECICI_INFLUENCER = (uid) => `geciciInfluencerlar/${uid}`;

function stripUndefinedDeep(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item));
  }
  const out = {};
  for (const key of Object.keys(value)) {
    const v = stripUndefinedDeep(value[key]);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

async function movePendingBrandToMain(uid, authEmail) {
  const ref = database.ref(GECICI_MARKA(uid));
  const pendingSnap = await ref.once('value');
  if (!pendingSnap.exists()) return;

  const existing = await database.ref(`brands/${uid}`).once('value');
  if (existing.exists()) {
    await ref.remove();
    return;
  }

  const p = pendingSnap.val();
  const now = new Date().toISOString();
  const brandData = {
    id: uid,
    email: (authEmail || p.email || '').toString(),
    brandName: p.brandName,
    industry: p.industry,
    categories: Array.isArray(p.categories) ? p.categories : undefined,
    subCategories:
      p.subCategories && typeof p.subCategories === 'object' && !Array.isArray(p.subCategories)
        ? p.subCategories
        : undefined,
    industrySubCategories: Array.isArray(p.industrySubCategories) ? p.industrySubCategories : undefined,
    budget: p.budget,
    website: p.website,
    sorumlular: p.sorumlular,
    walletBalance: p.walletBalance ?? 0,
    walletLoadedTotal: p.walletLoadedTotal ?? 0,
    walletSpentTotal: p.walletSpentTotal ?? 0,
    status: p.status ?? 'do\u011frulanmad\u0131',
    verificationRequestStatus: p.verificationRequestStatus ?? 'yok',
    userType: 'brand',
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : now,
    updatedAt: now,
  };

  await database.ref(`brands/${uid}`).set(stripUndefinedDeep(brandData));
  await ref.remove();
}

async function movePendingInfluencerToMain(uid, authEmail) {
  const ref = database.ref(GECICI_INFLUENCER(uid));
  const pendingSnap = await ref.once('value');
  if (!pendingSnap.exists()) return;

  const existing = await database.ref(`influencers/${uid}`).once('value');
  if (existing.exists()) {
    await ref.remove();
    return;
  }

  const p = pendingSnap.val();
  const now = new Date().toISOString();
  const influencerData = {
    id: uid,
    email: (authEmail || p.email || '').toString(),
    fullName: p.fullName,
    phone: typeof p.phone === 'string' ? p.phone : undefined,
    platforms: p.platforms ?? [],
    followerRange: p.followerRange,
    categories: p.categories ?? [],
    subCategories: p.subCategories,
    contentPricing: p.contentPricing,
    verificationPhotoURL: p.verificationPhotoURL,
    status: p.status ?? 'do\u011frulanmad\u0131',
    verificationRequestStatus: p.verificationRequestStatus ?? 'yok',
    verificationDocumentURL: p.verificationDocumentURL,
    userType: 'influencer',
    subscriptionType: p.subscriptionType ?? 'defaultUser',
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : now,
    updatedAt: now,
  };

  await database.ref(`influencers/${uid}`).set(stripUndefinedDeep(influencerData));
  await ref.remove();
}

/**
 * E-posta doğrulandıktan sonra geçici cluster -> ana tablo (firebaseAuthService ile aynı sıra)
 */
async function promotePendingRegistration(uid, authEmail) {
  const bRef = database.ref(GECICI_MARKA(uid));
  const iRef = database.ref(GECICI_INFLUENCER(uid));
  const bSnap = await bRef.once('value');
  const iSnap = await iRef.once('value');
  if (bSnap.exists() && iSnap.exists()) {
    await iRef.remove();
  }
  const bAgain = await bRef.once('value');
  const iAgain = await iRef.once('value');
  if (bAgain.exists()) {
    await movePendingBrandToMain(uid, authEmail);
  } else if (iAgain.exists()) {
    await movePendingInfluencerToMain(uid, authEmail);
  }
}

module.exports = {
  promotePendingRegistration,
  GECICI_MARKA,
  GECICI_INFLUENCER,
};
