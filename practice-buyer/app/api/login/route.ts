import { NextResponse } from "next/server";
import { COOKIE, clientIp, deny, makeSession, rateLimited, readCookie, safeEqual, sameOrigin, validSession } from "@/lib/guard";

/** Tells the page whether this visitor already entered the code. Reveals nothing else. */
export async function GET(req: Request) {
  const authed = Boolean(process.env.ACCESS_CODE) && (await validSession(readCookie(req, COOKIE)));
  return NextResponse.json({ authed }, { headers: { "Cache-Control": "no-store" } });
}

/** Checks the access code and, if right, sets the signed session cookie. */
export async function POST(req: Request) {
  const code = process.env.ACCESS_CODE;
  if (!code) return deny(500, "Server is missing ACCESS_CODE.");

  if (!sameOrigin(req)) return deny(403, "Requests must come from this site.");
  // 10 attempts per hour per visitor, plus 100 per hour site-wide, so the code
  // can't be guessed by brute force even by someone faking their IP.
  if (rateLimited("login", clientIp(req), 10)) return deny(429, "Too many attempts. Try again in an hour.");
  if (rateLimited("all:login", "site", 100)) return deny(429, "Too many attempts. Try again later.");

  let attempt = "";
  try {
    const raw = await req.text();
    if (raw.length > 1000) return deny(413, "Request too large.");
    const body = JSON.parse(raw) as { code?: unknown } | null;
    attempt = typeof body?.code === "string" ? body.code.slice(0, 200) : "";
  } catch {
    return deny(400, "Bad request.");
  }
  if (!safeEqual(attempt, code)) return deny(401, "Wrong access code.");

  const session = await makeSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, session.value, {
    httpOnly: true, // page JavaScript can't read it
    // HTTPS-only whenever the site is served over HTTPS (always on Vercel).
    // Over plain http (e.g. testing on your phone via your laptop's IP) a
    // Secure cookie would be silently dropped and login would look broken.
    secure: isHttps(req),
    sameSite: "strict", // never sent from other websites
    path: "/",
    maxAge: session.maxAge,
  });
  return res;
}

function isHttps(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  return (proto ?? new URL(req.url).protocol.replace(":", "")) === "https";
}
