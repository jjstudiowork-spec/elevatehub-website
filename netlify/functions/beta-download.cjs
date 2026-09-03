const { accessForRelease, authenticatedEmail, github, json } = require('./_beta-auth.cjs');

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }, body: '' };
  try {
    const email = await authenticatedEmail(event);
    const releaseId = String(event.queryStringParameters?.release || '');
    const assetId = String(event.queryStringParameters?.asset || '');
    if (!/^\d+$/.test(releaseId) || !/^\d+$/.test(assetId)) return json(400, { error: 'Invalid beta download.' });
    const releaseResponse = await github(`/releases/${releaseId}`);
    if (!releaseResponse.ok) return json(404, { error: 'Beta release not found.' });
    const release = await releaseResponse.json();
    const access = await accessForRelease(release, email);
    const asset = release.assets?.find(item => String(item.id) === assetId && item.name !== 'beta-access.json');
    if (!access || !asset) return json(403, { error: 'This account is not approved for that beta.' });
    const download = await github(`/releases/assets/${assetId}`, 'application/octet-stream', 'manual');
    const location = download.headers.get('location');
    if (!location) return json(502, { error: 'GitHub did not provide the beta download.' });
    return json(200, { downloadUrl: location, expires: 'short-lived' });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Private beta download failed.' });
  }
};
