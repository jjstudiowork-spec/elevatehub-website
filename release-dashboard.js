import { auth, authReady, db, doc, getDoc, onAuthStateChanged, setDoc } from './firebase-web.js';

// Add trusted release-manager addresses here. The page also checks Firebase
// sign-in before showing any release information.
const HEAD_ADMIN_EMAIL = 'jjstudiowork@gmail.com';
const dashboard = document.querySelector('[data-dashboard]');
const loading = document.querySelector('[data-loading]');
const version = document.querySelector('[data-release-version]');
const state = document.querySelector('[data-release-state]');
const message = document.querySelector('[data-release-message]');
const time = document.querySelector('[data-release-time]');
const steps = document.querySelector('[data-release-steps]');
const agentState = document.querySelector('[data-agent-state]');
const agentCopy = document.querySelector('[data-agent-copy]');
const requestButton = document.querySelector('[data-request-release]');
const platformSelect = document.querySelector('[data-release-platform]');
const channelSelect = document.querySelector('[data-release-channel]');
const feedback = document.querySelector('[data-dashboard-feedback]');
const requestList = document.querySelector('[data-release-requests]');
const refreshButton = document.querySelector('[data-refresh-dashboard]');
const engineControl = document.querySelector('[data-release-engine]');
const engineStatus = document.querySelector('[data-engine-status]');
let currentUser = null;
let agentOnline = false;
let agentReady = false;
let releaseEngine = 'auto';
let githubAvailable = false;
let githubReason = '';

function renderEngine() {
  engineControl.querySelectorAll('[data-engine]').forEach(button => {
    button.classList.toggle('active', button.dataset.engine === releaseEngine);
    button.disabled = String(currentUser?.email || '').toLowerCase() !== HEAD_ADMIN_EMAIL;
  });
  engineStatus.textContent = releaseEngine === 'auto'
    ? `Auto will use ${githubAvailable ? 'GitHub' : 'ElevateRelease'} right now.`
    : releaseEngine === 'github'
      ? (githubReason || (githubAvailable ? 'GitHub Actions is available.' : 'GitHub Actions is currently unavailable.'))
      : 'Builds and publishes on the trusted developer computer.';
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function formatTime(value) {
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) && date.getTime() > 0
    ? `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(date)}`
    : 'No local build has reported yet.';
}

function render(payload = {}) {
  const buildState = payload.status || 'waiting';
  version.textContent = payload.version || 'No release active';
  state.textContent = buildState.toUpperCase();
  state.dataset.state = buildState;
  message.textContent = payload.message || 'The dashboard will show each local build step here when a release starts.';
  time.textContent = formatTime(payload.updatedAt || payload.startedAt);
  const list = Array.isArray(payload.steps) ? payload.steps : [];
  steps.innerHTML = list.length ? list.map((step) => `<li class="${step.state || 'pending'}"><i></i><span>${step.label || step.id}</span><b>${String(step.state || 'pending').toUpperCase()}</b></li>`).join('') : '<li class="pending"><i></i><span>Waiting for a local release</span><b>READY</b></li>';
}

async function refresh() {
  try {
    const response = await fetch(`/updates/build-status.json?t=${Date.now()}`, { cache: 'no-store' });
    render(response.ok ? await response.json() : {});
  } catch {
    render({});
  }
}

