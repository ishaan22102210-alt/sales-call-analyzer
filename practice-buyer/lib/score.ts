/** Input validation and output cleanup for the scoring route. */

export const MAX_LINES = 300;
export const MAX_LINE_CHARS = 2000;
export const MAX_BODY_BYTES = 200_000;

export type Line = { speaker: "rep" | "buyer"; text: string };

/** Accept only the exact shape we expect; drop anything else. */
export function cleanLines(input: unknown): Line[] | null {
  if (!Array.isArray(input) || input.length < 2 || input.length > MAX_LINES) return null;
  const out: Line[] = [];
  for (const l of input) {
    if (!l || typeof l !== "object") return null;
    const { speaker, text } = l as Record<string, unknown>;
    if ((speaker !== "rep" && speaker !== "buyer") || typeof text !== "string") return null;
    // Strip angle brackets so the transcript can't fake our <transcript> tags.
    out.push({ speaker, text: text.slice(0, MAX_LINE_CHARS).replace(/[<>]/g, "") });
  }
  return out;
}

/**
 * Pull the JSON out of the LLM reply and keep only the fields the page uses,
 * with the right types. Anything else the model returned is dropped.
 */
export function parseScore(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!j || typeof j !== "object" || !Array.isArray(j.meddpicc)) return null;
  const str = (v: unknown, max = 600) => (typeof v === "string" ? v.slice(0, max) : "");
  const strs = (v: unknown) => (Array.isArray(v) ? v.slice(0, 10).map((x) => str(x)).filter(Boolean) : []);
  return {
    meddpicc: j.meddpicc.slice(0, 8).map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      return {
        element: str(o.element, 40),
        score: Math.max(0, Math.min(2, Math.round(Number(o.score) || 0))),
        evidence: str(o.evidence),
      };
    }),
    secrets_found: strs(j.secrets_found),
    secrets_missed: strs(j.secrets_missed),
    objection_handling: str(j.objection_handling),
    next_step: str(j.next_step),
    best_moment: str(j.best_moment),
    fix_next_time: strs(j.fix_next_time),
    one_line_summary: str(j.one_line_summary),
  };
}
