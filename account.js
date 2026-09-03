import { auth, db, doc, getDoc, onAuthStateChanged, signOut } from './firebase-web.js';

const view = document.querySelector('[data-profile-view]');
const loading = document.querySelector('[data-account-loading]');
const esc = (value) => {
  const node = document.createElement('span');
  node.textContent = value || '';
  return node.innerHTML;
};
const initials = (name) => (name || 'Elevate User')
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

function currentDevice() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /Firefox\//.test(ua) ? 'Firefox'
      : /Chrome\//.test(ua) ? 'Chrome'
        : /Safari\//.test(ua) ? 'Safari'
          : 'Web browser';
  const platform = /Windows/.test(ua) ? 'Windows'
    : /Macintosh|Mac OS/.test(ua) ? 'macOS'
      : /Android/.test(ua) ? 'Android'
        : /iPhone|iPad/.test(ua) ? 'iOS'
          : /Linux/.test(ua) ? 'Linux'
            : 'this device';
  return `${browser} on ${platform}`;
}

function addSessionDetails(user) {
  const list = document.querySelector('.profile-side dl');
  if (!list || list.querySelector('[data-session-device]')) return;
  const deviceRow = document.createElement('div');
  const signInRow = document.createElement('div');
  deviceRow.innerHTML = `<dt>Current session</dt><dd data-session-device>${esc(currentDevice())}</dd>`;
  const signedInAt = user.metadata?.lastSignInTime
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(user.metadata.lastSignInTime))
    : 'Active now';
  signInRow.innerHTML = `<dt>Last sign-in</dt><dd>${esc(signedInAt)}</dd>`;
  list.append(deviceRow, signInRow);
}

document.querySelector('[data-sign-out]').addEventListener('click', async () => {
  await signOut(auth);
  location.replace('login.html');
});

async function show(user) {
  const [profileSnap, dataSnap] = await Promise.all([
    getDoc(doc(db, 'users', user.uid)).catch(() => null),
    getDoc(doc(db, 'userdata', user.uid)).catch(() => null),
  ]);
  const profile = profileSnap?.data?.() || {};
  const cloud = dataSnap?.data?.() || {};
  const name = profile.name || profile.displayName || user.displayName || user.email.split('@')[0];
  const summary = cloud.summary || {};

  document.querySelector('[data-profile-name]').textContent = `Welcome, ${name}`;
  document.querySelector('[data-profile-email]').textContent = user.email;
  document.querySelector('[data-side-name]').textContent = name;
  document.querySelector('[data-side-team]').textContent = profile.organizationName || profile.teamName || (profile.mode === 'organization' ? 'Team workspace' : 'Personal workspace');
  document.querySelector('[data-avatar]').textContent = initials(name);
  document.querySelector('[data-song-count]').textContent = summary.songCount || 0;
  document.querySelector('[data-library-count]').textContent = summary.libraryCount || 0;
  document.querySelector('[data-playlist-count]').textContent = summary.playlistCount || 0;
  document.querySelector('[data-recent-songs]').innerHTML = summary.recentSongs?.length
    ? summary.recentSongs.map((song, index) => `<article><strong>${esc(song.title)}</strong><span>${String(index + 1).padStart(2, '0')}</span></article>`).join('')
    : '<p>No cloud songs yet. Open ElevateFlow and choose songs to save from your account.</p>';

  const banner = document.querySelector('[data-sync-banner]');
  banner.querySelector('strong').textContent = dataSnap?.exists() ? 'Cloud library connected' : 'Cloud library is ready';
  banner.querySelector('span').textContent = dataSnap?.exists()
    ? 'Your lightweight Flow data is available on this account.'
    : 'Save selected songs from ElevateFlow to make them available here.';
  const date = cloud.updatedAt?.toDate?.();
  document.querySelector('[data-sync-time]').textContent = date
    ? `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)}`
    : '';

  addSessionDetails(user);
  loading.hidden = true;
  view.hidden = false;
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.replace('login.html?next=account.html');
    return;
  }
  show(user).catch((error) => {
    console.error('[ElevateHub] Account could not load:', error);
    loading.querySelector('strong').textContent = 'Account could not load';
    loading.querySelector('p').textContent = 'Check your connection and refresh this page.';
  });
});
