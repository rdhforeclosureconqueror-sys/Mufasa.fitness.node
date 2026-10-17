"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SCRYPT_KEY_LENGTH = 64;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

const ATTRIBUTION_KEYS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
function normalizeAttribution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const fields = Object.fromEntries(ATTRIBUTION_KEYS.map(key => [key, typeof value[key] === "string" ? value[key].trim().slice(0,128) : ""]).filter(([,v]) => v));
  return Object.keys(fields).length ? fields : null;
}

function createAuthCredentialStore({ filePath }) {
  function readAll() {
    if (!fs.existsSync(filePath)) return { schemaVersion: 1, accounts: [] };
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return { schemaVersion: 1, accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [] };
  }

  function writeAll(value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, filePath);
  }

  function findByEmail(email) {
    const normalized = normalizeEmail(email);
    return readAll().accounts.find(account => account.email === normalized) || null;
  }

  function create({ email, name, password, accessTier = "free_run_club", attribution = null }) {
    const normalized = normalizeEmail(email);
    const data = readAll();
    if (data.accounts.some(account => account.email === normalized)) return null;
    const salt = crypto.randomBytes(16).toString("hex");
    const account = {
      id: `member_${crypto.randomUUID().replaceAll("-", "")}`,
      email: normalized,
      name,
      accessTier,
      attribution: normalizeAttribution(attribution),
      passwordSalt: salt,
      passwordHash: crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex"),
      createdAt: new Date().toISOString()
    };
    data.accounts.push(account);
    writeAll(data);
    return account;
  }

  function verify(account, password) {
    if (!account?.passwordHash || !account?.passwordSalt) return false;
    const actual = crypto.scryptSync(String(password || ""), account.passwordSalt, SCRYPT_KEY_LENGTH);
    const expected = Buffer.from(account.passwordHash, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  function listIdentities() {
    return readAll().accounts.map(({ id, email, name, accessTier, attribution, createdAt }) => ({ id, email, name, accessTier, attribution: normalizeAttribution(attribution), createdAt }));
  }

  return { create, findByEmail, listIdentities, verify };
}

module.exports = { createAuthCredentialStore };
