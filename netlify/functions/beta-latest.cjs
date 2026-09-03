const { accessForRelease, authenticatedEmail, github, json } = require('./_beta-auth.cjs');

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }, body: '' };
  try {
    const email = await authenticatedEmail(event);
    const response = await github('/releases?per_page=30');
    if (!response.ok) throw Object.assign(new Error('Could not read private beta releases.'), { statusCode: 502 });
    const releases = (await response.json()).filter(release => release.prerelease && release.tag_name.startsWith('private-beta-'));
    const platform = (event.queryStringParameters?.platform || '').toLowerCase();
    const product = (event.queryStringParameters?.product || 'hub').toLowerCase();

    for (const release of releases) {
      const access = await accessForRelease(release, email);
      if (!access) continue;
      const platformAllowed = access.platforms === 'both' || access.platforms === platform;
      const productAllowed = access.products === 'both' || access.products === product;
      if (!platformAllowed || !productAllowed) continue;
      const asset = release.assets.find(item => {
        const name = item.name.toLowerCase();
        if (product === 'flow') return name.startsWith('elevateflow-') && (platform === 'macos' ? name.endsWith('-macos.zip') : name.endsWith('-windows.zip'));
        return platform === 'macos' ? name.endsWith('.dmg') : name.endsWith('.exe');
      });
      if (!asset) continue;
      const origin = `https://${event.headers.host}`;
      return json(200, {
        channel: 'beta', version: access.version, notes: access.notes || release.body || '',
        date: release.published_at, platform, product,
        downloadUrl: `${origin}/.netlify/functions/beta-download?release=${release.id}&asset=${asset.id}`,
      });
    }
    return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Private beta check failed.' });
  }
};
