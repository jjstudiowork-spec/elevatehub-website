const { authenticatedEmail, github, json } = require('./_beta-auth.cjs');

const ADMIN_EMAIL = 'jjstudiowork@gmail.com';

function uniqueEmails(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim().toLowerCase())
    .filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))];
}

async function requireAdmin(event) {
  const email = await authenticatedEmail(event);
  if (email !== ADMIN_EMAIL) throw Object.assign(new Error('This page is limited to the ElevateHub head administrator.'), { statusCode: 403 });
}

async function manifestFor(release) {
  const asset = release.assets?.find(item => item.name === 'beta-access.json');
  if (!asset) return null;
  const response = await github(`/releases/assets/${asset.id}`, 'application/octet-stream');
  if (!response.ok) return null;
  return { asset, data: await response.json() };
}

async function uploadManifest(release, existingAsset, data) {
  if (existingAsset) {
    const removed = await github(`/releases/assets/${existingAsset.id}`, 'application/vnd.github+json', 'follow', 'DELETE');
    if (!removed.ok && removed.status !== 404) throw new Error('Could not replace the beta access list.');
  }
  const token = process.env.ELEVATE_PRIVATE_REPO_TOKEN;
  const response = await fetch(`https://uploads.github.com/repos/jjstudiowork-spec/elevateflow/releases/${release.id}/assets?name=beta-access.json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: JSON.stringify(data, null, 2),
  });
  if (!response.ok) throw new Error('GitHub could not save the beta access list.');
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }, body: '' };
  try {
    await requireAdmin(event);
    if (event.httpMethod === 'GET') {
      const response = await github('/releases?per_page=40');
      if (!response.ok) throw new Error('Could not read GitHub beta releases.');
      const releases = (await response.json()).filter(release => release.prerelease && release.tag_name.startsWith('private-beta-'));
      const result = await Promise.all(releases.map(async release => {
        const manifest = await manifestFor(release);
        return { id: release.id, version: release.tag_name.replace(/^private-beta-/, ''), notes: manifest?.data?.notes || release.body || '', testers: uniqueEmails(manifest?.data?.testers), platforms: manifest?.data?.platforms || 'both', products: manifest?.data?.products || 'hub', publishedAt: release.published_at };
      }));
      return json(200, { releases: result });
    }
    if (event.httpMethod !== 'PUT') return json(405, { error: 'Method not allowed.' });
    const body = JSON.parse(event.body || '{}');
    const releaseId = Number(body.releaseId);
    if (!Number.isFinite(releaseId)) return json(400, { error: 'Invalid beta release.' });
    const releaseResponse = await github(`/releases/${releaseId}`);
    if (!releaseResponse.ok) return json(404, { error: 'Beta release not found.' });
    const release = await releaseResponse.json();
    if (!release.prerelease || !release.tag_name.startsWith('private-beta-')) return json(400, { error: 'That release is not an ElevateHub private beta.' });
    const existing = await manifestFor(release);
    const next = { ...(existing?.data || {}), testers: uniqueEmails(body.testers), updatedAt: new Date().toISOString() };
    await uploadManifest(release, existing?.asset, next);
    return json(200, { testers: next.testers, updatedAt: next.updatedAt });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Could not manage beta access.' });
  }
};
