"""
Step 2: hard numbers about the call, no AI needed.

These are the metrics sales coaches (and tools like Gong) look at first:

- Talk ratio: who did most of the talking? In discovery, the buyer should
  talk more. A common rule of thumb is the rep around 40-45%.
- Longest monologue: the longest stretch the rep talked without stopping.
  Long monologues usually mean pitching instead of listening.
- Questions asked: discovery is about asking good questions.
- Back-and-forth: how often the speaker switched. More switches means a
  conversation rather than a presentation.
"""


def compute_metrics(utterances: list[dict], rep: str = "A") -> dict:
    talk_ms: dict[str, int] = {}
    for u in utterances:
        talk_ms[u["speaker"]] = talk_ms.get(u["speaker"], 0) + (u["end"] - u["start"])

    total_ms = sum(talk_ms.values()) or 1
    rep_ms = talk_ms.get(rep, 0)

    # Join back-to-back utterances from the rep to find unbroken monologues.
    longest_ms, current_ms, last_speaker = 0, 0, None
    for u in utterances:
        if u["speaker"] == rep:
            current_ms = current_ms + (u["end"] - u["start"]) if last_speaker == rep else (u["end"] - u["start"])
            longest_ms = max(longest_ms, current_ms)
        last_speaker = u["speaker"]

    rep_questions = sum(u["text"].count("?") for u in utterances if u["speaker"] == rep)
    switches = sum(1 for a, b in zip(utterances, utterances[1:]) if a["speaker"] != b["speaker"])
    duration_min = (utterances[-1]["end"] - utterances[0]["start"]) / 60_000 if utterances else 0

    return {
        "duration_min": round(duration_min, 1),
        "rep_talk_pct": round(100 * rep_ms / total_ms),
        "buyer_talk_pct": round(100 * (total_ms - rep_ms) / total_ms),
        "longest_rep_monologue_sec": round(longest_ms / 1000),
        "rep_questions": rep_questions,
        "speaker_switches_per_min": round(switches / duration_min, 1) if duration_min else 0,
    }


def coaching_flags(m: dict) -> list[str]:
    """Turn the numbers into plain-English coaching notes."""
    flags = []
    if m["rep_talk_pct"] > 55:
        flags.append(f"You talked {m['rep_talk_pct']}% of the time. Aim for under 45% in discovery.")
    if m["longest_rep_monologue_sec"] > 90:
        flags.append(f"Longest monologue was {m['longest_rep_monologue_sec']}s. Pause and ask a question before 60-90s.")
    if m["duration_min"] and m["rep_questions"] / m["duration_min"] < 1:
        flags.append("Fewer than 1 question per minute. Discovery calls need more questions.")
    return flags or ["Talk ratio, monologues and question rate all look healthy."]
