import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { browserLocalPersistence, createUserWithEmailAndPassword, getAuth, onAuthStateChanged, reload, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut, updateProfile, verifyBeforeUpdateEmail } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const app = initializeApp({
  apiKey: 'AIzaSyB0tMWZELsbEkHwxpyYLHBGoXjjv6w0lNI',
  authDomain: 'elevateflow-sync.firebaseapp.com',
  projectId: 'elevateflow-sync',
  storageBucket: 'elevateflow-sync.firebasestorage.app',
  messagingSenderId: '7030506040',
  appId: '1:7030506040:web:38bb3a907c161020951ccd',
});

const auth = getAuth(app);
const authReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('[ElevateHub] Persistent sign-in is unavailable in this browser:', error);
});
const db = getFirestore(app);

export {
  addDoc,
  auth,
  authReady,
  collection,
  db,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  getDocs,
  onAuthStateChanged,
  onSnapshot,
  query,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateDoc,
  updateProfile,
  verifyBeforeUpdateEmail,
  where,
};
