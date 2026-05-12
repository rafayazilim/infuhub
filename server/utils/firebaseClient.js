const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK'yı başlat
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../infuhub-c5ce7-firebase-adminsdk-fbsvc-fe3cab7d29.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://infuhub-c5ce7-default-rtdb.firebaseio.com',
    });
    
    console.log('✅ Firebase Admin SDK başarıyla başlatıldı');
  } catch (error) {
    console.error('❌ Firebase Admin SDK başlatılamadı:', error.message);
    throw error;
  }
}

const database = admin.database();

module.exports = { admin, database };
