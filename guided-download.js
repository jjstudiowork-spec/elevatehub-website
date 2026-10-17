const HISTORY_URL = '/updates/history.json';

function fileName(url) {
  try { return new URL(url, window.location.origin).pathname.split('/').pop() || ''; } catch { return ''; }
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function packageDetails(name) {
  const lower = name.toLowerCase();
  const platform = /\.(dmg|pkg)$/i.test(name) || lower.includes('-macos-') ? 'macOS' : 'Windows';
  const product = lower.startsWith('elevate-suite') ? 'Elevate Suite' : lower.startsWith('elevateflow') ? 'ElevateFlow' : 'ElevateHub';
  const extension = name.match(/\.[^.]+$/)?.[0]?.toUpperCase() || 'PACKAGE';
  return { platform, product, extension };
}

function guideSteps(details) {
  const isMac = details.platform === 'macOS';
  const isPkg = details.extension === '.PKG';
  const isZip = details.extension === '.ZIP';
  if (isMac) {
    const first = isPkg ? 'Open the downloaded installer package, then select the Elevate apps you want to install.' : isZip ? 'In Downloads, double-click the ZIP file to unpack the app.' : 'In Downloads, double-click the DMG file, then drag the app into Applications.';
    const second = isPkg ? 'Follow the macOS installer prompts and enter your Mac password when asked.' : 'Open the app from Applications.';
    return { title: `Install ${details.product} on macOS`, intro: 'Your download should start automatically. Finder will show it in Downloads.', steps: [first, second, 'If macOS says it cannot verify the app, control-click the app, choose Open, then choose Open again.'], note: 'Only continue past a macOS security prompt when the downloaded file name above matches the Elevate package you selected.' };
  }
  const first = isZip ? 'Open Downloads, right-click the ZIP file, then choose Extract All.' : 'Open the downloaded Setup file from your browser or Downloads folder.';
  const second = isZip ? 'Open the extracted folder and run ElevateFlow.' : 'Follow the installer prompts to finish setup.';
  return { title: `Install ${details.product} on Windows`, intro: 'Your download should start automatically. Look in the browser download bar or Downloads folder.', steps: [first, second, 'If Microsoft Defender SmartScreen appears, first verify the file name above. Then choose More info and Run anyway only when you recognize it as your Elevate download.'], note: 'Windows may warn about a new independent app publisher. Check the file name and source before choosing Run anyway.' };
}

function renderGuide(asset, version) {
  const name = fileName(asset.url);
  const details = packageDetails(name);
  const guide = guideSteps(details);
  const title = document.querySelector('[data-guide-title]');
  const eyebrow = document.querySelector('[data-guide-eyebrow]');
  const subtitle = document.querySelector('[data-guide-subtitle]');
  const status = document.querySelector('[data-guide-status]');
  const button = document.querySelector('[data-guide-download]');
  const content = document.querySelector('[data-guide-content]');
  if (!content || !button) return;
  eyebrow.textContent = `${details.product.toUpperCase()} · ${details.platform.toUpperCase()}`;
  title.textContent = `Your ${details.product} download is ready.`;
  subtitle.textContent = 'The download begins automatically. Keep this page open for the exact installation steps.';
  status.textContent = `${version ? `v${version} · ` : ''}${details.platform} · ${details.extension} · ${formatSize(asset.size)}`;
  button.href = asset.url;
  button.setAttribute('download', '');
  button.querySelector('span').textContent = 'Download again';
  content.hidden = false;
  content.innerHTML = `
    <div class="guide-package"><i data-lucide="${details.platform === 'macOS' ? 'laptop' : 'monitor'}"></i><div><strong>${name}</strong><small>${details.product} · ${details.platform} · ${details.extension}${asset.size ? ` · ${formatSize(asset.size)}` : ''}</small></div></div>
    <article class="guide-steps"><header><i data-lucide="list-checks"></i><div><h2>${guide.title}</h2><p>${guide.intro}</p></div></header><ol>${guide.steps.map((step, index) => `<li><b>${index + 1}</b><span>${step}</span></li>`).join('')}</ol><p class="guide-note"><strong>Security prompt?</strong> ${guide.note}</p></article>`;
  initializeIcons();
  window.setTimeout(() => { window.location.assign(asset.url); }, 700);
}

async function loadGuide() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id || !id.includes(':')) {
    const title = document.querySelector('[data-guide-title]');
    const subtitle = document.querySelector('[data-guide-subtitle]');
    const status = document.querySelector('[data-guide-status]');
    const button = document.querySelector('[data-guide-download]');
    if (title) title.textContent = 'Choose an Elevate download.';
    if (subtitle) subtitle.textContent = 'Choose macOS or Windows first, then pick Hub, Flow, or the full Suite.';
    if (status) status.textContent = 'Each download includes its own short installation guide.';
    if (button) button.querySelector('span').textContent = 'View releases';
    return;
  }
  const [version, ...nameParts] = id.split(':');
  const name = nameParts.join(':');
  try {
    const response = await fetch(`${HISTORY_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Release history unavailable');
    const history = await response.json();
    const entry = (Array.isArray(history) ? history : []).find((release) => String(release.version) === version);
    const asset = entry && Object.values(entry.installers || {}).find((candidate) => fileName(candidate.url) === name);
    if (!asset) throw new Error('Download not found');
    renderGuide(asset, version);
  } catch (error) {
    console.warn('[ElevateHub site] Could not prepare guided download:', error);
    const status = document.querySelector('[data-guide-status]');
    if (status) status.textContent = 'This download link is no longer available. Please choose a current release.';
  }
}

loadGuide();
