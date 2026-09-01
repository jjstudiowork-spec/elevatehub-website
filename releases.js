const RELEASES_API = 'https://api.github.com/repos/jjstudiowork-spec/elevatehub-downloads/releases?per_page=10';

function formatReleaseDate(value) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function classifyAsset(asset) {
  const name = asset.name.toLowerCase();
  if (name.endsWith('.dmg') || name.endsWith('.pkg')) return { label: 'Download for macOS', icon: 'laptop' };
  if (name.endsWith('.exe') || name.endsWith('.msi')) return { label: 'Download for Windows', icon: 'monitor' };
  return null;
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
  title.textContent = release.name && release.name !== release.tag_name ? release.name : `ElevateHub ${release.tag_name || ''}`.trim();
  const notes = document.createElement('p');
  notes.className = 'release-notes';
  notes.textContent = release.body?.trim() || 'Maintenance improvements and the latest ElevateHub installers.';
  main.append(title, notes);

  const usableAssets = (release.assets || []).map((asset) => ({ asset, type: classifyAsset(asset) })).filter(({ type }) => type);
  if (usableAssets.length) {
    const assets = document.createElement('div');
    assets.className = 'release-assets';
    usableAssets.forEach(({ asset, type }) => {
      const link = document.createElement('a');
      link.className = 'release-asset';
      link.href = asset.browser_download_url;
      link.innerHTML = `<i data-lucide="${type.icon}"></i><span>${type.label}</span>`;
      assets.append(link);
    });
    main.append(assets);
  }

  card.append(side, main);
  return card;
}

async function loadReleaseHistory() {
  const list = document.querySelector('[data-release-list]');
  const loading = document.querySelector('[data-releases-loading]');
  const errorState = document.querySelector('[data-releases-error]');
  if (!list) return;
  try {
    const response = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const releases = await response.json();
    if (!Array.isArray(releases) || !releases.length) throw new Error('No releases returned');
    releases.forEach((release, index) => list.append(makeReleaseCard(release, index)));
    loading.hidden = true;
    initializeIcons();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      list.querySelectorAll('.release-card').forEach((card) => card.classList.add('motion-visible'));
    }));
  } catch (error) {
    console.warn('[ElevateHub site] Could not load release history:', error);
    loading.hidden = true;
    errorState.hidden = false;
    initializeIcons();
  }
}

loadReleaseHistory();
