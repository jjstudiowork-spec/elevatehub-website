import { auth, authReady, collection, db, doc, getDoc, getDocs, onAuthStateChanged, query, sendPasswordResetEmail, serverTimestamp, setDoc, signOut, updateDoc, updateProfile, verifyBeforeUpdateEmail, where } from './firebase-web.js';

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
betaAdminStyle.textContent += `.support-inbox{margin-top:22px;padding:22px;border:1px solid rgba(105,190,147,.24);border-radius:8px;background:rgba(48,116,78,.05)}.support-inbox header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.support-inbox header span{color:#86cfa2;font:700 9px "Space Mono",monospace;letter-spacing:1px}.support-inbox h2{margin:6px 0;font-size:21px}.support-inbox header p,.support-inbox-empty,.support-meta,.support-reply p{color:#90949a;font-size:12px}.support-inbox header b{padding:5px 8px;border-radius:12px;background:rgba(101,189,131,.15);color:#9be3b5;font:700 9px "Space Mono",monospace}.support-ticket-list{display:grid;gap:10px;margin-top:16px}.support-ticket{padding:15px;border:1px solid rgba(255,255,255,.09);border-radius:7px;background:rgba(9,10,13,.7)}.support-ticket.unread{border-color:rgba(101,189,131,.45);box-shadow:0 0 0 1px rgba(101,189,131,.08)}.support-ticket-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.support-ticket-head strong{display:block;font-size:14px}.support-ticket-head small{display:block;margin-top:5px;color:#7f858b;font:10px Arial,sans-serif}.support-ticket>p{margin:12px 0;color:#c2c4c8;font:12px/1.55 Arial,sans-serif;white-space:pre-wrap}.support-reply{margin-top:12px;padding:11px 12px;border-left:2px solid #65bd83;background:rgba(101,189,131,.06)}.support-reply span{color:#8dd4a6;font:700 9px "Space Mono",monospace;letter-spacing:1px}.support-reply p{margin:6px 0 0;white-space:pre-wrap;line-height:1.55}.support-reply-form{display:grid;gap:8px;margin-top:14px}.support-reply-form textarea{min-height:74px;padding:9px;border:1px solid #30363a;border-radius:6px;resize:vertical;background:#0a0b0e;color:#e8e9ec;font:12px/1.45 Arial,sans-serif}.support-reply-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}.support-reply-actions small{color:#8c9197;font-size:10px}.support-reply-actions div{display:flex;gap:7px}.support-reply-actions a,.support-reply-actions button{height:30px;padding:0 10px;display:inline-flex;align-items:center;border:1px solid rgba(101,189,131,.35);border-radius:5px;background:rgba(101,189,131,.09);color:#a2e3ba;font:700 10px Oswald,sans-serif;letter-spacing:.5px;text-decoration:none;cursor:pointer}.support-reply-actions a{border-color:#393d42;background:#15171a;color:#aeb3b8}.support-reply-actions button:disabled{opacity:.5}`;
betaAdminStyle.textContent += `.account-control-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:22px}.account-control{padding:22px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#111216}.account-control.wide{grid-column:1/-1}.account-control>span,.access-picker>span{color:#c9a65f;font:700 9px "Space Mono",monospace;letter-spacing:1.2px}.account-control h2{margin:7px 0 5px;font-size:22px;font-weight:400}.account-control>p{margin:0 0 17px;color:#83878e;font:12px/1.5 Arial,sans-serif}.account-control label{display:grid;gap:6px;margin-top:12px;color:#999da4;font:700 9px "Space Mono",monospace;letter-spacing:1px}.account-control input{height:39px;padding:0 10px;border:1px solid #30343a;border-radius:5px;background:#090a0c;color:#ececef;font:12px Arial,sans-serif}.account-control input[type=file]{height:auto;padding:9px}.account-control form>div{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:15px}.account-control small{color:#858991;font:10px Arial,sans-serif}.account-control button,.access-picker button{height:31px;padding:0 11px;border:1px solid rgba(212,175,55,.4);border-radius:5px;background:rgba(212,175,55,.12);color:#e7cb84;font:700 10px Oswald,sans-serif;letter-spacing:.4px;cursor:pointer}.account-control button:disabled{opacity:.5}.account-computer-list,.account-team-list{display:grid;gap:8px}.account-computer,.account-team{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px;border:1px solid #292d32;border-radius:6px;background:#0b0c0e}.account-computer strong,.account-team strong{display:block;font-size:12px}.account-computer small,.account-team small{display:block;margin-top:4px;color:#737780;font-size:10px}.account-computer b{color:#88d6a4;font:700 8px "Space Mono",monospace;letter-spacing:.7px}.account-groups{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.account-groups span{padding:5px 7px;border:1px solid rgba(212,175,55,.23);border-radius:4px;background:rgba(212,175,55,.07);color:#e2c77f;font:700 9px "Space Mono",monospace}.access-picker{display:grid;gap:8px;margin-top:14px}.access-picker-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px;max-height:190px;overflow:auto;padding:7px;border:1px solid #2b2e33;border-radius:6px;background:#090a0c}.access-picker label{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid transparent;border-radius:5px;background:#111216;color:#d9dade;font:11px Arial,sans-serif;cursor:pointer}.access-picker label:has(input:checked){border-color:rgba(212,175,55,.35);background:rgba(212,175,55,.08)}.access-picker input{accent-color:#d1ad72}.access-picker label span{min-width:0}.access-picker label b,.access-picker label small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.access-picker label small{margin-top:2px;color:#747881;font:9px Arial,sans-serif}@media(max-width:720px){.account-control-grid{grid-template-columns:1fr}.account-control.wide{grid-column:auto}.access-picker-list{grid-template-columns:1fr}}`;
document.head.appendChild(betaAdminStyle);

