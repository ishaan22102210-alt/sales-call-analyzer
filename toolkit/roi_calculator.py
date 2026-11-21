"""
Build vs buy calculator: what does self-hosting speech-to-text REALLY cost,
compared with paying for an API?

Use it when a buyer says "Whisper is free" or "it's too expensive".
Fill in the numbers WITH the buyer on the call, using their answers.

Run:  python toolkit/roi_calculator.py
"""


def ask(prompt: str, default: float) -> float:
    raw = input(f"{prompt} [{default}]: ").strip()
    return float(raw) if raw else default


def main() -> None:
    print("\n=== Self-hosting (what they do today) ===")
    hours = ask("Hours of audio per month", 40_000)
    servers = ask("Server (GPU) cost per month, $", 6_000)
    engineers = ask("Engineers maintaining it (e.g. 2 people at half time = 1.0)", 1.0)
    salary = ask("Cost per engineer per year, incl. benefits, $", 180_000)
    fixes_pct = ask("% of transcripts a human has to fix", 5)
    fix_cost = ask("Cost of one human fix, $", 2)
    calls_per_hour = ask("Calls per hour of audio", 10)

    print("\n=== API (what you're proposing) ===")
    print("Check the current price per hour on assemblyai.com/pricing before you use this!")
    api_price = ask("API price per hour of audio, $", 0.15)
    fixes_pct_api = ask("% needing a human fix with the API (estimate it from a test)", 2)

    eng_month = engineers * salary / 12
    fixes_self = hours * calls_per_hour * fixes_pct / 100 * fix_cost
    fixes_api = hours * calls_per_hour * fixes_pct_api / 100 * fix_cost

    self_total = servers + eng_month + fixes_self
    api_total = hours * api_price + fixes_api

    print("\n=== Monthly cost ===")
    print(f"{'':28}{'Self-host':>12}{'API':>12}")
    print(f"{'Servers / API usage':28}{servers:>12,.0f}{hours * api_price:>12,.0f}")
    print(f"{'Engineer time':28}{eng_month:>12,.0f}{0:>12,.0f}")
    print(f"{'Human fixes':28}{fixes_self:>12,.0f}{fixes_api:>12,.0f}")
    print(f"{'TOTAL':28}{self_total:>12,.0f}{api_total:>12,.0f}")

    diff = self_total - api_total
    if diff > 0:
        print(f"\nSwitching saves about ${diff:,.0f}/month (${diff * 12:,.0f}/year),")
        print(f"and frees {engineers:g} engineer(s) to build features instead.")
    else:
        print(f"\nSelf-hosting is about ${-diff:,.0f}/month cheaper on these numbers.")
        print("Be honest about that. Talk about accuracy, speed and engineer focus instead.")
    print("\nThese are estimates from the buyer's own numbers. Confirm them with a real test.\n")


if __name__ == "__main__":
    main()
