"""
Sales call analyzer: recording in, coaching report out.

Usage:
  python analyze.py calls/my_call.mp3            # transcribe + metrics + AI score
  python analyze.py samples/mock_call.json       # skip transcription (free, no key needed)
  python analyze.py calls/my_call.mp3 --rep B    # if the rep is speaker B
  python analyze.py samples/mock_call.json --no-ai   # numbers only
"""

import argparse
import os
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

from metrics import coaching_flags, compute_metrics
from scoring import MEDDPICC, score_call
from transcribe import load_utterances, save_utterances, transcribe_call

REPORTS = Path(__file__).parent / "reports"


def build_report(name: str, metrics: dict, flags: list[str], score: dict | None) -> str:
    lines = [f"# Call report: {name}", f"_{date.today()}_", "", "## The numbers", ""]
    lines += [
        f"- Duration: {metrics['duration_min']} min",
        f"- Talk ratio (you / buyer): {metrics['rep_talk_pct']}% / {metrics['buyer_talk_pct']}%",
        f"- Longest monologue: {metrics['longest_rep_monologue_sec']}s",
        f"- Questions you asked: {metrics['rep_questions']}",
        f"- Back-and-forth: {metrics['speaker_switches_per_min']} speaker switches per minute",
        "", "## Coaching notes", "",
    ]
    lines += [f"- {f}" for f in flags]

    if score:
        total = sum(item["score"] for item in score["meddpicc"])
        lines += ["", f"## MEDDPICC: {total} / {2 * len(MEDDPICC)}", "",
                  "| Element | Score | Evidence |", "|---|---|---|"]
        lines += [f"| {i['element']} | {i['score']}/2 | {i.get('evidence', '')} |" for i in score["meddpicc"]]
        lines += ["", "## Objections", ""]
        lines += [f"- {o}" for o in score.get("objections", [])] or ["- none"]
        lines += ["", f"**Next step agreed:** {score.get('next_step', 'none')}", "",
                  "## Questions you should have asked", ""]
        lines += [f"- {q}" for q in score.get("missed_questions", [])]
        lines += ["", f"**Summary:** {score.get('one_line_summary', '')}"]
    return "\n".join(lines) + "\n"


def main() -> None:
    load_dotenv(".env.local")
    load_dotenv()
    parser = argparse.ArgumentParser(description="Score a sales call.")
    parser.add_argument("source", help="audio file, audio URL, or a saved .json transcript")
    parser.add_argument("--rep", default="A", help="which speaker letter is the sales rep (default A)")
    parser.add_argument("--no-ai", action="store_true", help="skip the MEDDPICC AI scoring")
    args = parser.parse_args()

    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    name = Path(args.source).stem
    REPORTS.mkdir(exist_ok=True)

    # 1. Transcript: reuse a saved one, or pay to transcribe once and save it.
    if args.source.endswith(".json"):
        utterances = load_utterances(Path(args.source))
    else:
        if not api_key:
            raise SystemExit("Set ASSEMBLYAI_API_KEY in .env.local first (see README).")
        print("Transcribing... (a 30-minute call takes about a minute)")
        utterances = transcribe_call(args.source, api_key)
        save_utterances(utterances, REPORTS / f"{name}.json")

    # 2. Numbers.
    metrics = compute_metrics(utterances, rep=args.rep)
    flags = coaching_flags(metrics)

    # 3. AI scoring (optional).
    score = None
    if not args.no_ai:
        if not api_key:
            print("No API key, so skipping the AI scoring. Use --no-ai to hide this message.")
        else:
            print("Scoring on MEDDPICC...")
            score = score_call(utterances, api_key, rep=args.rep)

    report = build_report(name, metrics, flags, score)
    out = REPORTS / f"{name}.md"
    out.write_text(report)
    print(report)
    print(f"Saved to {out}")


if __name__ == "__main__":
    main()
