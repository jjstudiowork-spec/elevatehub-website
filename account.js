import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = { apiKey:'AIzaSyBpY8_6kxKSQV9QWmP8k2gqXWGo5cAGHvI', authDomain:'elevateflow-sync.firebaseapp.com', projectId:'elevateflow-sync', storageBucket:'elevateflow-sync.firebasestorage.app', messagingSenderId:'7030506040', appId:'1:7030506040:web:cfcefe4d4e69c33c951ccd' };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const authView = document.querySelector('[data-auth-view]');
const profileView = document.querySelector('[data-profile-view]');
const form = document.querySelector('[data-auth-form]');
const message = document.querySelector('[data-auth-message]');
let registerMode = false;

function setMessage(text = '', success = false) { message.textContent = text; message.classList.toggle('success', success); }
function formatTime(timestamp) { const date = timestamp?.toDate?.(); return date ? `Updated ${new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(date)}` : ''; }
function initials(name) { return (name || 'Elevate User').split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase(); }

function setMode(next) {
  registerMode = next;
  document.querySelector('[data-name-field]').hidden = !next;
  document.querySelector('[data-form-kicker]').textContent = next ? 'JOIN ELEVATEHUB' : 'WELCOME BACK';
  document.querySelector('[data-form-title]').textContent = next ? 'Create account' : 'Sign in';
  document.querySelector('[data-form-subtitle]').textContent = next ? 'Use this account in Hub, Flow and on the web.' : 'Continue with your ElevateHub account.';
  document.querySelector('[data-auth-submit]').textContent = next ? 'Create account' : 'Sign in';
  document.querySelector('[data-auth-switch]').innerHTML = next ? 'Already have an account? <b>Sign in</b>' : 'New to ElevateHub? <b>Create an account</b>';
  form.password.autocomplete = next ? 'new-password' : 'current-password';
  setMessage();
}

document.querySelector('[data-auth-switch]').addEventListener('click', () => setMode(!registerMode));
document.querySelector('[data-auth-reset]').addEventListener('click', async () => {
  const email = form.email.value.trim();
  if (!email) return setMessage('Enter your email address first.');
  try { await sendPasswordResetEmail(auth, email); setMessage('Password reset email sent.', true); }
  catch (error) { setMessage(error.code === 'auth/user-not-found' ? 'No account uses that email.' : 'Could not send the reset email.'); }
});

form.addEventListener('submit', async event => {
  event.preventDefault(); setMessage();
  const submit = document.querySelector('[data-auth-submit]');
  const email = form.email.value.trim(); const password = form.password.value;
  submit.disabled = true; submit.textContent = registerMode ? 'Creating...' : 'Signing in...';
  try {
    if (registerMode) {
      const name = form.name.value.trim();
      if (!name) throw { code:'account/name-required' };
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName:name });
      await setDoc(doc(db,'users',credential.user.uid), { name, displayName:name, email:credential.user.email, createdAt:serverTimestamp(), updatedAt:serverTimestamp() }, { merge:true });
    } else await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const errors = { 'account/name-required':'Enter your name.', 'auth/email-already-in-use':'An account already uses that email.', 'auth/invalid-credential':'Incorrect email or password.', 'auth/weak-password':'Use a password with at least 6 characters.', 'auth/invalid-email':'Enter a valid email address.' };
    setMessage(errors[error.code] || 'We could not complete that request. Please try again.');
  } finally { submit.disabled = false; submit.textContent = registerMode ? 'Create account' : 'Sign in'; }
});

document.querySelector('[data-sign-out]').addEventListener('click', () => signOut(auth));

async function showProfile(user) {
  authView.hidden = true; profileView.hidden = false;
  const [profileSnapshot, dataSnapshot] = await Promise.all([getDoc(doc(db,'users',user.uid)).catch(()=>null), getDoc(doc(db,'userdata',user.uid)).catch(()=>null)]);
  const profile = profileSnapshot?.data?.() || {};
  const cloud = dataSnapshot?.data?.() || {};
  const name = profile.name || profile.displayName || user.displayName || user.email.split('@')[0];
  document.querySelector('[data-profile-name]').textContent = `Welcome, ${name}`;
  document.querySelector('[data-profile-email]').textContent = user.email;
  document.querySelector('[data-side-name]').textContent = name;
  document.querySelector('[data-side-team]').textContent = profile.organizationName || profile.teamName || 'Personal workspace';
  document.querySelector('[data-avatar]').textContent = initials(name);
  const summary = cloud.summary || {};
  document.querySelector('[data-song-count]').textContent = summary.songCount || 0;
  document.querySelector('[data-library-count]').textContent = summary.libraryCount || 0;
  document.querySelector('[data-playlist-count]').textContent = summary.playlistCount || 0;
  const recent = document.querySelector('[data-recent-songs]');
  recent.innerHTML = summary.recentSongs?.length ? summary.recentSongs.map((song,index)=>`<article><strong>${escapeHtml(song.title)}</strong><span>${String(index+1).padStart(2,'0')}</span></article>`).join('') : '<p>No cloud songs yet. Open ElevateFlow and edit your library to sync.</p>';
  const banner = document.querySelector('[data-sync-banner]');
  banner.querySelector('strong').textContent = dataSnapshot?.exists() ? 'Cloud library connected' : 'Cloud library is ready';
  banner.querySelector('span').textContent = dataSnapshot?.exists() ? 'Your lightweight Flow data is available on this account.' : 'Your first Flow edit will appear here automatically.';
  document.querySelector('[data-sync-time]').textContent = formatTime(cloud.updatedAt);
}
function escapeHtml(value='') { const node=document.createElement('span'); node.textContent=value; return node.innerHTML; }

onAuthStateChanged(auth, user => {
  if (user) showProfile(user).catch(() => showProfileFallback(user));
  else { authView.hidden=false; profileView.hidden=true; }
});
function showProfileFallback(user){ authView.hidden=true; profileView.hidden=false; const name=user.displayName||user.email.split('@')[0]; document.querySelector('[data-profile-name]').textContent=`Welcome, ${name}`; document.querySelector('[data-profile-email]').textContent=user.email; }
