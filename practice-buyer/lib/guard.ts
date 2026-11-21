/**
 * Backend protection. Every API route runs through `guard()` first.
 *
 * Why: this app spends YOUR AssemblyAI credits. If it's online without
 * protection, anyone who finds the URL could run calls on your account.
 *
 * 1. Access code: the visitor must have entered ACCESS_CODE. We then set a
 *    signed, httpOnly cookie. JavaScript can't read it, and it can't be forged
 *    without the server's secret.
 * 2. Same-origin: requests must come from this site, not from another website.
 * 3. Rate limit: a cap on requests per visitor per hour.
 */

import { NextResponse } from "next/server";

export const COOKIE = "pb_session";
const SESSION_HOURS = 12;

function secret(): string {
  // Signing secret: SESSION_SECRET if set, otherwise derived from the access code.
  return process.env.SESSION_SECRET || `pb:${process.env.ACCESS_CODE ?? ""}`;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Buffer.from(sig).toString("base64url");
}

/** Constant-time string comparison, so timing doesn't leak how much matched. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function makeSession(): Promise<{ value: string; maxAge: number }> {
  const expires = Date.now() + SESSION_HOURS * 3600_000;
  return { value: `${expires}.${await hmac(String(expires))}`, maxAge: SESSION_HOURS * 3600 };
}

export async function validSession(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  const [expires, sig] = cookie.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  return safeEqual(sig, await hmac(expires));
}

export function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k !== name) continue;
    try {
      return decodeURIComponent(v.join("="));
    } catch {
      return undefined; // malformed cookie: treat as logged out, don't crash
    }
  }
  return undefined;
}

/**
 * The visitor's IP, for per-visitor rate limits. On Vercel these headers are
 * set by the platform and can't be faked. Self-hosted behind no proxy they CAN
 * be faked, which is why every limit also has a site-wide cap (see guard()).
 */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  ).slice(0, 64);
}

/** Blocks requests sent from other websites (CSRF). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.method === "GET"; // browsers always send Origin on POST
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

// --- Rate limiting ---------------------------------------------------------
// In-memory and per server instance: good enough to stop casual abuse on a
// personal project. For real traffic, use a shared store (e.g. Redis/Upstash).
const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;

/** Drop visitors whose window has passed, then the oldest, to bound memory. */
function prune(now: number, windowMs: number) {
  for (const [k, times] of hits) {
    if (!times.length || now - times[times.length - 1] >= windowMs) hits.delete(k);
  }
  for (const k of hits.keys()) {
    if (hits.size <= MAX_KEYS) break;
    if (!k.startsWith("all:")) hits.delete(k); // never evict site-wide counters
  }
}

export function rateLimited(bucket: string, id: string, max: number, windowMs = 3600_000): boolean {
  const key = `${bucket}:${id}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > MAX_KEYS) prune(now, windowMs);
  return false;
}

export function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Run at the top of every protected route.
 * Returns a response to send back if the request is NOT allowed, or null if it is.
 */
export async function guard(
  req: Request,
  limit: { bucket: string; max: number; siteMax: number },
): Promise<NextResponse | null> {
  if (!process.env.ASSEMBLYAI_API_KEY) return deny(500, "Server is missing ASSEMBLYAI_API_KEY.");
  if (!process.env.ACCESS_CODE) return deny(500, "Server is missing ACCESS_CODE. Set one before going online.");
  if (!sameOrigin(req)) return deny(403, "Requests must come from this site.");
  if (!(await validSession(readCookie(req, COOKIE)))) return deny(401, "Enter the access code first.");
  if (rateLimited(limit.bucket, clientIp(req), limit.max)) {
    return deny(429, "Too many requests. Take a break and try again in an hour.");
  }
  // Site-wide cap: limits total spend even if per-visitor limits are dodged.
  if (rateLimited(`all:${limit.bucket}`, "site", limit.siteMax)) {
    return deny(429, "This app has hit its hourly limit. Try again later.");
  }
  return null;
}
