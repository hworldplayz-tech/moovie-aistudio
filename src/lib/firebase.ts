import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDfHacRQKUhbeGXx-YuaMJjCTcFs8CYgNo",
  authDomain: "studio-1095783527-40951.firebaseapp.com",
  projectId: "studio-1095783527-40951",
  storageBucket: "studio-1095783527-40951.firebasestorage.app",
  messagingSenderId: "78347104240",
  appId: "1:78347104240:web:d9918ba5d86b48dee53735"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
