"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../server");

test("browser config has a versioned, uncached, CORS-readable runtime contract", async t => {
  const previous = {
    key: process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY,
    origins: process.env.ALLOWED_ORIGINS
  };
  process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY = "browser-contract-value";
  process.env.ALLOWED_ORIGINS = "https://mufasafitsite.onrender.com";
  t.after(() => {
    if (previous.key === undefined) delete process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY;
    else process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY = previous.key;
    if (previous.origins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previous.origins;
  });

  const server = createApp({ rootDir: process.cwd() }).listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/browser-config`, {
    headers: { Origin: "https://mufasafitsite.onrender.com" }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^application\/json/);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://mufasafitsite.onrender.com");
  assert.equal(response.headers.get("cache-control"), "no-store, no-cache, must-revalidate, proxy-revalidate");
  assert.match(response.headers.get("vary"), /Origin/);
  assert.deepEqual({
    schemaVersion: body.data.schemaVersion,
    googleMapsBrowserKeyConfigured: body.data.googleMapsBrowserKeyConfigured,
    googleMapsBrowserKey: body.data.googleMapsBrowserKey
  }, {
    schemaVersion: "1",
    googleMapsBrowserKeyConfigured: true,
    googleMapsBrowserKey: "browser-contract-value"
  });
});
