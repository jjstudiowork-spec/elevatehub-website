const RELEASE_API = 'https://api.github.com/repos/jjstudiowork-spec/elevatehub-downloads/releases/latest';
const RELEASE_PAGE = 'releases.html';
const RELEASE_STATUS_URL = 'https://raw.githubusercontent.com/jjstudiowork-spec/elevatehub-downloads/main/release-status.json';

function initializeIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
}

function chooseAsset(assets, platform) {
  const usable = assets.filter((asset) => !asset.name.endsWith('.sig') && asset.name !== 'latest.json');
  if (platform === 'mac') return usable.find((asset) => /\.dmg$/i.test(asset.name) && /universal|aarch64|x64/i.test(asset.name)) || usable.find((asset) => /\.dmg$/i.test(asset.name));
  return usable.find((asset) => /\.exe$/i.test(asset.name) && /setup|installer|nsis/i.test(asset.name)) || usable.find((asset) => /\.(exe|msi)$/i.test(asset.name));
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
    const completedAt = status.finishedAt ? new Date(status.finishedAt).getTime() : 0;
    const isRecent = completedAt && Date.now() - completedAt < 24 * 60 * 60 * 1000;
    banners.forEach((banner) => {
      if (!isBuilding && !(banner.dataset.showCompleted === 'true' && isRecent)) return;
      banner.dataset.status = status.status;
      const title = banner.querySelector('[data-release-status-title]');
      const message = banner.querySelector('[data-release-status-message]');
      const time = banner.querySelector('[data-release-status-time]');
      if (title) title.textContent = isBuilding ? `${status.version} is building now` : status.status === 'released' ? `${status.version} is available` : `${status.version} build failed`;
      if (message) message.textContent = status.message || (isBuilding ? 'Building macOS and Windows releases' : 'Release status updated');
      if (time) time.textContent = relativeTime(isBuilding ? status.startedAt : status.finishedAt);
      banner.hidden = false;
    });
    if (isBuilding) window.setTimeout(loadReleaseStatus, 30000);
  } catch (error) {
    console.warn('[ElevateHub site] Could not load live release status:', error);
  }
}

async function loadRelease() {
  try {
    const response = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const release = await response.json();
    document.querySelectorAll('[data-release-version]').forEach((node) => { node.textContent = release.tag_name || 'Latest release'; });
    const mac = chooseAsset(release.assets || [], 'mac');
    const windows = chooseAsset(release.assets || [], 'windows');
    document.querySelectorAll('[data-mac-download]').forEach((link) => { link.href = mac?.browser_download_url || RELEASE_PAGE; });
    document.querySelectorAll('[data-windows-download]').forEach((link) => { link.href = windows?.browser_download_url || RELEASE_PAGE; });
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform) || /Mac OS/.test(navigator.userAgent);
    const asset = isMac ? mac : windows;
    const primary = document.querySelector('[data-primary-download]');
    const note = document.querySelector('[data-download-note]');
    if (primary) {
      primary.href = asset?.browser_download_url || RELEASE_PAGE;
      primary.querySelector('span').textContent = asset ? `Download for ${isMac ? 'macOS' : 'Windows'}` : 'View latest downloads';
    }
    if (note) note.textContent = asset ? `${release.tag_name} · ${isMac ? 'Universal macOS build' : '64-bit Windows installer'}` : 'Choose your installer from the latest GitHub release.';
  } catch (error) {
    console.warn('[ElevateHub site] Could not load release metadata:', error);
    const note = document.querySelector('[data-download-note]');
    if (note) note.textContent = 'Open the latest GitHub release to choose your download.';
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
