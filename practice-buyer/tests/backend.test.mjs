// End-to-end tests for every API route and every protection.
// Starts the built app on a spare port with a test access code, then attacks it.
// Run: npm test   (builds first)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";

const PORT = 3199;
const BASE = `http://localhost:${PORT}`;
const CODE = "test-access-code-123";
let server;
let cookie = "";

// Each test uses its own fake IP so per-visitor rate limits don't interfere.
let ipCounter = 0;
const ip = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

function req(path, { method = "GET", body, headers = {}, raw } = {}) {
  return fetch(BASE + path, {
    method,
    headers: {
      "x-real-ip": ip(),
      ...(method !== "GET" ? { origin: BASE, "content-type": "application/json" } : {}),
      ...headers,
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    redirect: "manual",
  });
}

const sign = (expires) => `${expires}.${createHmac("sha256", `pb:${CODE}`).update(String(expires)).digest("base64url")}`;

const lines = [
  { speaker: "rep", text: "Hi Dana, can I ask two quick questions?" },
  { speaker: "buyer", text: "Sure." },
];

before(async () => {
  // Run Next's own binary directly (not via npx) so kill() stops the real server.
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    env: {
      ...process.env,
      ACCESS_CODE: CODE,
      // A fake key: upstream calls fail, so we can test the error paths safely.
      ASSEMBLYAI_API_KEY: "test-key-not-real",
      SESSION_SECRET: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.resume();
  server.stderr.resume();
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(BASE + "/api/login");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("server did not start");
});

after(async () => {
  server?.kill("SIGTERM");
  await new Promise((r) => (server.exitCode !== null ? r() : server.once("exit", r)));
});

// --- login ---------------------------------------------------------------

test("not logged in by default", async () => {
  const r = await req("/api/login");
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { authed: false });
});

test("wrong access code is rejected", async () => {
  const r = await req("/api/login", { method: "POST", body: { code: "nope" } });
  assert.equal(r.status, 401);
  assert.equal(r.headers.get("set-cookie"), null);
});

test("login rejects malformed bodies without crashing", async () => {
  for (const raw of ["not json", "null", "42", '"str"', "[]", '{"code":123}', '{"code":null}']) {
    const r = await req("/api/login", { method: "POST", raw });
    assert.ok([400, 401].includes(r.status), `${raw} -> ${r.status}`);
  }
});

test("login rejects oversized bodies", async () => {
  const r = await req("/api/login", { method: "POST", body: { code: "x".repeat(5000) } });
  assert.equal(r.status, 413);
});

test("login from another website is blocked", async () => {
  const r = await req("/api/login", { method: "POST", body: { code: CODE }, headers: { origin: "https://evil.example" } });
  assert.equal(r.status, 403);
});

test("right access code sets a secure session cookie", async () => {
  const r = await req("/api/login", { method: "POST", body: { code: CODE } });
  assert.equal(r.status, 200);
  const set = r.headers.get("set-cookie") ?? "";
  assert.match(set, /pb_session=/);
  assert.match(set, /HttpOnly/i);
  assert.match(set, /SameSite=strict/i);
  assert.match(set, /Secure/i, "production cookies must be HTTPS-only");
  cookie = set.split(";")[0];
  const check = await req("/api/login", { headers: { cookie } });
  assert.deepEqual(await check.json(), { authed: true });
});

test("access code never appears in any response", async () => {
  const r = await req("/api/login", { method: "POST", body: { code: CODE } });
  const text = (await r.text()) + (r.headers.get("set-cookie") ?? "");
  assert.ok(!text.includes(CODE));
});

// --- session cookie attacks ----------------------------------------------

test("protected routes reject visitors with no cookie", async () => {
  assert.equal((await req("/api/token")).status, 401);
  assert.equal((await req("/api/score", { method: "POST", body: { personaId: "dana", lines } })).status, 401);
});

test("forged, tampered, expired and malformed cookies are rejected", async () => {
  const future = Date.now() + 3600_000;
  const bad = [
    `pb_session=${future}.fakesignature`,
    `pb_session=${future + 1}.${cookie.split(".")[1]}`, // valid sig moved to a new expiry
    `pb_session=${sign(Date.now() - 1000)}`, // correctly signed but expired
    "pb_session=%E0%A4%A", // malformed percent-encoding must not crash the server
    "pb_session=....",
    "pb_session=",
  ];
  for (const c of bad) {
    const r = await req("/api/token", { headers: { cookie: c } });
    assert.equal(r.status, 401, c);
  }
});

// --- origin checks -------------------------------------------------------

test("POST from another website is blocked even with a valid cookie", async () => {
  const r = await req("/api/score", {
    method: "POST",
    body: { personaId: "dana", lines },
    headers: { cookie, origin: "https://evil.example" },
  });
  assert.equal(r.status, 403);
});

test("POST with no Origin header is blocked", async () => {
  const r = await fetch(BASE + "/api/score", {
    method: "POST",
    headers: { cookie, "content-type": "application/json", "x-real-ip": ip() },
    body: JSON.stringify({ personaId: "dana", lines }),
  });
  assert.equal(r.status, 403);
});

// --- score input validation ----------------------------------------------

test("score rejects bad input with 400, never 500", async () => {
  const bodies = [
    "not json",
    "null",
    "[]",
    "42",
    JSON.stringify({ personaId: "nobody", lines }),
    JSON.stringify({ personaId: { $ne: 1 }, lines }),
    JSON.stringify({ personaId: "dana" }),
    JSON.stringify({ personaId: "dana", lines: "hi" }),
    JSON.stringify({ personaId: "dana", lines: [lines[0]] }),
    JSON.stringify({ personaId: "dana", lines: [lines[0], { speaker: "system", text: "x" }] }),
    JSON.stringify({ personaId: "dana", lines: Array(301).fill(lines[0]) }),
  ];
  for (const raw of bodies) {
    const r = await req("/api/score", { method: "POST", raw, headers: { cookie } });
    assert.equal(r.status, 400, raw.slice(0, 80));
  }
});

test("score rejects oversized bodies", async () => {
  const big = JSON.stringify({ personaId: "dana", lines: Array(200).fill({ speaker: "rep", text: "a".repeat(1990) }) });
  const r = await req("/api/score", { method: "POST", raw: big, headers: { cookie } });
  assert.equal(r.status, 413);
});

test("score upstream failure returns a clean 502 with no leaked details", async () => {
  const r = await req("/api/score", { method: "POST", body: { personaId: "dana", lines }, headers: { cookie } });
  assert.equal(r.status, 502);
  const body = await r.json();
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.ok(!JSON.stringify(body).includes("test-key-not-real"));
});

// --- token ---------------------------------------------------------------

test("token upstream failure returns a clean 502 with no leaked details", async () => {
  const r = await req("/api/token", { headers: { cookie } });
  assert.equal(r.status, 502);
  const body = await r.json();
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.ok(!JSON.stringify(body).includes("test-key-not-real"));
  assert.equal(r.headers.get("cache-control"), "no-store");
});

// --- headers -------------------------------------------------------------

test("security headers are set on pages and API routes", async () => {
  for (const path of ["/", "/api/login"]) {
    const r = await req(path);
    assert.match(r.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
    assert.match(r.headers.get("content-security-policy") ?? "", /connect-src 'self' wss:\/\/agents\.assemblyai\.com/);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("x-frame-options"), "DENY");
    assert.equal(r.headers.get("x-powered-by"), null);
  }
});

test("the API key never reaches the browser bundle", async () => {
  const html = await (await req("/")).text();
  const scripts = [...html.matchAll(/src="(\/_next\/[^"]+\.js)"/g)].map((m) => m[1]);
  assert.ok(scripts.length > 0);
  for (const s of scripts) {
    const js = await (await req(s)).text();
    assert.ok(!js.includes("test-key-not-real"), s);
    assert.ok(!js.includes(CODE), s);
    assert.ok(!js.includes("ASSEMBLYAI_API_KEY"), s);
  }
});

// --- rate limits (last: they use up the limits) --------------------------

test("per-visitor login limit: 10 tries per hour", async () => {
  const me = "192.0.2.10";
  for (let i = 0; i < 10; i++) {
    const r = await req("/api/login", { method: "POST", body: { code: "wrong" }, headers: { "x-real-ip": me } });
    assert.equal(r.status, 401);
  }
  const r = await req("/api/login", { method: "POST", body: { code: CODE }, headers: { "x-real-ip": me } });
  assert.equal(r.status, 429, "even the right code is refused once the limit is hit");
});

test("per-visitor token limit: 15 per hour", async () => {
  const me = "192.0.2.20";
  for (let i = 0; i < 15; i++) {
    const r = await req("/api/token", { headers: { cookie, "x-real-ip": me } });
    assert.notEqual(r.status, 429, `request ${i + 1}`);
  }
  assert.equal((await req("/api/token", { headers: { cookie, "x-real-ip": me } })).status, 429);
});

test("site-wide login cap stops brute force from many (faked) IPs", async () => {
  let blockedAt = 0;
  for (let i = 0; i < 150; i++) {
    const r = await req("/api/login", { method: "POST", body: { code: "wrong" } }); // new fake IP each time
    if (r.status === 429) {
      blockedAt = i;
      break;
    }
  }
  assert.ok(blockedAt > 0 && blockedAt <= 100, `blocked at attempt ${blockedAt}`);
  const r = await req("/api/login", { method: "POST", body: { code: CODE } });
  assert.equal(r.status, 429);
});
