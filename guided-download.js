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
    const appName = details.product === 'Elevate Suite'
      ? 'ElevateHub.app /Applications/ElevateFlow.app'
      : details.product === 'ElevateFlow' ? 'ElevateFlow.app' : 'ElevateHub.app';
    const first = isPkg ? 'Open the package from Downloads and use the installer to select the Elevate apps you want.' : isZip ? 'Double-click the ZIP in Downloads to unpack the app.' : 'Open the DMG in Downloads, then drag the app into Applications.';
    const second = isPkg ? 'Finish the installer prompts, then find the installed app in Applications.' : 'Open the app from Applications when you are ready.';
    const command = isPkg
      ? `xattr -rd com.apple.quarantine ~/Downloads/${details.fileName}`
      : `xattr -rd com.apple.quarantine /Applications/${appName}`;
    return {
      title: `A clean macOS install for ${details.product}.`,
      intro: 'Your download has started. This takes about a minute.',
      steps: [first, second, 'If macOS shows a security message, use the quick fix beside these steps, then open the app again.'],
      command,
      securityTitle: isPkg ? 'Mac will not open the installer package?' : 'Mac says it cannot verify the app?',
      securityCopy: isPkg
        ? 'That is normal for a new independently distributed installer. First make sure the package name above is the one you chose, then paste this command into Terminal before opening it.'
        : 'That is normal for a new independently distributed build. First make sure the package name above is the one you chose, then paste this command into Terminal.',
      note: isPkg
        ? 'This command only removes the quarantine flag from the package in your Downloads folder.'
        : 'You only need to run this once, and only for a download you recognize from ElevateHub.'
    };
  }
  const first = isZip ? 'Open Downloads, right-click the ZIP file, then choose Extract All.' : 'Open the downloaded Setup file from your browser or Downloads folder.';
  const second = isZip ? 'Open the extracted folder and run ElevateFlow.' : 'Follow the installer prompts to finish setup.';
  return {
    title: `A clean Windows install for ${details.product}.`,
    intro: 'Your download has started. This takes about a minute.',
    steps: [first, second, 'If Microsoft Defender SmartScreen appears, use the safety check beside these steps before continuing.'],
    securityTitle: 'Windows Defender SmartScreen appeared?',
    securityCopy: 'Check that the package name above is the one you selected. If it is, choose More info, then Run anyway to continue.',
    note: 'Windows may warn about newer independent app publishers. Only continue when you recognize the file and downloaded it from ElevateHub.'
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function renderGuide(asset, version) {
  const name = fileName(asset.url);
  const details = packageDetails(name);
  details.fileName = name;
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
  const securityVisual = guide.command
    ? `<div class="terminal-card"><div class="terminal-top"><span></span><span></span><span></span><b>Terminal</b></div><div class="terminal-body"><span class="terminal-prompt">you@Mac ~ %</span><code>${escapeHtml(guide.command)}</code><span class="terminal-cursor"></span></div><button class="terminal-copy" type="button" data-copy-quarantine data-command="${escapeHtml(guide.command)}"><i data-lucide="copy"></i><span>Copy command</span></button></div>`
    : `<div class="smart-screen-card"><div class="smart-screen-icon"><i data-lucide="shield-alert"></i></div><div><small>WINDOWS SECURITY</small><strong>Check it. Then continue.</strong><p>Look for <b>More info</b>, verify the package name, then choose <b>Run anyway</b>.</p></div></div>`;
  content.innerHTML = `
    <div class="guide-package"><span class="guide-package-icon"><i data-lucide="${details.platform === 'macOS' ? 'laptop' : 'monitor'}"></i></span><div><span class="guide-package-label">SELECTED PACKAGE</span><strong>${escapeHtml(name)}</strong><small>${details.product} · ${details.platform} · ${details.extension}${asset.size ? ` · ${formatSize(asset.size)}` : ''}</small></div><span class="guide-ready"><i data-lucide="check"></i> Download started</span></div>
    <article class="guide-steps"><header><span class="guide-step-mark"><i data-lucide="sparkles"></i></span><div><span class="guide-kicker">YOUR NEXT THREE STEPS</span><h2>${guide.title}</h2><p>${guide.intro}</p></div></header><div class="guide-layout"><ol>${guide.steps.map((step, index) => `<li><b>${index + 1}</b><span>${step}</span></li>`).join('')}</ol><aside class="security-card"><span class="security-card-kicker">NEED A HAND?</span><h3>${guide.securityTitle}</h3><p>${guide.securityCopy}</p>${securityVisual}<p class="guide-note"><i data-lucide="circle-check"></i><span>${guide.note}</span></p></aside></div></article>`;
  content.querySelector('[data-copy-quarantine]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(button.dataset.command || '');
      button.innerHTML = '<i data-lucide="check"></i><span>Copied</span>';
      initializeIcons();
      window.setTimeout(() => { button.innerHTML = '<i data-lucide="copy"></i><span>Copy command</span>'; initializeIcons(); }, 1800);
    } catch (error) {
      console.warn('[ElevateHub site] Could not copy quarantine command:', error);
    }
  });
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
