import { auth, authReady, db, doc, getDoc, onAuthStateChanged } from './firebase-web.js';

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
  const active = buildState === 'building';
  agentState.textContent = active ? 'VS Code agent is building' : buildState === 'released' ? 'Last release completed' : buildState === 'failed' ? 'Build needs attention' : 'Standing by';
  agentCopy.textContent = active ? 'The local Toolkit is publishing a real release now.' : 'Open VS Code with the ElevateHub Toolkit when you are ready to publish.';
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
  refresh();
  window.setInterval(refresh, 4000);
}));
