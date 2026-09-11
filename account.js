import { auth, authReady, db, doc, getDoc, onAuthStateChanged, signOut } from './firebase-web.js';

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
const HEAD_ADMIN_EMAIL = 'jjstudiowork@gmail.com';
const betaAdminStyle = document.createElement('style');
betaAdminStyle.textContent = `.beta-admin{margin-top:22px;padding:22px;border:1px solid rgba(212,175,55,.2);border-radius:8px;background:rgba(212,175,55,.035)}.beta-admin header span,.beta-admin label{color:#c9a65f;font:700 9px "Space Mono",monospace;letter-spacing:1px}.beta-admin h2{margin:6px 0;font-size:21px}.beta-admin header p,.beta-admin-card-head small,.beta-admin-empty{color:#8b8b93;font-size:12px}.beta-admin-list{display:grid;gap:10px;margin-top:16px}.beta-admin article{padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:7px;background:rgba(9,10,13,.68)}.beta-admin-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.beta-admin-card-head>div{display:grid;gap:4px}.beta-admin-card-head span{color:#e4c46b;font:700 10px "Space Mono",monospace}.beta-admin-card-head strong{font-size:13px}.beta-admin-card-head b{padding:5px 7px;border-radius:4px;background:rgba(212,175,55,.12);color:#e7c76f;font-size:10px}.beta-admin article>p{margin:11px 0;color:#b1b1b9;font-size:12px;line-height:1.45}.beta-admin label{display:grid;gap:6px}.beta-admin textarea{min-height:52px;resize:vertical;padding:9px;border:1px solid rgba(255,255,255,.12);border-radius:6px;outline:0;background:#0a0b0e;color:#e9e9ed;font:11px/1.45 "Space Mono",monospace}.beta-admin footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}.beta-admin footer small{color:#93939d;font-size:10px}.beta-admin button{height:31px;padding:0 11px;border:1px solid rgba(212,175,55,.4);border-radius:6px;background:rgba(212,175,55,.13);color:#eccf79;font-weight:700;cursor:pointer}.beta-admin button:disabled{opacity:.5}`;
document.head.appendChild(betaAdminStyle);

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

async function fetchPrivateBeta(user, platform) {
  const response = await fetch(`/.netlify/functions/beta-latest?platform=${platform}&product=hub`, {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    cache: 'no-store',
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Private beta access could not be checked.');
  return payload;
}

async function downloadPrivateBeta(user, build, button, message) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Authorizing...';
  message.textContent = '';
  try {
    const response = await fetch(build.downloadUrl, {
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.downloadUrl) throw new Error(payload.error || 'The beta download could not be authorized.');
    const link = document.createElement('a');
    link.href = payload.downloadUrl;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    button.textContent = 'Download started';
    window.setTimeout(() => { button.textContent = original; button.disabled = false; }, 1800);
  } catch (error) {
    message.textContent = error.message;
    button.textContent = original;
    button.disabled = false;
  }
}

async function showPrivateBetas(user) {
  const builds = (await Promise.all(['macos', 'windows'].map(async (platform) => {
    try { return await fetchPrivateBeta(user, platform); }
    catch (error) { console.warn(`[ElevateHub] ${platform} beta unavailable:`, error); return null; }
  }))).filter(Boolean);
  if (!builds.length) return;

  const section = document.createElement('section');
  section.className = 'private-beta';
  const version = builds[0].version;
  const published = builds[0].date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(builds[0].date)) : 'Private preview';
  section.innerHTML = `<header><div><span>PRIVATE BETA</span><h2>Your test builds</h2><p>Early ElevateHub releases assigned securely to ${esc(user.email)}.</p></div><strong>v${esc(version)}</strong></header><div class="beta-builds"></div><div class="beta-notes"><span>RELEASE NOTES</span><p>${esc(builds[0].notes || 'Private testing build for approved ElevateHub accounts.')}</p><time>${esc(published)}</time></div><p class="beta-message" aria-live="polite"></p>`;
  const cards = section.querySelector('.beta-builds');
  const message = section.querySelector('.beta-message');
  const current = /Windows/.test(navigator.userAgent) ? 'windows' : /Macintosh|Mac OS/.test(navigator.userAgent) ? 'macos' : '';

  builds.forEach((build) => {
    const platform = build.platform === 'macos' ? 'macOS' : 'Windows';
    const card = document.createElement('article');
    card.innerHTML = `<div><span>${esc(platform.toUpperCase())}${build.platform === current ? ' · THIS DEVICE' : ''}</span><strong>ElevateHub ${esc(build.version)}</strong><small>${build.platform === 'macos' ? 'Universal DMG installer' : '64-bit Windows installer'}</small></div><button type="button">Download</button>`;
    card.querySelector('button').addEventListener('click', (event) => downloadPrivateBeta(user, build, event.currentTarget, message));
    cards.appendChild(card);
  });
  document.querySelector('.profile-view').appendChild(section);
}

async function showBetaAdmin(user) {
  if (user.email?.toLowerCase() !== HEAD_ADMIN_EMAIL) return;
  const response = await fetch('/.netlify/functions/beta-admin', { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not load beta access.');
  const section = document.createElement('section');
  section.className = 'beta-admin';
  section.innerHTML = '<header><div><span>BETA ACCESS</span><h2>Private release control</h2><p>Choose who can install each completed ElevateHub beta.</p></div></header><div class="beta-admin-list"></div>';
  const list = section.querySelector('.beta-admin-list');
  if (!payload.releases?.length) list.innerHTML = '<p class="beta-admin-empty">No completed private beta builds yet.</p>';
  payload.releases?.forEach((release) => {
    const card = document.createElement('article');
    const date = release.publishedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(release.publishedAt)) : 'Recently built';
    card.innerHTML = `<div class="beta-admin-card-head"><div><span>v${esc(release.version)}</span><strong>${esc(release.products === 'hub' ? 'ElevateHub' : release.products)} · ${esc(release.platforms)}</strong><small>${esc(date)}</small></div><b>${release.testers.length} tester${release.testers.length === 1 ? '' : 's'}</b></div><p>${esc(release.notes || 'Private testing build.')}</p><label>APPROVED EMAILS<textarea>${esc(release.testers.join(', '))}</textarea></label><footer><small></small><button type="button">Save access</button></footer>`;
    const textarea = card.querySelector('textarea');
    const status = card.querySelector('footer small');
    card.querySelector('button').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true; status.textContent = 'Saving...';
      try {
        const save = await fetch('/.netlify/functions/beta-admin', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ releaseId: release.id, testers: textarea.value.split(',') }) });
        const saved = await save.json().catch(() => ({}));
        if (!save.ok) throw new Error(saved.error || 'Could not save access.');
        textarea.value = saved.testers.join(', '); status.textContent = 'Saved. Testers can check for this beta now.';
      } catch (error) { status.textContent = error.message; }
      finally { button.disabled = false; }
    });
    list.appendChild(card);
  });
  document.querySelector('.profile-view').appendChild(section);
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
  showPrivateBetas(user).catch((error) => console.warn('[ElevateHub] Private betas could not load:', error));
  showBetaAdmin(user).catch((error) => console.warn('[ElevateHub] Beta administration could not load:', error));
}

authReady.then(() => onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.replace('login.html?next=account.html');
    return;
  }
  show(user).catch((error) => {
    console.error('[ElevateHub] Account could not load:', error);
    loading.querySelector('strong').textContent = 'Account could not load';
    loading.querySelector('p').textContent = 'Check your connection and refresh this page.';
  });
}));