let activeAccountPane = location.hash === '#support-updates' ? 'support' : 'overview';

function showAccountPane(pane) {
  activeAccountPane = pane;
  document.querySelectorAll('[data-account-panel]').forEach((panel) => { panel.hidden = panel.dataset.accountPanel !== pane; });
  document.querySelectorAll('[data-account-pane-button]').forEach((button) => {
    button.classList.toggle('active', button.dataset.accountPaneButton === pane);
    button.setAttribute('aria-selected', String(button.dataset.accountPaneButton === pane));
  });
}

function initializeAccountPanes() {
  const profile = document.querySelector('.profile-view');
  const overview = profile.querySelector('.profile-grid');
  overview.dataset.accountPanel = 'overview';
  overview.classList.add('account-panel');
  const tabs = document.createElement('nav');
  tabs.className = 'account-view-tabs';
  tabs.setAttribute('aria-label', 'Account sections');
  tabs.innerHTML = [['overview','Overview'],['profile','Profile & security'],['teams','Teams'],['devices','Computers'],['releases','Releases'],['support','Support']].map(([id, label]) => `<button type="button" data-account-pane-button="${id}" aria-selected="false"><span>${label}</span>${id === 'support' ? '<b>0</b>' : ''}</button>`).join('');
  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-account-pane-button]');
    if (button) showAccountPane(button.dataset.accountPaneButton);
  });
  overview.before(tabs);
  document.querySelector('[data-notification-bell]')?.addEventListener('click', (event) => {
    event.preventDefault();
    showAccountPane('support');
  });
  showAccountPane(activeAccountPane);
}

function accountPanel(pane) {
  const profile = document.querySelector('.profile-view');
  let panel = profile.querySelector(`[data-account-panel="${pane}"]`);
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'account-panel';
    panel.dataset.accountPanel = pane;
    panel.hidden = pane !== activeAccountPane;
    profile.appendChild(panel);
  }
  return panel;
}

function mountAccountSection(section, pane) {
  accountPanel(pane).appendChild(section);
}

