'use strict';

const crypto = require('node:crypto');

const COOKIE = 'pocketpt_youth_csrf';
const HEADER = 'x-pocketpt-csrf';
function parseCookies(raw = '') { return Object.fromEntries(raw.split(';').map((item) => item.trim().split('=')).filter((item) => item.length === 2).map(([key, value]) => [key, decodeURIComponent(value)])); }
function createYouthCsrf({ secret }) {
  const key = String(secret || 'development-youth-csrf-key');
  const sign = (subject, nonce) => crypto.createHmac('sha256', key).update(`${subject}:${nonce}`).digest('base64url');
  function issue(subject) { const nonce = crypto.randomBytes(24).toString('base64url'); return `${nonce}.${sign(subject, nonce)}`; }
  function valid(subject, token) { const [nonce, signature, extra] = String(token || '').split('.'); if (!nonce || !signature || extra) return false; const expected = sign(subject, nonce); return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); }
  function requireToken(req, res, next) {
    const header = req.get(HEADER); const cookie = parseCookies(req.get('cookie'))[COOKIE];
    if (!header || header !== cookie || !valid(req.auth?.userId, header)) return res.status(403).json({ ok: false, error: { code: 'CSRF_INVALID', message: 'Refresh the page and try again.' }, requestId: req.requestId });
    next();
  }
  return { COOKIE, HEADER, issue, requireToken };
}
module.exports = { createYouthCsrf, COOKIE, HEADER };
