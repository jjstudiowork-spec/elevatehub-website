const { authenticatedUser, github, json } = require('./_beta-auth.cjs');

const ADMIN_EMAIL = 'jjstudiowork@gmail.com';
const REQUEST_LABEL = 'elevate-release-request';
const AGENT_LABEL = 'elevate-release-agent';
const PROJECT_ID = 'elevateflow-sync';

function parseBody(value) {
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

function issueData(issue) {
  const data = parseBody(issue.body);
  return {
    id: issue.number,
    platform: data.platform || 'macos',
    platforms: data.platforms || data.platform || 'macos',
    product: data.product || 'suite',
    version: data.version || '',
    notes: data.notes || '',
    channel: data.channel || 'stable',
    provider: data.provider || 'elevate',
    status: data.status || (issue.state === 'closed' ? 'finished' : 'queued'),
    message: data.message || 'Waiting for the developer computer.',
    requestedBy: data.requestedBy || '',
    requestedAt: data.requestedAt || issue.created_at,
    updatedAt: data.updatedAt || issue.updated_at,
    steps: Array.isArray(data.steps) ? data.steps : [],
    logs: Array.isArray(data.logs) ? data.logs.slice(-30) : [],
  };
}

function nextPatch(version) {
  const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? `${match[1]}.${match[2]}.${Number(match[3]) + 1}` : '';
}

function compareVersions(left, right) {
  const a = String(left).split('.').map(Number);
  const b = String(right).split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

async function releaseVersion() {
  const response = await github('/releases/latest');
  if (!response.ok) return { current: '', next: '' };
  const release = await response.json();
  const current = String(release.tag_name || '').replace(/^v/, '');
  return { current, next: nextPatch(current) };
}

async function githubAvailability() {
  try {
    const [permissions, workflow, runs] = await Promise.all([
      github('/actions/permissions'),
      github('/actions/workflows/release.yml'),
      github('/actions/workflows/release.yml/runs?per_page=1'),
    ]);
    const permissionsData = permissions.ok ? await permissions.json() : {};
    const workflowData = workflow.ok ? await workflow.json() : {};
    const runsData = runs.ok ? await runs.json() : {};
    let runnersAvailable = true;
    const latestRun = runsData.workflow_runs?.[0];
    if (latestRun?.conclusion === 'failure') {
      const jobsResponse = await github(`/actions/runs/${latestRun.id}/jobs?per_page=100`);
      if (jobsResponse.ok) {
        const jobs = (await jobsResponse.json()).jobs || [];
        runnersAvailable = !jobs.some(job => job.conclusion === 'failure' && (!job.steps || job.steps.length === 0));
      }
    }
    const available = permissions.ok && workflow.ok && runs.ok && permissionsData.enabled !== false && workflowData.state === 'active' && runnersAvailable;
    return {
      available,
      reason: available
        ? 'GitHub Actions is available.'
        : !runnersAvailable
          ? 'GitHub Actions runners or usage are currently unavailable.'
          : 'GitHub Actions or the release workflow is unavailable.',
    };
  } catch {
    return { available: false, reason: 'GitHub could not be reached.' };
  }
}

async function dashboardMember(user) {
  if (user.email === ADMIN_EMAIL) return true;
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/elevateReleaseControl/admins`, {
    headers: { Authorization: `Bearer ${user.token}` },
  });
  if (!response.ok) return false;
  const payload = await response.json();
  const emails = payload.fields?.emails?.arrayValue?.values || [];
  return emails.some(item => String(item.stringValue || '').toLowerCase() === user.email);
}

async function issues(label, state = 'all', perPage = 20) {
  const response = await github(`/issues?labels=${encodeURIComponent(label)}&state=${state}&per_page=${perPage}&sort=updated&direction=desc`);
  if (!response.ok) throw new Error('Release control could not read its private queue.');
  return response.json();
}

async function createRequest(user, body, availability) {
  const platforms = ['macos', 'windows', 'both'].includes(body.platforms) ? body.platforms : 'both';
  const platform = platforms === 'both' ? 'both' : platforms;
  const product = ['suite', 'hub', 'flow'].includes(body.product) ? body.product : 'suite';
  const version = String(body.version || '').trim().replace(/^v/i, '');
  const notes = String(body.notes || '').trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Object.assign(new Error('Enter a version using X.Y.Z, such as 0.5.21.'), { statusCode: 400 });
  if (!notes) throw Object.assign(new Error('Add release notes before starting the release.'), { statusCode: 400 });
  const latest = await releaseVersion();
  if (latest.current && compareVersions(version, latest.current) <= 0) throw Object.assign(new Error(`Choose a version newer than v${latest.current}.`), { statusCode: 409 });
  const tagResponse = await github(`/git/ref/tags/v${encodeURIComponent(version)}`);
  if (tagResponse.ok) throw Object.assign(new Error(`v${version} already exists. Choose a newer version.`), { statusCode: 409 });
  const channel = body.channel === 'beta' ? 'beta' : 'stable';
  const now = new Date().toISOString();
  const requestedProvider = ['auto', 'github', 'elevate'].includes(body.provider) ? body.provider : 'auto';
  const provider = requestedProvider === 'auto' ? (availability.available ? 'github' : 'elevate') : requestedProvider;
  if (provider === 'github' && !availability.available) {
    throw Object.assign(new Error('GitHub Actions is unavailable. Choose ElevateRelease or Auto.'), { statusCode: 409 });
  }
  if (provider === 'elevate') throw Object.assign(new Error('Full releases now use GitHub Actions. ElevateRelease is reserved for recovery builds.'), { statusCode: 409 });
  const payload = {
    platform, platforms, product, version, notes, channel, provider, requestedProvider, status: 'queued', requestedBy: user.email, requestedAt: now, updatedAt: now,
    message: provider === 'github' ? 'Preparing the GitHub release workflow.' : `Waiting for the ${platform === 'macos' ? 'macOS' : 'Windows'} ElevateRelease agent.`, logs: [], steps: [
      { id: 'claim', label: provider === 'github' ? 'Validate and dispatch release' : 'Developer computer accepts request', state: 'pending' },
      { id: 'build', label: `Build ${product === 'suite' ? 'Elevate Suite' : product === 'hub' ? 'ElevateHub' : 'ElevateFlow'} for ${platforms === 'both' ? 'macOS and Windows' : platforms === 'macos' ? 'macOS' : 'Windows'}`, state: 'pending' },
      { id: 'deploy', label: 'Deploy ElevateHub website', state: 'pending' },
    ],
  };
  const response = await github('/issues', 'application/vnd.github+json', 'follow', 'POST', JSON.stringify({
    title: `Release request: ${platform} ${channel} (${now})`, body: JSON.stringify(payload, null, 2), labels: [REQUEST_LABEL],
  }));
  if (!response.ok) throw new Error('The private release request could not be queued.');
  const issue = await response.json();
  if (provider === 'github') {
    const dispatch = await github('/actions/workflows/release.yml/dispatches', 'application/vnd.github+json', 'follow', 'POST', JSON.stringify({
      ref: 'main',
      inputs: { version, release_notes: notes, product, platforms },
    }));
    if (!dispatch.ok) {
      const detail = await dispatch.text();
      throw new Error(`GitHub rejected the release workflow${detail ? `: ${detail.slice(0, 180)}` : '.'}`);
    }
    const dispatched = {
      ...payload,
      status: 'dispatched',
      message: `v${version} was sent to GitHub Actions. Builds are now running.`,
      updatedAt: new Date().toISOString(),
      steps: payload.steps.map((step, index) => index === 0 ? { ...step, state: 'complete' } : index === 1 ? { ...step, state: 'active' } : step),
    };
    const updated = await github(`/issues/${issue.number}`, 'application/vnd.github+json', 'follow', 'POST', JSON.stringify({ body: JSON.stringify(dispatched, null, 2), state: 'closed' }));
    return issueData(updated.ok ? await updated.json() : { ...issue, body: JSON.stringify(dispatched) });
  }
  return issueData(issue);
}

async function patchIssue(number, changes) {
  const all = await issues(REQUEST_LABEL, 'all', 100);
  const issue = all.find(item => item.number === number);
  if (!issue) throw Object.assign(new Error('Release request not found.'), { statusCode: 404 });
  const current = issueData(issue);
  if (changes.action === 'cancel' && !['queued', 'claimed'].includes(current.status)) {
    throw Object.assign(new Error('Only a queued release can be cancelled.'), { statusCode: 409 });
  }
  const response = await github(`/issues/${number}`, 'application/vnd.github+json', 'follow', 'POST', JSON.stringify({
    state: 'closed', body: JSON.stringify({ ...parseBody(issue.body), status: 'cancelled', message: 'Cancelled from Release Dashboard.', updatedAt: new Date().toISOString() }, null, 2),
  }));
  if (!response.ok) throw new Error('Release request could not be cancelled.');
  return issueData(await response.json());
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }, body: '' };
  try {
    const user = await authenticatedUser(event);
    if (!await dashboardMember(user)) return json(403, { error: 'This account does not have Release Dashboard access.' });
    if (event.httpMethod === 'GET') {
      const [requests, agents, availability, release] = await Promise.all([issues(REQUEST_LABEL), issues(AGENT_LABEL, 'open', 5), githubAvailability(), releaseVersion()]);
      const heartbeat = agents.map(item => parseBody(item.body)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null;
      const online = heartbeat && Date.now() - new Date(heartbeat.updatedAt || 0).getTime() < 90000;
      return json(200, { agent: { online: Boolean(online), ...(heartbeat || {}) }, github: availability, release, requests: requests.map(issueData) });
    }
    const body = parseBody(event.body);
    if (event.httpMethod === 'POST') return json(201, { request: await createRequest(user, body, await githubAvailability()) });
    if (event.httpMethod === 'PATCH') return json(200, { request: await patchIssue(Number(body.id), body) });
    return json(405, { error: 'Method not allowed.' });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Release control failed.' });
  }
};
