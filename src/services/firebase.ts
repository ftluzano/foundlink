import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyCObf-QX9hFOaQK_bI9gM71kAmPy_Wj5iw",
  authDomain: "foundlink-e6a36.firebaseapp.com",
  projectId: "foundlink-e6a36",
  storageBucket: "foundlink-e6a36.firebasestorage.app",
  messagingSenderId: "1092369919070",
  appId: "1:1092369919070:web:97bc8f5efdef0b4a0758cf"
};

// Initialize Firebase App safely singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
