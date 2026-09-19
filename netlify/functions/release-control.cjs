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
    channel: data.channel || 'stable',
    status: data.status || (issue.state === 'closed' ? 'finished' : 'queued'),
    message: data.message || 'Waiting for the developer computer.',
    requestedBy: data.requestedBy || '',
    requestedAt: data.requestedAt || issue.created_at,
    updatedAt: data.updatedAt || issue.updated_at,
    steps: Array.isArray(data.steps) ? data.steps : [],
    logs: Array.isArray(data.logs) ? data.logs.slice(-30) : [],
  };
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

async function createRequest(user, body) {
  const platform = body.platform === 'windows' ? 'windows' : 'macos';
  const channel = body.channel === 'beta' ? 'beta' : 'stable';
  const now = new Date().toISOString();
  const payload = {
    platform, channel, status: 'queued', requestedBy: user.email, requestedAt: now, updatedAt: now,
    message: `Waiting for the ${platform === 'macos' ? 'macOS' : 'Windows'} release agent.`, logs: [], steps: [
      { id: 'claim', label: 'Developer computer accepts request', state: 'pending' },
      { id: 'build', label: `Build ${platform === 'macos' ? 'macOS' : 'Windows'} app`, state: 'pending' },
      { id: 'deploy', label: 'Deploy ElevateHub website', state: 'pending' },
    ],
  };
  const response = await github('/issues', 'application/vnd.github+json', 'follow', 'POST', JSON.stringify({
    title: `Release request: ${platform} ${channel} (${now})`, body: JSON.stringify(payload, null, 2), labels: [REQUEST_LABEL],
  }));
  if (!response.ok) throw new Error('The private release request could not be queued.');
  return issueData(await response.json());
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
      const [requests, agents] = await Promise.all([issues(REQUEST_LABEL), issues(AGENT_LABEL, 'open', 5)]);
      const heartbeat = agents.map(item => parseBody(item.body)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null;
      const online = heartbeat && Date.now() - new Date(heartbeat.updatedAt || 0).getTime() < 90000;
      return json(200, { agent: { online: Boolean(online), ...(heartbeat || {}) }, requests: requests.map(issueData) });
    }
    const body = parseBody(event.body);
    if (event.httpMethod === 'POST') return json(201, { request: await createRequest(user, body) });
    if (event.httpMethod === 'PATCH') return json(200, { request: await patchIssue(Number(body.id), body) });
    return json(405, { error: 'Method not allowed.' });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Release control failed.' });
  }
};