async function knownAccounts(user) {
  const people = new Map();
  people.set(String(user.email || '').toLowerCase(), { name: user.displayName || user.email?.split('@')[0] || 'My account', email: String(user.email || '').toLowerCase() });
  const snapshot = await getDocs(collection(db, 'elevatePeople'));
  snapshot.docs.forEach((entry) => {
    const person = entry.data();
    const email = String(person.email || '').trim().toLowerCase();
    if (email) people.set(email, { name: person.name || email.split('@')[0], email });
  });
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function accessPicker(people, selected = []) {
  const chosen = new Set(selected.map((email) => String(email).toLowerCase()));
  const wrap = document.createElement('div');
  wrap.className = 'access-picker';
  wrap.innerHTML = `<span>SELECT PEOPLE WHO HAVE SIGNED INTO ELEVATEHUB</span><div class="access-picker-list">${people.map((person) => `<label><input type="checkbox" value="${esc(person.email)}" ${chosen.has(person.email) ? 'checked' : ''}/><span><b>${esc(person.name)}</b><small>${esc(person.email)}</small></span></label>`).join('') || '<small>No signed-in people are discoverable yet.</small>'}</div>`;
  return wrap;
}

function selectedFromPicker(picker) {
  return [...picker.querySelectorAll('input:checked')].map((input) => input.value);
}

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
  mountAccountSection(section, 'releases');
}

async function showBetaAdmin(user) {
  if (user.email?.toLowerCase() !== HEAD_ADMIN_EMAIL) return;
  const [response, people] = await Promise.all([
    fetch('/.netlify/functions/beta-admin', { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store' }),
    knownAccounts(user).catch(() => [{ name: user.displayName || 'My account', email: user.email }]),
  ]);
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
    card.innerHTML = `<div class="beta-admin-card-head"><div><span>v${esc(release.version)}</span><strong>${esc(release.products === 'hub' ? 'ElevateHub' : release.products)} · ${esc(release.platforms)}</strong><small>${esc(date)}</small></div><b>${release.testers.length} tester${release.testers.length === 1 ? '' : 's'}</b></div><p>${esc(release.notes || 'Private testing build.')}</p><footer><small></small><button type="button">Save access</button></footer>`;
    const picker = accessPicker(people, release.testers);
    card.querySelector('p').after(picker);
    const status = card.querySelector('footer small');
    card.querySelector('button').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true; status.textContent = 'Saving...';
      try {
        const save = await fetch('/.netlify/functions/beta-admin', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ releaseId: release.id, testers: selectedFromPicker(picker) }) });
        const saved = await save.json().catch(() => ({}));
        if (!save.ok) throw new Error(saved.error || 'Could not save access.');
        status.textContent = `Saved. ${saved.testers.length} tester${saved.testers.length === 1 ? '' : 's'} can check for this beta now.`;
      } catch (error) { status.textContent = error.message; }
      finally { button.disabled = false; }
    });
    list.appendChild(card);
  });
  mountAccountSection(section, 'releases');
}

function updateNotificationBell(count) {
  const bell = document.querySelector('[data-notification-bell]');
  if (!bell) return;
  bell.querySelector('b').textContent = count > 99 ? '99+' : String(count || 0);
  bell.classList.toggle('has-notifications', count > 0);
  const tabCount = document.querySelector('[data-account-pane-button="support"] b');
  if (tabCount) tabCount.textContent = count > 99 ? '99+' : String(count || 0);
}

function resizeProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) return reject(new Error('Choose an image file.'));
    if (file.size > 4 * 1024 * 1024) return reject(new Error('Choose an image smaller than 4 MB.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('The image could not be processed.'));
      image.onload = () => {
        const edge = 128;
        const scale = Math.max(edge / image.width, edge / image.height);
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = edge; canvas.height = edge;
        const context = canvas.getContext('2d');
        context.fillStyle = '#15120d'; context.fillRect(0, 0, edge, edge);
        context.drawImage(image, Math.round((edge - width) / 2), Math.round((edge - height) / 2), width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function showReleaseAccessControl(user) {
  if (user.email?.toLowerCase() !== HEAD_ADMIN_EMAIL) return;
  const [access, people] = await Promise.all([
    getDoc(doc(db, 'elevateReleaseControl', 'admins')).catch(() => null),
    knownAccounts(user).catch(() => [{ name: user.displayName || 'My account', email: user.email }]),
  ]);
  const emails = access?.exists?.() ? access.data().emails || [] : [HEAD_ADMIN_EMAIL];
  const section = document.createElement('section');
  section.className = 'beta-admin';
  section.innerHTML = '<header><div><span>RELEASE DASHBOARD</span><h2>Private dashboard access</h2><p>Select exactly who can see the live local-build dashboard. Untick someone to remove their access.</p></div></header><footer><small></small><button type="button">Save dashboard access</button></footer>';
  const picker = accessPicker(people, emails);
  section.querySelector('header').after(picker);
  const status = section.querySelector('footer small');
  section.querySelector('button').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const selected = selectedFromPicker(picker);
    if (!selected.includes(HEAD_ADMIN_EMAIL)) selected.unshift(HEAD_ADMIN_EMAIL);
    button.disabled = true; status.textContent = 'Saving...';
    try {
      await setDoc(doc(db, 'elevateReleaseControl', 'admins'), { emails: [...new Set(selected)], updatedAt: serverTimestamp(), updatedBy: user.uid }, { merge: true });
      status.textContent = 'Saved. Those people can now see Release Dashboard in the website navigation.';
    } catch (error) { status.textContent = error?.code === 'permission-denied' ? 'Publish the latest Firestore rules first.' : 'Could not save dashboard access.'; }
    finally { button.disabled = false; }
  });
  mountAccountSection(section, 'releases');
}

async function showAccountControls(user, profile) {
  const [devices, organizations] = await Promise.all([
    getDocs(query(collection(db, 'elevateDevices'), where('ownerId', '==', user.uid))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'organizations'), where('createdBy', '==', user.uid))).catch(() => ({ docs: [] })),
  ]);
  const deviceEntries = devices.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  const teams = organizations.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  const groups = Array.isArray(profile.teamGroups) ? profile.teamGroups : [];
  const section = document.createElement('section');
  section.className = 'account-control-grid';
  section.innerHTML = `<article class="account-control"><span>PROFILE</span><h2>Your details</h2><p>Change the name and image shown around ElevateHub.</p><form data-account-name><label>DISPLAY NAME<input name="name" maxlength="70" value="${esc(profile.name || profile.displayName || user.displayName || '')}" required /></label><div><small></small><button type="submit">Save name</button></div></form><form data-account-photo><label>PROFILE IMAGE<input name="photo" type="file" accept="image/*" /></label><div><small>Stored as a compact 128 px image.</small><button type="submit">Save image</button></div></form></article><article class="account-control"><span>SECURITY</span><h2>Sign-in and recovery</h2><p>Password resets are handled by Firebase and emailed securely to your current address.</p><form data-account-email><label>NEW EMAIL ADDRESS<input name="email" type="email" value="${esc(user.email || '')}" required /></label><div><small></small><button type="submit">Verify new email</button></div></form><form data-account-password><div><small></small><button type="submit">Send password reset</button></div></form></article><article class="account-control wide"><span>YOUR COMPUTERS</span><h2>ElevateHub devices</h2><p>Computers appear while they are signed in and running ElevateHub.</p><div class="account-computer-list">${deviceEntries.length ? deviceEntries.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))).map((device) => `<div class="account-computer"><div><strong>${esc(device.name || 'ElevateHub computer')}</strong><small>${esc(device.platform || 'Desktop')} · Last seen ${esc(formatSupportTime(device.lastSeenAt))}</small></div><b>${device.presence === 'online' ? 'ONLINE' : 'LAST SEEN'}</b></div>`).join('') : '<small>No ElevateHub computers have checked in yet.</small>'}</div></article><article class="account-control wide"><span>TEAM STRUCTURE</span><h2>Your Teams and Groups</h2><p>Everything connected to this account, without needing to open the desktop app first.</p><div class="account-groups">${groups.length ? groups.map((group) => `<span>${esc(group.name || 'Untitled group')}</span>`).join('') : '<small>No service groups yet.</small>'}</div><div class="account-team-list">${teams.length ? teams.map((team) => { const group = groups.find((candidate) => candidate.id === team.teamGroupId); const people = Array.isArray(team.teamMembers) ? team.teamMembers.filter((member) => member.active !== false).length : 0; return `<div class="account-team"><div><strong>${esc(team.name || 'Untitled team')}</strong><small>${esc(group?.name || 'Ungrouped')} · ${people} ${people === 1 ? 'operator' : 'operators'}</small></div><small>${esc(team.mode || 'team')}</small></div>`; }).join('') : '<small>No cloud Teams yet. Create one from Profile in ElevateHub.</small>'}</div></article>`;
  const nameForm = section.querySelector('[data-account-name]');
  nameForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = new FormData(nameForm).get('name').trim();
    const status = nameForm.querySelector('small'); const button = nameForm.querySelector('button');
    button.disabled = true; status.textContent = 'Saving...';
    try {
      await updateProfile(user, { displayName: name });
      await Promise.all([
        setDoc(doc(db, 'users', user.uid), { name, displayName: name, updatedAt: serverTimestamp() }, { merge: true }),
        setDoc(doc(db, 'elevatePeople', user.uid), { name, ownerId: user.uid, email: String(user.email || '').toLowerCase(), initials: initials(name), updatedAt: serverTimestamp() }, { merge: true }),
      ]);
      document.querySelector('[data-profile-name]').textContent = `Welcome, ${name}`;
      document.querySelector('[data-side-name]').textContent = name;
      document.querySelector('[data-avatar]').textContent = initials(name);
      status.textContent = 'Saved.';
    } catch { status.textContent = 'Name could not be saved.'; }
    finally { button.disabled = false; }
  });
  const photoForm = section.querySelector('[data-account-photo]');
  photoForm.classList.add('profile-photo-form');
  const photoPreview = document.createElement('div');
  photoPreview.className = 'profile-photo-preview';
  photoPreview.textContent = initials(profile.name || profile.displayName || user.displayName || user.email);
  if (profile.photoDataUrl) photoPreview.style.backgroundImage = `url("${profile.photoDataUrl}")`;
  photoForm.prepend(photoPreview);
  photoForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = photoForm.querySelector('small'); const button = photoForm.querySelector('button');
    button.disabled = true; status.textContent = 'Preparing image...';
    try {
      const photoDataUrl = await resizeProfilePhoto(photoForm.photo.files[0]);
      if (photoDataUrl.length > 52000) throw new Error('That image is still too large.');
      await setDoc(doc(db, 'users', user.uid), { photoDataUrl, updatedAt: serverTimestamp() }, { merge: true });
      const avatar = document.querySelector('[data-avatar]');
      avatar.style.backgroundImage = `url("${photoDataUrl}")`; avatar.style.backgroundSize = 'cover'; avatar.textContent = '';
      photoPreview.style.backgroundImage = `url("${photoDataUrl}")`; photoPreview.textContent = '';
      status.textContent = 'Profile image saved.';
    } catch (error) { status.textContent = error.message || 'Image could not be saved.'; }
    finally { button.disabled = false; }
  });
  const emailForm = section.querySelector('[data-account-email]');
  emailForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = new FormData(emailForm).get('email').trim(); const status = emailForm.querySelector('small'); const button = emailForm.querySelector('button');
    if (email.toLowerCase() === String(user.email || '').toLowerCase()) { status.textContent = 'That is already your sign-in email.'; return; }
    button.disabled = true; status.textContent = 'Sending verification...';
    try { await verifyBeforeUpdateEmail(user, email); status.textContent = 'Verification sent. Confirm it from the new inbox to finish changing your email.'; }
    catch (error) { status.textContent = error.code === 'auth/requires-recent-login' ? 'Sign out and back in, then try again.' : 'Email verification could not be sent.'; }
    finally { button.disabled = false; }
  });
  const passwordForm = section.querySelector('[data-account-password]');
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault(); const status = passwordForm.querySelector('small'); const button = passwordForm.querySelector('button'); button.disabled = true; status.textContent = 'Sending...';
    try { await sendPasswordResetEmail(auth, user.email); status.textContent = 'Password-reset email sent.'; }
    catch { status.textContent = 'Password-reset email could not be sent.'; }
    finally { button.disabled = false; }
  });
  const cards = [...section.children];
  const profileControls = document.createElement('section');
  profileControls.className = 'account-control-grid';
  profileControls.append(...cards.slice(0, 2));
  const deviceControls = document.createElement('section');
  deviceControls.className = 'account-control-grid single';
  deviceControls.append(cards[2]);
  const teamControls = document.createElement('section');
  teamControls.className = 'account-control-grid single';
  teamControls.append(cards[3]);
  mountAccountSection(profileControls, 'profile');
  mountAccountSection(deviceControls, 'devices');
  mountAccountSection(teamControls, 'teams');
}

