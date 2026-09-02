import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const app = initializeApp({
  apiKey: 'AIzaSyB0tMWZELsbEkHwxpyYLHBGoXjjv6w0lNI',
  authDomain: 'elevateflow-sync.firebaseapp.com',
  projectId: 'elevateflow-sync',
  storageBucket: 'elevateflow-sync.firebasestorage.app',
  messagingSenderId: '7030506040',
  appId: '1:7030506040:web:38bb3a907c161020951ccd',
});

const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  onAuthStateChanged,
  sendPasswordResetEmail,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
};
