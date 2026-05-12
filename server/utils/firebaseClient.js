const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// .env yükle (cwd ve server/.env fallback)
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

// Firebase Admin SDK'yı başlat
if (!admin.apps.length) {
  const defaultServiceAccountPath = path.join(
    __dirname,
    '../../infuhub-c5ce7-firebase-adminsdk-fbsvc-fe3cab7d29.json'
  );
  
  try {
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const resolvedPath = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        : path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      serviceAccount = require(resolvedPath);
    } else {
      // Geriye dönük uyumluluk: mevcut dosyadan oku
      serviceAccount = require(defaultServiceAccountPath);
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ||
        'https://infuhub-c5ce7-default-rtdb.firebaseio.com',
    });
    
    console.log('[Infuhub] Firebase Admin SDK initialized');
  } catch (error) {
    console.error('[Infuhub] Firebase Admin SDK init failed:', error.message);
    throw error;
  }
}

const database = admin.database();

module.exports = { admin, database };
