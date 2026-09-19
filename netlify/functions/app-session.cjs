const crypto = require('node:crypto');
const { authenticatedUser, json } = require('./_beta-auth.cjs');

function base64url(value) {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
}

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw Object.assign(new Error('Website sign-in is not configured yet.'), { statusCode: 503 });
  try {
    const account = JSON.parse(raw);
    if (!account.client_email || !account.private_key) throw new Error('missing fields');
    return account;
  } catch {
    throw Object.assign(new Error('Website sign-in configuration is invalid.'), { statusCode: 503 });
  }
}

function customToken(uid) {
  const account = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: 'RS256', typ: 'JWT' });
  const claims = base64url({
    iss: account.client_email,
    sub: account.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid,
  });
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), account.private_key).toString('base64url');
  return `${unsigned}.${signature}`;
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }, body: '' };
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
    const user = await authenticatedUser(event);
    if (!user.uid) return json(401, { error: 'Your website session could not be verified.' });
    return json(200, { customToken: customToken(user.uid), email: user.email });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Website sign-in failed.' });
  }
};
