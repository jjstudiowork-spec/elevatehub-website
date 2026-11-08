import { auth, authReady, db, doc, getDoc, onAuthStateChanged } from './firebase-web.js';

const HEAD_ADMIN_EMAIL = 'jjstudiowork@gmail.com';
const id = Number(new URLSearchParams(location.search).get('id'));
const command = document.querySelector('[data-command]');
const loading = document.querySelector('[data-loading]');
const errorPanel = document.querySelector('[data-error]');
const activityFeed = document.querySelector('[data-activity-feed]');
let currentUser = null;
let latestPayload = null;
let technical = false;
let refreshing = false;

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const title = value => String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const time = value => value ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(value)) : '';
const size = bytes => bytes > 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const stateClass = item => item?.conclusion === 'failure' || item?.conclusion === 'cancelled' ? 'failed' : item?.conclusion === 'success' ? 'complete' : item?.status === 'in_progress' || item?.status === 'queued' ? 'active' : '';

async function permitted(user) {
  if (String(user?.email || '').toLowerCase() === HEAD_ADMIN_EMAIL) return true;
  const access = await getDoc(doc(db, 'elevateReleaseControl', 'admins'));
  return access.exists() && (access.data().emails || []).includes(String(user?.email || '').toLowerCase());
}

async function api(method = 'GET', body) {
  const token = await currentUser.getIdToken();
  const suffix = method === 'GET' ? `?view=command&id=${id}&t=${Date.now()}` : '';
  const response = await fetch(`/.netlify/functions/release-control${suffix}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify({ id, ...body }) } : {}), cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Release command centre is unavailable.');
  return payload;
}

function laneFor(job) { const name = String(job.name || '').toLowerCase(); return name.includes('macos') || name.includes('mac os') ? 'macos' : name.includes('windows') ? 'windows' : 'shared'; }
function platformEnabled(request, lane) { return request.platforms === 'both' || request.platforms === lane; }

function renderLane(lane, jobs, enabled) {
  const element = document.querySelector(`[data-lane="${lane}"]`);
  element.classList.toggle('disabled', !enabled);
  const relevant = jobs.filter(job => laneFor(job) === lane);
  const state = element.querySelector('[data-lane-state]');
  if (!enabled) state.textContent = 'NOT SELECTED';
  else if (relevant.some(job => stateClass(job) === 'failed')) state.textContent = 'FAILED';
  else if (relevant.some(job => stateClass(job) === 'active')) state.textContent = 'BUILDING';
  else if (relevant.length && relevant.every(job => stateClass(job) === 'complete')) state.textContent = 'COMPLETE';
  else state.textContent = 'WAITING';
  element.querySelector('[data-lane-jobs]').innerHTML = !enabled ? '<p class="empty-lane">This platform is not included in this release.</p>' : relevant.length ? relevant.map(job => `<div class="job-row ${stateClass(job)}"><i></i><strong>${esc(job.name)}</strong><span>${esc(job.conclusion || job.status)}</span></div>`).join('') : '<p class="empty-lane">GitHub is preparing this build lane.</p>';
}

function phaseData(payload) {
  const jobs = payload.jobs || [];
  const match = pattern => jobs.filter(job => pattern.test(job.name));
  return [['Validate',match(/prepare release/i)],['Build',match(/build macos|build windows/i)],['Package',match(/publish completed source/i)],['Publish',match(/publish public downloads/i)],['Complete',match(/complete release status/i)]].map(([label,list]) => {
    if (!list.length) return { label, state: '' };
    if (list.some(job => stateClass(job) === 'failed')) return { label, state: 'failed' };
    if (list.every(job => stateClass(job) === 'complete')) return { label, state: 'complete' };
    if (list.some(job => stateClass(job) === 'active')) return { label, state: 'active' };
    return { label, state: '' };
  });
}

function renderActivity(jobs) {
  const entries = jobs.flatMap(job => (job.steps || []).map(step => ({ ...step, job: job.name }))).sort((a,b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));
  activityFeed.classList.toggle('technical', technical);
  activityFeed.innerHTML = entries.length ? entries.map((step,index) => `<article class="activity-item"><b>${stateClass(step) === 'complete' ? '✓' : stateClass(step) === 'failed' ? '!' : index + 1}</b><div><strong>${esc(step.name)}</strong><p>${esc(step.job)} · Step ${esc(step.number)} · ${esc(step.conclusion || step.status)}</p></div><time>${esc(time(step.completedAt || step.startedAt))}</time></article>`).join('') : '<p class="empty-lane">Workflow activity will appear here as GitHub starts each step.</p>';
}

function render(payload) {
  latestPayload = payload;
  const request = payload.request || {}, run = payload.run, jobs = payload.jobs || [];
  const product = request.product === 'hub' ? 'ElevateHub' : request.product === 'flow' ? 'ElevateFlow' : 'Elevate Suite';
  const platforms = request.platforms === 'both' ? 'macOS + Windows' : request.platforms === 'windows' ? 'Windows' : 'macOS';
  document.querySelector('[data-command-version]').textContent = request.version ? `v${request.version}` : `Release #${request.id}`;
  document.title = `${request.version ? `v${request.version}` : 'Release'} Command Centre | ElevateHub`;
  document.querySelector('[data-command-summary]').textContent = request.message || 'Release workflow connected.';
  document.querySelector('[data-command-product]').textContent = product;
  document.querySelector('[data-command-platforms]').textContent = platforms;
  document.querySelector('[data-command-engine]').textContent = request.provider === 'github' ? 'GitHub Actions' : 'ElevateRelease';
  document.querySelector('[data-command-notes]').textContent = request.notes || 'No release notes were provided.';
  const status = run?.conclusion || run?.status || request.status || 'queued';
  const orb = document.querySelector('[data-command-orb]');
  orb.className = `orb ${status === 'success' || status === 'released' ? 'success' : status === 'failure' || status === 'cancelled' ? 'failure' : 'running'}`;
  document.querySelector('[data-command-state]').textContent = title(status).toUpperCase();
  document.querySelector('[data-command-updated]').textContent = run?.updatedAt ? `Updated ${time(run.updatedAt)}` : 'Waiting for workflow connection';
  const allSteps = jobs.flatMap(job => job.steps || []), complete = allSteps.filter(step => step.conclusion === 'success' || step.conclusion === 'skipped').length;
  const percent = status === 'success' ? 100 : allSteps.length ? Math.min(96, Math.round((complete / allSteps.length) * 100)) : 2;
  document.querySelector('[data-progress-percent]').textContent = `${percent}%`;
  document.querySelector('[data-progress-bar]').style.width = `${percent}%`;
  const active = jobs.find(job => job.status === 'in_progress') || jobs.find(job => job.status === 'queued');
  document.querySelector('[data-progress-copy]').textContent = status === 'success' ? 'Release completed successfully' : status === 'failure' ? 'A build stage needs attention' : active ? active.name : 'Waiting for the next build stage';
  document.querySelector('[data-phase-strip]').innerHTML = phaseData(payload).map(phase => `<li class="${phase.state}">${esc(phase.label)}</li>`).join('');
  renderLane('macos', jobs, platformEnabled(request,'macos')); renderLane('windows', jobs, platformEnabled(request,'windows')); renderActivity(jobs);
  document.querySelector('[data-repositories]').innerHTML = (payload.repositories || []).map(repo => `<a class="repo-row ${repo.available ? 'online' : ''}" href="${esc(repo.url || `https://github.com/${repo.repository}`)}" target="_blank" rel="noreferrer"><i></i><div><strong>${esc(repo.label)}</strong><small>${esc(repo.repository)}</small></div><b>${esc(repo.reference || (repo.available ? 'READY' : 'WAIT'))}</b></a>`).join('');
  document.querySelector('[data-artifact-count]').textContent = payload.artifacts?.length ? `${payload.artifacts.length} files published` : 'Waiting for packages';
  document.querySelector('[data-artifacts]').innerHTML = payload.artifacts?.length ? payload.artifacts.map(asset => `<a class="artifact-row" href="${esc(asset.url)}"><span>↓</span><div><strong>${esc(asset.name)}</strong><small>${esc(size(asset.size))}</small></div></a>`).join('') : '<p class="empty-lane">Installers and update files will appear here automatically.</p>';
  const githubLink = document.querySelector('[data-github-run]'); githubLink.hidden = !run?.url; if (run?.url) githubLink.href = run.url;
  document.querySelector('[data-cancel-run]').hidden = !run || run.status === 'completed';
  document.querySelector('[data-retry-run]').hidden = run?.conclusion !== 'failure';
}

async function refresh() {
  if (refreshing) return; refreshing = true;
  try { render(await api()); loading.hidden = true; errorPanel.hidden = true; command.hidden = false; }
  catch (error) { if (!latestPayload) { loading.hidden = true; command.hidden = true; errorPanel.hidden = false; document.querySelector('[data-error-copy]').textContent = error.message; } }
  finally { refreshing = false; }
}

document.querySelector('[data-toggle-technical]').addEventListener('click', event => { technical = !technical; event.currentTarget.textContent = technical ? 'Hide technical details' : 'Show technical details'; if (latestPayload) renderActivity(latestPayload.jobs || []); });
document.querySelector('[data-cancel-run]').addEventListener('click', async event => { if (!confirm('Cancel this running release workflow?')) return; event.currentTarget.disabled = true; try { await api('PATCH',{action:'cancel-run'}); await refresh(); } finally { event.currentTarget.disabled = false; } });
document.querySelector('[data-retry-run]').addEventListener('click', async event => { event.currentTarget.disabled = true; try { await api('PATCH',{action:'retry-run'}); await refresh(); } finally { event.currentTarget.disabled = false; } });
setInterval(() => { document.querySelector('[data-live-clock]').textContent = new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'}).format(new Date()); },1000);
authReady.then(() => onAuthStateChanged(auth, async user => { if (!user) return location.replace(`login.html?next=${encodeURIComponent(`release-command.html?id=${id}`)}`); if (!id || !await permitted(user)) return location.replace('release-dashboard.html'); currentUser = user; await refresh(); setInterval(refresh,10000); }));
