import { auth, authReady, onAuthStateChanged, signOut } from './firebase-web.js';

const params = new URLSearchParams(location.search);
const callback = params.get('callback');
const state = params.get('state');
const request = params.get('request');
const button = document.querySelector('[data-app-login]');
const copy = document.querySelector('[data-app-login-copy]');
const message = document.querySelector('[data-app-login-message]');
let currentUser;

function fail(text) { message.textContent = text; message.classList.remove('success'); }

authReady.then(() => onAuthStateChanged(auth, user => {
  if (!callback || !state || !request || !callback.startsWith('http://127.0.0.1:')) {
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
    const response = await fetch(callback, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state, idToken }) });
    if (!response.ok) throw new Error('The app did not accept this request.');
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
