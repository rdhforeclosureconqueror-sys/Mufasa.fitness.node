'use strict';

const crypto = require('node:crypto');

const CONTRACT = 'leader_within_pocketpt_bridge_v1';
const VERSION = 1;
const OPAQUE_REF = /^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/;

class GarveyLaunchError extends Error {
  constructor(code, status = 401) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

const decodeJson = (value) => {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); }
  catch { throw new GarveyLaunchError('GARVEY_LAUNCH_CONTEXT_INVALID'); }
};

function parseReturnUrlAllowlist(raw) {
  return String(raw || '').split(',').map((value) => value.trim()).filter(Boolean).map((value) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('invalid');
      return url.href;
    } catch { throw new Error('GARVEY_LAUNCH_RETURN_URL_ALLOWLIST_INVALID'); }
  });
}

function verifyGarveyLaunchContext(context, { secret, returnUrlAllowlist, now = () => Date.now(), maxLifetimeSeconds = 300 } = {}) {
  if (!secret) throw new GarveyLaunchError('GARVEY_LAUNCH_NOT_CONFIGURED', 503);
  if (typeof context !== 'string' || context.length < 20 || context.length > 8192) throw new GarveyLaunchError('GARVEY_LAUNCH_CONTEXT_REQUIRED', 400);
  const parts = context.split('.');
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) throw new GarveyLaunchError('GARVEY_LAUNCH_CONTEXT_INVALID');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson(encodedHeader);
  if (header.alg !== 'HS256' || (header.typ != null && header.typ !== 'JWT')) throw new GarveyLaunchError('GARVEY_LAUNCH_CONTEXT_INVALID');
  const expected = crypto.createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest();
  const supplied = Buffer.from(encodedSignature, 'base64url');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) throw new GarveyLaunchError('GARVEY_LAUNCH_CONTEXT_INVALID');

  const payload = decodeJson(encodedPayload);
  const currentSeconds = Math.floor(now() / 1000);
  if (payload.contract !== CONTRACT || payload.contract_version !== VERSION) throw new GarveyLaunchError('GARVEY_LAUNCH_CONTRACT_INVALID');
  if (payload.issuer !== 'garvey' || payload.audience !== 'pocketpt') throw new GarveyLaunchError('GARVEY_LAUNCH_AUTHORITY_INVALID');
  if (!Number.isInteger(payload.issued_at) || !Number.isInteger(payload.expires_at)
    || payload.issued_at > currentSeconds + 30 || payload.expires_at <= currentSeconds
    || payload.expires_at <= payload.issued_at || payload.expires_at - payload.issued_at > maxLifetimeSeconds) {
    throw new GarveyLaunchError('GARVEY_LAUNCH_LIFETIME_INVALID');
  }
  if (!OPAQUE_REF.test(payload.subject_ref || '') || !OPAQUE_REF.test(payload.assignment_ref || '')) throw new GarveyLaunchError('GARVEY_LAUNCH_REFERENCE_INVALID');
  if (payload.provider !== 'pocketpt' || payload.source !== 'garvey' || payload.requirement !== 'movement') throw new GarveyLaunchError('GARVEY_LAUNCH_BINDING_INVALID');
  let canonicalReturnUrl;
  try { canonicalReturnUrl = new URL(payload.return_url).href; } catch { throw new GarveyLaunchError('GARVEY_LAUNCH_RETURN_URL_INVALID'); }
  if (!returnUrlAllowlist.includes(canonicalReturnUrl)) throw new GarveyLaunchError('GARVEY_LAUNCH_RETURN_URL_INVALID');
  return Object.freeze({ ...payload });
}

function createGarveyLaunchHandler({ env = process.env, now } = {}) {
  const enabled = env.GARVEY_INTEGRATION_ENABLED === 'true';
  const allowlist = parseReturnUrlAllowlist(env.GARVEY_LAUNCH_RETURN_URL_ALLOWLIST);
  return (req, res) => {
    if (!enabled) return res.status(404).type('text').send('Not found');
    try {
      verifyGarveyLaunchContext(req.query.context, {
        secret: env.GARVEY_LAUNCH_VERIFICATION_SECRET,
        returnUrlAllowlist: allowlist,
        now
      });
      // Verification authorizes entry only. Existing PocketPT identity, program,
      // readiness, safety, and completion boundaries remain authoritative.
      return res.redirect(303, '/pocketpt/my-program');
    } catch (error) {
      const status = error instanceof GarveyLaunchError ? error.status : 401;
      return res.status(status).json({ ok: false, error: { code: error.code || 'GARVEY_LAUNCH_CONTEXT_INVALID', message: 'Launch request rejected' } });
    }
  };
}

module.exports = { CONTRACT, VERSION, GarveyLaunchError, parseReturnUrlAllowlist, verifyGarveyLaunchContext, createGarveyLaunchHandler };
