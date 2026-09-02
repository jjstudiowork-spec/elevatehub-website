import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { createUserWithEmailAndPassword,getAuth,onAuthStateChanged,sendPasswordResetEmail,signInWithEmailAndPassword,signOut,updateProfile } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { doc,getDoc,getFirestore,serverTimestamp,setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const app=initializeApp({apiKey:'AIzaSyBpY8_6kxKSQV9WmP8k2gqXWGo5cAGHvI',authDomain:'elevateflow-sync.firebaseapp.com',projectId:'elevateflow-sync',storageBucket:'elevateflow-sync.firebasestorage.app',messagingSenderId:'7030506040',appId:'1:7030506040:web:cfcefe4d4e69c33c951ccd'});
const auth=getAuth(app);const db=getFirestore(app);
export {auth,db,createUserWithEmailAndPassword,doc,getDoc,onAuthStateChanged,sendPasswordResetEmail,serverTimestamp,setDoc,signInWithEmailAndPassword,signOut,updateProfile};
