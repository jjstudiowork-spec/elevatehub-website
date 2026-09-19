import { auth, authReady, onAuthStateChanged, signOut } from './firebase-web.js';

const params = new URLSearchParams(location.search);
const request = params.get('request');
const secret = params.get('secret');
const button = document.querySelector('[data-app-login]');
const copy = document.querySelector('[data-app-login-copy]');
const message = document.querySelector('[data-app-login-message]');
let currentUser;

function fail(text) { message.textContent = text; message.classList.remove('success'); }

authReady.then(() => onAuthStateChanged(auth, user => {
  if (!/^[A-Za-z0-9]{32}$/.test(request || '') || !/^[A-Za-z0-9]{64}$/.test(secret || '')) {
    fail('This app sign-in request is invalid. Return to ElevateHub and try again.');
    return;
  }
  if (!user) {
    const next = `app-login.html?${params.toString()}`;
    location.replace(`login.html?next=${encodeURIComponent(next)}`);
    return;
  }
  currentUser = user;
  copy.textContent = `Signed in as ${user.displayName || user.email}`;
  button.disabled = false;
}));

button.addEventListener('click', async () => {
  button.disabled = true;
  button.textContent = 'Connecting...';
  try {
    const idToken = await currentUser.getIdToken(true);
    const response = await fetch('/.netlify/functions/app-handoff', { method: 'POST', headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', request, secret }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'The app did not accept this request.');
    message.textContent = 'Connected. You can return to ElevateHub.';
    message.classList.add('success');
    button.textContent = 'Connected';
  } catch (error) {
    fail(error.message || 'Could not connect to the ElevateHub app.');
    button.disabled = false;
    button.textContent = 'Try again';
  }
});

document.querySelector('[data-use-another]').addEventListener('click', async () => {
  await signOut(auth);
  const next = `app-login.html?${params.toString()}`;
  location.replace(`login.html?next=${encodeURIComponent(next)}`);
});
