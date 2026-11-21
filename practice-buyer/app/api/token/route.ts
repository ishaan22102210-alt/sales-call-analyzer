import { NextResponse } from "next/server";
import { deny, guard } from "@/lib/guard";
import { getPersona } from "@/lib/personas";

/**
 * Starts a call: returns a short-lived Voice Agent token plus the chosen
 * buyer's session settings.
 *
 * - The token lets the browser open the voice call, so your real API key
 *   never leaves the server.
 * - The buyer's hidden prompt is sent only now, for the one buyer being
 *   called, instead of shipping every buyer's secrets in the page's code.
 *   (The browser must pass it to AssemblyAI, so a determined user could still
 *   see it in network traffic. It's a practice tool, so that's acceptable.)
 */
export async function GET(req: Request) {
  // Access code + same-origin + max 15 calls per hour per visitor (100 site-wide).
  const blocked = await guard(req, { bucket: "token", max: 15, siteMax: 100 });
  if (blocked) return blocked;

  const persona = getPersona(new URL(req.url).searchParams.get("persona") ?? "");
  if (!persona) return deny(400, "Unknown buyer.");

  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "120"); // the call must start within 2 min
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
    return NextResponse.json(
      {
        token,
        session: { system_prompt: persona.prompt, greeting: persona.greeting, voice: persona.voice, company: persona.company },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("token request error", e instanceof Error ? e.message : e);
    return deny(502, "Couldn't reach AssemblyAI. Try again in a moment.");
  }
}
