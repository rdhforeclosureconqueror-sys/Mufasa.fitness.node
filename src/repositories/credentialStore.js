"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SCRYPT_KEY_LENGTH = 64;
const derive = (password, salt) => new Promise((resolve, reject) => crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH,
  (error, key) => error ? reject(error) : resolve(key)));

function createCredentialStore({ filePath }) {
  let writeQueue = Promise.resolve();
  function read() {
    if (!fs.existsSync(filePath)) return { schemaVersion: 1, users: [] };
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (value?.schemaVersion !== 1 || !Array.isArray(value.users)) throw new Error("Invalid credential store");
    return value;
  }
  function write(value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    const fd = fs.openSync(temporary, "wx", 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temporary, filePath);
    fs.chmodSync(filePath, 0o600);
    const directory = fs.openSync(path.dirname(filePath), "r");
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
  }
  function register({ id, email, name, password }) {
    const operation = writeQueue.then(async () => {
      const state = read();
      if (state.users.some((user) => user.email === email)) return null;
      const salt = crypto.randomBytes(16);
      const passwordHash = await derive(password, salt);
      state.users.push({ id, email, name, password: `scrypt:${salt.toString("base64url")}:${passwordHash.toString("base64url")}`, createdAt: new Date().toISOString() });
      write(state);
      return { id, email, name };
    });
    writeQueue = operation.catch(() => {});
    return operation;
  }
  async function authenticate(email, password) {
    const record = read().users.find((user) => user.email === email);
    if (!record) return null;
    const [algorithm, saltEncoded, hashEncoded] = String(record.password || "").split(":");
    if (algorithm !== "scrypt" || !saltEncoded || !hashEncoded) return null;
    const expected = Buffer.from(hashEncoded, "base64url");
    const actual = await derive(password, Buffer.from(saltEncoded, "base64url"));
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    return { id: record.id, email: record.email, name: record.name };
  }
  function has(email) { return read().users.some((user) => user.email === email); }
  return Object.freeze({ authenticate, has, register });
}

module.exports = { createCredentialStore };
