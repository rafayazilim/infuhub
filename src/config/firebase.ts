import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
