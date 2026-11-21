/**
 * Talk-time numbers from the transcript. Same rules as metrics.py in the
 * call analyzer. Speaking time is estimated from word count (about 150
 * words per minute), so treat these as close approximations.
 */

export type Line = { speaker: "rep" | "buyer"; text: string };

const WORDS_PER_SEC = 150 / 60;

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

export function talkMetrics(lines: Line[]) {
  let rep = 0;
  let buyer = 0;
  let longest = 0;
  let run = 0;
  let questions = 0;
  for (const l of lines) {
    const w = words(l.text);
    if (l.speaker === "rep") {
      rep += w;
      run += w;
      longest = Math.max(longest, run);
      questions += (l.text.match(/\?/g) ?? []).length;
    } else {
      buyer += w;
      run = 0;
    }
  }
  const total = rep + buyer || 1;
  return {
    repTalkPct: Math.round((100 * rep) / total),
    longestMonologueSec: Math.round(longest / WORDS_PER_SEC),
    questions,
  };
}

/** Export in the same format analyze.py reads, so you can re-run it there. */
export function toAnalyzerJson(lines: (Line & { at: number })[]) {
  return lines.map((l) => {
    const dur = Math.max(1000, Math.round((words(l.text) / WORDS_PER_SEC) * 1000));
    const end = Math.max(l.at, dur);
    return { speaker: l.speaker === "rep" ? "A" : "B", text: l.text, start: end - dur, end };
  });
}
