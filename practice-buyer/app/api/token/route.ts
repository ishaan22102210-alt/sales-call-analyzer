import { NextResponse } from "next/server";
import { deny, guard } from "@/lib/guard";

/**
 * Gets a short-lived Voice Agent token from AssemblyAI.
 * The browser uses the token to open the voice call, so your real API key
 * never leaves the server.
 */
export async function GET(req: Request) {
  // Access code + same-origin + max 15 calls per hour per visitor (100 site-wide).
  const blocked = await guard(req, { bucket: "token", max: 15, siteMax: 100 });
  if (blocked) return blocked;

  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "60"); // token must be used within 1 min
  url.searchParams.set("max_session_duration_seconds", "660"); // any call ends after 11 min

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.ASSEMBLYAI_API_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000), // never hang waiting on AssemblyAI
    });
    if (!res.ok) {
      // Log the detail on the server; don't hand AssemblyAI's error text to the browser.
      console.error("token request failed", res.status, (await res.text()).slice(0, 500));
      return deny(502, "Couldn't start the call. Check the API key on the server.");
    }
    const { token } = (await res.json()) as { token?: unknown };
    if (typeof token !== "string" || !token) throw new Error("no token in response");
    return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("token request error", e instanceof Error ? e.message : e);
    return deny(502, "Couldn't reach AssemblyAI. Try again in a moment.");
  }
}
