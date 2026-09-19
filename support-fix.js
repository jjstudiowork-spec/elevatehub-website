import { addDoc, auth, authReady, collection, db, onAuthStateChanged, serverTimestamp } from './firebase-web.js';

const formSection = document.querySelector('[data-fix-request]');
const form = document.querySelector('[data-fix-form]');
const message = document.querySelector('[data-fix-message]');
let currentUser = null;

function openForm() {
  if (!currentUser) {
    location.assign('login.html?next=support.html%23fix');
    return;
  }
  formSection.hidden = false;
  formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.querySelector('input')?.focus({ preventScroll: true });
}

document.querySelector('[data-open-fix]')?.addEventListener('click', openForm);
document.querySelector('[data-close-fix]')?.addEventListener('click', () => { formSection.hidden = true; });

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return openForm();
  const data = new FormData(form);
  const subject = String(data.get('subject') || '').trim();
  const details = String(data.get('details') || '').trim();
  if (!subject || !details) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  message.className = '';
  message.textContent = 'Sending your request...';
  try {
    await addDoc(collection(db, 'elevateSupportRequests'), {
      requesterId: currentUser.uid,
      requesterEmail: String(currentUser.email || '').trim().toLowerCase(),
      requesterName: currentUser.displayName || currentUser.email?.split('@')[0] || 'ElevateHub user',
      subject,
      details,
      status: 'open',
      unreadForAdmin: true,
      unreadForRequester: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const mailSubject = encodeURIComponent(`ElevateHub support: ${subject}`);
    const mailBody = encodeURIComponent(`Account: ${currentUser.email}\n\n${details}`);
    message.innerHTML = `Sent. Follow the reply in your ElevateHub account, or <a href="mailto:jjstudiowork@gmail.com?subject=${mailSubject}&body=${mailBody}">open an email copy for JJ</a>.`;
    form.reset();
  } catch (error) {
    console.warn('[ElevateHub] Support request could not be sent:', error);
    message.className = 'error';
    message.textContent = error?.code === 'permission-denied'
      ? 'Support access needs the latest Firestore rules. Please try again after they are published.'
      : 'Your request could not be sent. Check your connection and try again.';
  } finally {
    button.disabled = false;
  }
});

authReady.then(() => onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user && location.hash === '#fix') openForm();
}));