function formatSupportTime(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : 'Just now';
}

async function showSupportInbox(user) {
  const isHeadAdmin = user.email?.toLowerCase() === HEAD_ADMIN_EMAIL;
  const tickets = isHeadAdmin
    ? await getDocs(collection(db, 'elevateSupportRequests'))
    : await getDocs(query(collection(db, 'elevateSupportRequests'), where('requesterId', '==', user.uid)));
  const entries = tickets.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
    .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  const unread = entries.filter((entry) => isHeadAdmin ? entry.unreadForAdmin : entry.unreadForRequester).length;
  const section = document.createElement('section');
  section.className = 'support-inbox';
  section.id = 'support-updates';
  section.innerHTML = `<header><div><span>${isHeadAdmin ? 'ELEVATEHUB SUPPORT' : 'YOUR FIX REQUESTS'}</span><h2>${isHeadAdmin ? 'Fix inbox' : 'Support updates'}</h2><p>${isHeadAdmin ? 'Private requests sent from the Support page.' : 'Replies from ElevateHub Support appear here.'}</p></div>${unread ? `<b>${unread} NEW</b>` : ''}</header><div class="support-ticket-list"></div>`;
  const list = section.querySelector('.support-ticket-list');
  updateNotificationBell(unread);
  if (!entries.length) list.innerHTML = `<p class="support-inbox-empty">${isHeadAdmin ? 'No support requests right now.' : 'No support requests yet. Open Support whenever you need a hand.'}</p>`;
  entries.forEach((ticket) => {
    const card = document.createElement('article');
    const isUnread = isHeadAdmin ? ticket.unreadForAdmin : ticket.unreadForRequester;
    card.className = `support-ticket${isUnread ? ' unread' : ''}`;
    const requester = isHeadAdmin ? `<small>${esc(ticket.requesterName || 'ElevateHub user')} · ${esc(ticket.requesterEmail || '')}</small>` : `<small>${ticket.status === 'replied' ? 'Reply received' : 'Waiting for ElevateHub Support'} · ${esc(formatSupportTime(ticket.updatedAt || ticket.createdAt))}</small>`;
    card.innerHTML = `<div class="support-ticket-head"><div><strong>${esc(ticket.subject || 'Support request')}</strong>${requester}</div><small>${esc(formatSupportTime(ticket.createdAt))}</small></div><p>${esc(ticket.details || '')}</p>${ticket.replyText ? `<div class="support-reply"><span>REPLY FROM ELEVATEHUB</span><p>${esc(ticket.replyText)}</p></div>` : ''}`;
    if (isHeadAdmin) {
      const mailSubject = encodeURIComponent(`ElevateHub support: ${ticket.subject || 'Fix request'}`);
      const mailBody = encodeURIComponent(`Hi ${ticket.requesterName || ''},\n\nRegarding your ElevateHub support request:\n\n`);
      const form = document.createElement('form');
      form.className = 'support-reply-form';
      form.innerHTML = `<textarea maxlength="4000" placeholder="Write a private reply..."></textarea><div class="support-reply-actions"><small></small><div><a href="mailto:${encodeURIComponent(ticket.requesterEmail || '')}?subject=${mailSubject}&body=${mailBody}">Email copy</a><button type="submit">Send reply</button></div></div>`;
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const reply = form.querySelector('textarea').value.trim();
        const status = form.querySelector('small');
        if (!reply) { status.textContent = 'Write a reply first.'; return; }
        const button = form.querySelector('button');
        button.disabled = true; status.textContent = 'Sending...';
        try {
          await updateDoc(doc(db, 'elevateSupportRequests', ticket.id), { replyText: reply, replyAt: serverTimestamp(), status: 'replied', unreadForAdmin: false, unreadForRequester: true, updatedAt: serverTimestamp() });
          status.textContent = 'Reply sent. It is now waiting in their account.';
          card.classList.remove('unread');
        } catch (error) { status.textContent = error?.code === 'permission-denied' ? 'Publish the latest Firestore rules first.' : 'Reply could not be sent.'; }
        finally { button.disabled = false; }
      });
      card.appendChild(form);
    } else if (ticket.unreadForRequester) {
      updateDoc(doc(db, 'elevateSupportRequests', ticket.id), { unreadForRequester: false, requesterLastReadAt: serverTimestamp() }).catch(() => {});
    }
    list.appendChild(card);
  });
  mountAccountSection(section, 'support');
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
  setDoc(doc(db, 'elevatePeople', user.uid), {
    ownerId: user.uid,
    name: user.displayName || profile.name || user.email?.split('@')[0] || 'ElevateHub user',
    email: String(user.email || '').trim().toLowerCase(),
    initials: initials(user.displayName || profile.name || user.email),
    presence: 'online',
    lastSeenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true }).catch((error) => console.warn('[ElevateHub] Website identity could not be updated:', error?.code || error));
  setDoc(doc(db, 'users', user.uid), {
    email: String(user.email || '').trim().toLowerCase(),
    updatedAt: serverTimestamp(),
  }, { merge: true }).catch((error) => console.warn('[ElevateHub] Website profile could not be updated:', error?.code || error));

  document.querySelector('[data-profile-name]').textContent = `Welcome, ${name}`;
  document.querySelector('[data-profile-email]').textContent = user.email;
  document.querySelector('[data-side-name]').textContent = name;
  document.querySelector('[data-side-team]').textContent = profile.organizationName || profile.teamName || (profile.mode === 'organization' ? 'Team workspace' : 'Personal workspace');
  document.querySelector('[data-avatar]').textContent = initials(name);
  if (profile.photoDataUrl) {
    const avatar = document.querySelector('[data-avatar]');
    avatar.style.backgroundImage = `url("${profile.photoDataUrl}")`;
    avatar.style.backgroundSize = 'cover';
    avatar.textContent = '';
  }
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
  initializeAccountPanes();
  showAccountControls(user, profile).catch((error) => console.warn('[ElevateHub] Account controls could not load:', error));
  showPrivateBetas(user).catch((error) => console.warn('[ElevateHub] Private betas could not load:', error));
  showBetaAdmin(user).catch((error) => console.warn('[ElevateHub] Beta administration could not load:', error));
  showReleaseAccessControl(user).catch((error) => console.warn('[ElevateHub] Release access could not load:', error));
  showSupportInbox(user).catch((error) => console.warn('[ElevateHub] Support inbox could not load:', error));
}

authReady.then(() => onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.replace('login.html?next=account.html');
    return;
  }
  if (!user.emailVerified) {
    location.replace('verify-email.html');
    return;
  }
  show(user).catch((error) => {
    console.error('[ElevateHub] Account could not load:', error);
    loading.querySelector('strong').textContent = 'Account could not load';
    loading.querySelector('p').textContent = 'Check your connection and refresh this page.';
  });
}));