async function controlApi(method = 'GET', payload) {
  const token = await currentUser.getIdToken();
  const response = await fetch('/.netlify/functions/release-control', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Release control is unavailable.');
  return body;
}

function renderRequests(requests = []) {
  if (!requests.length) {
    requestList.innerHTML = '<p>No website release requests yet.</p>';
    return;
  }
  requestList.innerHTML = requests.map(item => {
    const cancellable = ['queued', 'claimed'].includes(item.status);
    const retryable = ['failed', 'cancelled'].includes(item.status);
    const date = new Date(item.updatedAt || item.requestedAt || 0);
    return `<article class="request-row" data-status="${esc(item.status)}"><div><header><b>${esc(item.platform === 'windows' ? 'Windows' : 'macOS')} ${esc(item.channel)}</b><span>${esc(item.provider === 'github' ? 'GITHUB' : 'ELEVATERELEASE')}</span><span>${esc(String(item.status).toUpperCase())}</span></header><p>${esc(item.message)}</p><small>#${esc(item.id)} · ${esc(item.requestedBy)} · ${esc(Number.isFinite(date.getTime()) ? date.toLocaleString() : '')}</small></div><div class="request-actions">${cancellable ? `<button type="button" data-action="cancel" data-id="${esc(item.id)}">Cancel</button>` : ''}${retryable ? `<button type="button" data-action="retry" data-platform="${esc(item.platform)}" data-channel="${esc(item.channel)}">Retry</button>` : ''}</div></article>`;
  }).join('');
}

async function refreshControl() {
  try {
    const payload = await controlApi();
    githubAvailable = Boolean(payload.github?.available);
    githubReason = payload.github?.reason || '';
    agentOnline = Boolean(payload.agent?.online);
    const agentBusy = Boolean(payload.agent?.busy);
    agentReady = agentOnline && !agentBusy;
    const agentPlatform = payload.agent?.platform;
    [...platformSelect.options].forEach(option => { option.disabled = agentOnline && Boolean(agentPlatform) && option.value !== agentPlatform; });
    if (agentOnline && agentPlatform) platformSelect.value = agentPlatform;
    requestButton.disabled = !agentReady;
    agentState.textContent = agentOnline ? `${payload.agent.name || 'Developer computer'} ${agentBusy ? 'building' : 'online'}` : 'Developer computer offline';
    agentCopy.textContent = agentOnline ? `Release agent ${agentBusy ? 'is handling a release' : 'is ready'}${agentPlatform ? ` on ${agentPlatform}` : ''}.` : 'Open VS Code with the ElevateHub Toolkit on the trusted computer.';
    document.querySelector('[data-request-help]').textContent = agentOnline ? (agentBusy ? 'Another release is currently running.' : 'The agent is ready to accept a local build.') : 'The controls unlock while the VS Code release agent is online.';
    renderRequests(payload.requests);
    renderEngine();
  } catch (error) {
    requestButton.disabled = true;
    feedback.textContent = error.message;
  }
}

async function createRequest(platform = platformSelect.value, channel = channelSelect.value) {
  requestButton.disabled = true;
  feedback.textContent = 'Queuing release request...';
  try {
    await controlApi('POST', { platform, channel, provider: releaseEngine });
    feedback.textContent = `Release queued with ${releaseEngine === 'auto' ? (githubAvailable ? 'GitHub' : 'ElevateRelease') : releaseEngine === 'github' ? 'GitHub' : 'ElevateRelease'}.`;
    await refreshControl();
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    requestButton.disabled = !agentReady;
  }
}

requestButton.addEventListener('click', () => createRequest());
refreshButton.addEventListener('click', refreshControl);
engineControl.addEventListener('click', async event => {
  const button = event.target.closest('[data-engine]');
  if (!button || button.disabled) return;
  releaseEngine = button.dataset.engine;
  renderEngine();
  try {
    await setDoc(doc(db, 'elevateReleaseControl', 'admins'), { releaseProvider: releaseEngine }, { merge: true });
    feedback.textContent = `Default release engine set to ${button.textContent}.`;
  } catch (error) {
    feedback.textContent = error.message;
  }
});
requestList.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  button.disabled = true;
  try {
    if (button.dataset.action === 'cancel') await controlApi('PATCH', { id: Number(button.dataset.id), action: 'cancel' });
    else await createRequest(button.dataset.platform, button.dataset.channel);
    await refreshControl();
  } catch (error) {
    feedback.textContent = error.message;
  }
});

async function canUseDashboard(user) {
  if (String(user?.email || '').toLowerCase() === HEAD_ADMIN_EMAIL) return true;
  const access = await getDoc(doc(db, 'elevateReleaseControl', 'admins'));
  return access.exists() && (access.data().emails || []).includes(String(user?.email || '').toLowerCase());
}

authReady.then(() => onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.replace('login.html?next=release-dashboard.html');
    return;
  }
  let permitted = false;
  try { permitted = await canUseDashboard(user); } catch (error) { console.warn('[ElevateHub] Release access could not be checked:', error); }
  if (!permitted) {
    location.replace('account.html');
    return;
  }
  loading.hidden = true;
  dashboard.hidden = false;
  currentUser = user;
  try {
    const settings = await getDoc(doc(db, 'elevateReleaseControl', 'admins'));
    const saved = settings.data()?.releaseProvider;
    if (['auto', 'github', 'elevate'].includes(saved)) releaseEngine = saved;
  } catch {}
  renderEngine();
  refresh();
  refreshControl();
  window.setInterval(refresh, 4000);
  window.setInterval(refreshControl, 10000);
}));
