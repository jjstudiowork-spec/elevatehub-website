import { auth, authReady, onAuthStateChanged, reload, sendEmailVerification, signOut } from './firebase-web.js';

const email = document.querySelector('[data-verification-email]');
const message = document.querySelector('[data-verification-message]');
const check = document.querySelector('[data-check-verification]');
const resend = document.querySelector('[data-resend-verification]');
let currentUser = null;
const show = (text, success = false) => { message.textContent = text; message.classList.toggle('success', success); };

authReady.then(() => onAuthStateChanged(auth, (user) => {
  if (!user) { location.replace('login.html?next=verify-email.html'); return; }
  currentUser = user; email.textContent = user.email;
  if (user.emailVerified) location.replace('account.html');
}));

check.addEventListener('click', async () => {
  if (!currentUser) return;
  check.disabled = true; show('Checking your account...');
  try { await reload(currentUser); if (currentUser.emailVerified) location.replace('account.html'); else show('That email is not verified yet. Open the link in your inbox first.'); }
  catch { show('We could not check verification. Try again.'); }
  finally { check.disabled = false; }
});

resend.addEventListener('click', async () => {
  if (!currentUser) return;
  resend.disabled = true;
  try { await sendEmailVerification(currentUser, { url: 'https://elevatehub-app.netlify.app/verify-email.html' }); show('A fresh verification email has been sent.', true); }
  catch (error) { show(error.code === 'auth/too-many-requests' ? 'Please wait before sending another email.' : 'The verification email could not be sent.'); }
  finally { resend.disabled = false; }
});

document.querySelector('[data-use-another]').addEventListener('click', async () => { await signOut(auth); location.replace('login.html'); });
