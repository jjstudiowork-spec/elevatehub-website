const WEBSITE_RELEASE_API = '/updates/release.json';
const RELEASE_PAGE = 'releases.html';
const RELEASE_STATUS_URL = '/updates/build-status.json';

function initializeIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
}

async function initializeAccountNavigation() {
  try {
    const { auth, authReady, db, doc, getDoc, onAuthStateChanged } = await import('./firebase-web.js');
    await authReady;
    onAuthStateChanged(auth, async (user) => {
      document.querySelectorAll('[data-account-link]').forEach((link) => {
        link.href = user ? 'account.html' : 'login.html';
        link.textContent = user ? 'Account' : 'Sign In';
        link.removeAttribute('data-scramble');
      });
      document.querySelectorAll('[data-register-link]').forEach((link) => { link.hidden = Boolean(user); });
      const privateLinks = document.querySelectorAll('[data-release-dashboard-link], [data-admin-menu-link]');
      let canManageReleases = String(user?.email || '').toLowerCase() === 'jjstudiowork@gmail.com';
      if (user && !canManageReleases) {
        try {
          const access = await getDoc(doc(db, 'elevateReleaseControl', 'admins'));
          canManageReleases = access.exists() && (access.data().emails || []).includes(String(user.email || '').toLowerCase());
        } catch (error) {
          console.warn('[ElevateHub site] Release access could not be checked:', error);
        }
      }
      privateLinks.forEach((link) => { link.hidden = !canManageReleases; });
    });
  } catch (error) {
    console.warn('[ElevateHub site] Could not restore account navigation:', error);
  }
}

function chooseAsset(assets, platform) {
  const usable = assets.filter((asset) => !asset.name.endsWith('.sig') && asset.name !== 'latest.json');
  if (platform === 'mac') return usable.find((asset) => /\.dmg$/i.test(asset.name) && /universal|aarch64|x64/i.test(asset.name)) || usable.find((asset) => /\.(dmg|pkg)$/i.test(asset.name));
  return usable.find((asset) => /\.exe$/i.test(asset.name) && /setup|installer|nsis/i.test(asset.name)) || usable.find((asset) => /\.(exe|msi)$/i.test(asset.name));
}

function assetFileName(url) {
  try { return new URL(url, window.location.origin).pathname.split('/').pop() || ''; } catch { return ''; }
}

function guidedDownloadHref(version, asset) {
  if (!asset?.url) return RELEASE_PAGE;
  return `download.html?id=${encodeURIComponent(`${version}:${assetFileName(asset.url)}`)}`;
}

function relativeTime(value) {
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return '';
  const minutes = Math.max(1, Math.floor(elapsed / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

async function loadReleaseStatus() {
  const banners = document.querySelectorAll('[data-release-status]');
  if (!banners.length) return;
  try {
    const response = await fetch(`${RELEASE_STATUS_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Status returned ${response.status}`);
    const status = await response.json();
    const isBuilding = status.status === 'building';
    const completedAt = status.finishedAt ? new Date(status.finishedAt).getTime() : new Date(status.updatedAt || 0).getTime();
    const isRecent = completedAt && Date.now() - completedAt < 24 * 60 * 60 * 1000;
    banners.forEach((banner) => {
      if (!isBuilding && !(banner.dataset.showCompleted === 'true' && isRecent)) return;
      banner.dataset.status = status.status;
      const title = banner.querySelector('[data-release-status-title]');
      const message = banner.querySelector('[data-release-status-message]');
      const time = banner.querySelector('[data-release-status-time]');
      if (title) title.textContent = isBuilding ? `${status.version} is building now` : status.status === 'released' ? `${status.version} is available` : `${status.version} build failed`;
      if (message) message.textContent = status.message || (isBuilding ? 'Building macOS and Windows releases' : 'Release status updated');
      if (time) time.textContent = relativeTime(isBuilding ? status.startedAt : (status.finishedAt || status.updatedAt));
      banner.hidden = false;
    });
    if (isBuilding) window.setTimeout(loadReleaseStatus, 30000);
  } catch (error) {
    console.warn('[ElevateHub site] Could not load live release status:', error);
  }
}

async function loadRelease() {
  try {
    const response = await fetch(`${WEBSITE_RELEASE_API}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Website release returned ${response.status}`);
    const release = await response.json();
    const installers = Object.values(release.installers || {});
    const mac = chooseAsset(installers.map((asset) => ({ ...asset, name: assetFileName(asset.url) })), 'mac');
    const windows = chooseAsset(installers.map((asset) => ({ ...asset, name: assetFileName(asset.url) })), 'windows');
    if (!mac && !windows) throw new Error('Website release has no installers');
    document.querySelectorAll('[data-release-version]').forEach((node) => { node.textContent = `v${release.version}`; });
    document.querySelectorAll('[data-mac-download]').forEach((link) => { link.href = guidedDownloadHref(release.version, mac); });
    document.querySelectorAll('[data-windows-download]').forEach((link) => { link.href = guidedDownloadHref(release.version, windows); });
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform) || /Mac OS/.test(navigator.userAgent);
    const asset = isMac ? mac : windows;
    const primary = document.querySelector('[data-primary-download]');
    const note = document.querySelector('[data-download-note]');
    if (primary) {
      primary.href = guidedDownloadHref(release.version, asset);
      primary.querySelector('span').textContent = asset ? `Download for ${isMac ? 'macOS' : 'Windows'}` : 'View latest downloads';
    }
    if (note) note.textContent = asset ? `v${release.version} · ${isMac ? 'macOS installer' : '64-bit Windows installer'}` : 'Choose your installer from the latest release.';
  } catch (error) {
    console.warn('[ElevateHub site] Could not load website release metadata:', error);
    const note = document.querySelector('[data-download-note]');
    if (note) note.textContent = 'The next ElevateHub release is being prepared.';
  }
}

const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-button');
menuButton?.addEventListener('click', () => {
  const open = header.classList.toggle('menu-open');
  menuButton.setAttribute('aria-expanded', String(open));
});
header?.querySelectorAll('nav a').forEach((link) => link.addEventListener('click', () => { header.classList.remove('menu-open'); menuButton?.setAttribute('aria-expanded', 'false'); }));

document.querySelector('[data-copy-command]')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const command = button.parentElement.querySelector('code')?.textContent || '';
  await navigator.clipboard.writeText(command);
  button.innerHTML = '<i data-lucide="check"></i>';
  initializeIcons();
  window.setTimeout(() => { button.innerHTML = '<i data-lucide="copy"></i>'; initializeIcons(); }, 1600);
});

initializeIcons();
initializeAccountNavigation();
loadRelease();
loadReleaseStatus();

const supportSearch = document.querySelector('[data-support-search]');
supportSearch?.addEventListener('input', () => {
  const query = supportSearch.value.trim().toLowerCase();
  document.querySelectorAll('[data-search-terms]').forEach((item) => {
    item.hidden = Boolean(query) && !`${item.dataset.searchTerms} ${item.textContent}`.toLowerCase().includes(query);
  });
  document.querySelectorAll('[data-search-section]').forEach((section) => {
    section.hidden = Boolean(query) && !`${section.dataset.searchSection} ${section.textContent}`.toLowerCase().includes(query);
  });
});
