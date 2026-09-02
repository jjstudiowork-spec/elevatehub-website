import { auth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword } from './firebase-web.js';

const form = document.querySelector('[data-login-form]');
const message = document.querySelector('[data-auth-message]');
const next = new URLSearchParams(location.search).get('next') || 'account.html';
let submitted = false;

const show = (text, success = false) => {
  message.textContent = text;
  message.classList.toggle('success', success);
};

const authErrorMessage = (error, action = 'sign in') => {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Try resetting your password if this account works in the app.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact ElevateHub support.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes, then try again or reset your password.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase. Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled for this Firebase project.';
    case 'auth/unauthorized-domain':
      return 'This website has not been authorized in Firebase yet.';
    default:
      console.error(`[ElevateHub] Could not ${action}:`, error);
      return `Could not ${action}. Firebase reported ${error?.code || 'an unknown error'}.`;
  }
};

onAuthStateChanged(auth, (user) => {
  if (user && !submitted) location.replace(next);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  show('');
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Signing in...';
  submitted = true;

  try {
    await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    location.replace(next);
  } catch (error) {
    submitted = false;
    show(authErrorMessage(error));
  } finally {
    button.disabled = false;
    button.textContent = 'Sign in';
  }
});

document.querySelector('[data-auth-reset]').addEventListener('click', async () => {
  const email = form.email.value.trim();
  if (!email) return show('Enter your email address first.');

  try {
    await sendPasswordResetEmail(auth, email);
    show('Password reset email sent. Check your inbox and spam folder.', true);
  } catch (error) {
    show(authErrorMessage(error, 'send the reset email'));
  }
});
