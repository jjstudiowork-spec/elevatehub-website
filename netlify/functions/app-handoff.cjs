const crypto = require('node:crypto');
const { authenticatedUser, json } = require('./_beta-auth.cjs');
const { customToken, googleAccessToken } = require('./_app-token.cjs');

const REQUEST_PATTERN = /^[A-Za-z0-9]{32}$/;
const SECRET_PATTERN = /^[A-Za-z0-9]{64}$/;
const MAX_AGE_MS = 5 * 60 * 1000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const documentUrl = request => `https://firestore.googleapis.com/v1/projects/elevateflow-sync/databases/(default)/documents/elevateAppHandoffs/${request}`;

async function firestoreRequest(request, method, payload) {
  const accessToken = await googleAccessToken();
  const response = await fetch(documentUrl(request), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}));
    throw Object.assign(new Error(failure.error?.message || 'Could not access the app sign-in handoff.'), { statusCode: 503 });
  }
  if (response.status === 204) return {};
  return response.json();
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  try {
    const body = JSON.parse(event.body || '{}');
    if (!REQUEST_PATTERN.test(body.request || '') || !SECRET_PATTERN.test(body.secret || '')) return json(400, { error: 'Invalid app sign-in request.' });
    if (body.action === 'complete') {
      const user = await authenticatedUser(event);
      if (!user.uid) return json(401, { error: 'Your website session could not be verified.' });
      const handoff = { secretHash: hash(body.secret), customToken: customToken(user.uid), email: user.email, createdAt: Date.now() };
      await firestoreRequest(body.request, 'PATCH', {
        fields: { payload: { stringValue: JSON.stringify(handoff) } },
      });
      return json(200, { completed: true, email: user.email });
    }
    if (body.action !== 'poll') return json(400, { error: 'Invalid app sign-in action.' });
    const stored = await firestoreRequest(body.request, 'GET');
    if (!stored) return json(200, { pending: true });
    const handoff = JSON.parse(stored.fields?.payload?.stringValue || '{}');
    const expected = Buffer.from(String(handoff.secretHash || ''), 'hex');
    const actual = Buffer.from(hash(body.secret), 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return json(403, { error: 'This app sign-in request does not match.' });
    await firestoreRequest(body.request, 'DELETE');
    if (Date.now() - Number(handoff.createdAt || 0) > MAX_AGE_MS) return json(410, { error: 'Browser sign-in expired. Try again.' });
    return json(200, { customToken: handoff.customToken, email: handoff.email });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Website sign-in failed.' });
  }
};
