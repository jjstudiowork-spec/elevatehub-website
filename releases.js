const RELEASES_API = '/updates/history.json';

function formatReleaseDate(value) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function classifyAsset(asset) {
  const name = asset.name.toLowerCase();
  const extension = name.match(/\.(dmg|pkg|exe|msi|zip)$/)?.[1];
  const isFlowArchive = name.startsWith('elevateflow-') && extension === 'zip';
  if (!extension || (!['dmg', 'pkg', 'exe', 'msi'].includes(extension) && !isFlowArchive)) return null;

  const macOS = ['dmg', 'pkg'].includes(extension) || name.includes('-macos-');
  const product = name.startsWith('elevate-suite') ? 'Elevate Suite'
    : name.startsWith('elevateflow') ? 'ElevateFlow'
      : 'ElevateHub';
  const platform = macOS ? 'macOS universal' : 'Windows 10/11 x64';
  return {
    product,
    productKey: product === 'Elevate Suite' ? 'suite' : product === 'ElevateFlow' ? 'flow' : 'hub',
    platform,
    platformKey: macOS ? 'macos' : 'windows',
    extension: `.${extension}`,
    size: formatSize(asset.size),
    icon: macOS ? 'laptop' : 'monitor',
  };
}

function downloadId(release, asset) {
  return `${String(release.tag_name || '').replace(/^v/, '')}:${asset.name}`;
}

function downloadPageHref(release, asset) {
  return `download.html?id=${encodeURIComponent(downloadId(release, asset))}`;
}

function releaseFromWebsite(entry) {
  return {
    tag_name: `v${entry.version || 'latest'}`,
    name: `ElevateHub v${entry.version || 'latest'}`,
    published_at: entry.publishedAt,
    body: entry.notes,
    assets: Object.values(entry.installers || {}).map((installer) => ({
      name: new URL(installer.url, window.location.origin).pathname.split('/').pop() || 'installer',
      browser_download_url: installer.url,
      size: installer.size,
    })),
  };
}

function makeReleaseCard(release, index) {
  const card = document.createElement('article');
  card.className = 'release-card motion-reveal';
  card.style.setProperty('--motion-delay', `${(index % 3) * 70}ms`);

  const side = document.createElement('div');
  side.className = 'release-card-side';
  const badge = document.createElement('span');
  badge.className = `release-badge${release.prerelease ? ' preview' : ''}`;
  badge.textContent = release.prerelease ? 'PREVIEW' : index === 0 ? 'LATEST' : 'RELEASE';
  const version = document.createElement('strong');
  version.textContent = release.tag_name || release.name || 'Release';
  const date = document.createElement('time');
  date.dateTime = release.published_at || '';
  date.textContent = formatReleaseDate(release.published_at);
  side.append(badge, version, date);

  const main = document.createElement('div');
  main.className = 'release-card-main';
  const title = document.createElement('h2');
  title.textContent = release.name && release.name !== release.tag_name ? release.name.replace('ElevateHub', 'Elevate') : `Elevate ${release.tag_name || ''}`.trim();
  const notes = document.createElement('p');
  notes.className = 'release-notes';
  notes.textContent = release.body?.trim() || 'Maintenance improvements and the latest ElevateHub installers.';
  main.append(title, notes);

  const usableAssets = (release.assets || []).map((asset) => ({ asset, type: classifyAsset(asset) })).filter(({ type }) => type);
  if (usableAssets.length) {
    const platforms = document.createElement('div');
    platforms.className = 'release-platforms';
    ['macos', 'windows'].forEach((platformKey) => {
      const platformAssets = usableAssets.filter(({ type }) => type.platformKey === platformKey);
      if (!platformAssets.length) return;
      const platform = document.createElement('section');
      platform.className = `release-platform release-platform-${platformKey}`;
      const platformTitle = document.createElement('header');
      platformTitle.innerHTML = `<i data-lucide="${platformKey === 'macos' ? 'laptop' : 'monitor'}"></i><span>${platformKey === 'macos' ? 'macOS' : 'Windows'}</span>`;
      const groups = document.createElement('div');
      groups.className = 'release-product-groups';
      ['hub', 'flow', 'suite'].forEach((productKey) => {
        const selection = platformAssets.find(({ type }) => type.productKey === productKey);
        if (!selection) return;
        const group = document.createElement('div');
        group.className = 'release-product-group';
        const label = document.createElement('span');
        label.className = 'release-product-label';
        label.textContent = selection.type.product;
        const link = document.createElement('a');
        link.className = 'release-asset';
        link.href = downloadPageHref(release, selection.asset);
        link.innerHTML = `<i data-lucide="download"></i>`;
        const copy = document.createElement('span');
        copy.className = 'release-asset-copy';
        const details = document.createElement('small');
        details.textContent = [selection.type.platform, selection.type.extension, selection.type.size].filter(Boolean).join(' · ');
        const action = document.createElement('strong');
        action.textContent = 'Download';
        copy.append(action, details);
        link.append(copy);
        group.append(label, link);
        groups.append(group);
      });
      platform.append(platformTitle, groups);
      platforms.append(platform);
    });
    main.append(platforms);
  }

  card.append(side, main);
  return card;
}

async function loadReleaseHistory() {
  const list = document.querySelector('[data-release-list]');
  const loading = document.querySelector('[data-releases-loading]');
  const errorState = document.querySelector('[data-releases-error]');
  if (!list) return;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${RELEASES_API}?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`Website release history returned ${response.status}`);
    const history = await response.json();
    const releases = Array.isArray(history) ? history.map(releaseFromWebsite) : [];
    if (!Array.isArray(releases) || !releases.length) throw new Error('No releases returned');
    releases.forEach((release, index) => list.append(makeReleaseCard(release, index)));
    initializeIcons();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      list.querySelectorAll('.release-card').forEach((card) => card.classList.add('motion-visible'));
    }));
  } catch (error) {
    console.warn('[ElevateHub site] Could not load release history:', error);
    errorState.hidden = false;
    initializeIcons();
  } finally {
    window.clearTimeout(timeout);
    if (loading) loading.hidden = true;
  }
}

loadReleaseHistory();
