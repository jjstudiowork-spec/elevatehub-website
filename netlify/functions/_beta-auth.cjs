const FIREBASE_API_KEY = 'AIzaSyB0tMWZELsbEkHwxpyYLHBGoXjjv6w0lNI';
const REPOSITORY = 'jjstudiowork-spec/elevateflow';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

async function authenticatedEmail(event) {
  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Sign in to check private beta access.'), { statusCode: 401 });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });
  const payload = await response.json();
  const email = payload.users?.[0]?.email?.toLowerCase();
  if (!response.ok || !email) throw Object.assign(new Error('Your ElevateHub session has expired.'), { statusCode: 401 });
  return email;
}

async function github(path, accept = 'application/vnd.github+json', redirect = 'follow') {
  const token = process.env.ELEVATE_PRIVATE_REPO_TOKEN;
  if (!token) throw Object.assign(new Error('Private beta downloads are not configured.'), { statusCode: 503 });
  return fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, {
    headers: { Accept: accept, Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
    redirect,
  });
}

async function accessForRelease(release, email) {
  const asset = release.assets?.find(item => item.name === 'beta-access.json');
  if (!asset) return null;
  const response = await github(`/releases/assets/${asset.id}`, 'application/octet-stream');
  if (!response.ok) return null;
  const access = await response.json();
  return access.testers?.map(value => value.toLowerCase()).includes(email) ? access : null;
}

module.exports = { REPOSITORY, accessForRelease, authenticatedEmail, github, json };
