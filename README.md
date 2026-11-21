# Sales Call Analyzer

Record a sales call, get a coaching report. Built on [AssemblyAI](https://www.assemblyai.com): speech-to-text with speaker labels, then an LLM through AssemblyAI's LLM Gateway scores the call on MEDDPICC.

**What you get for each call:**
- Talk ratio, longest monologue, questions asked, back-and-forth
- Plain-English coaching notes
- A MEDDPICC score (0-16) with the buyer's own words as evidence
- Objections raised, next step agreed, and 3 questions you should have asked

## How it works

    call.mp3 ──> AssemblyAI speech-to-text ──> transcript split by speaker
                  (speaker_labels=True)              │
                                                     ├──> metrics.py  (talk ratio, monologues, questions)
                                                     └──> scoring.py  (LLM Gateway: MEDDPICC, objections)
                                                                │
                                                     reports/call.md  <──┘

| file | what it does |
|---|---|
| `transcribe.py` | sends audio to AssemblyAI, returns who-said-what |
| `metrics.py` | the numbers, no AI needed |
| `scoring.py` | the MEDDPICC prompt and the LLM Gateway call |
| `analyze.py` | runs the three steps and writes the report |

## Run it

Needs Python 3.10+.

```sh
git clone https://github.com/YOUR_USERNAME/sales-call-analyzer.git
cd sales-call-analyzer
pip install -r requirements.txt
```

**Try it free, no key:** a mock discovery call is included.

```sh
python analyze.py samples/mock_call.json --no-ai
```

**With your own call:** copy `.env.example` to `.env.local`, paste your [AssemblyAI key](https://www.assemblyai.com/dashboard), put a recording in `calls/`, then:

```sh
python analyze.py calls/my_call.mp3
```

If the rep is the second voice, add `--rep B`. Transcripts are saved to `reports/`, so re-running on the `.json` doesn't transcribe twice.

## Results

I'm using this on my own practice calls. Updated weekly.

| Week | Calls | Avg talk ratio | Avg MEDDPICC | What I changed |
|---|---|---|---|---|
| 1 | | | | |

## What I learned

_Write 2-3 bullets each week: about selling, not just code._

## Next

- [ ] Flag the exact moment each objection came up (timestamps)
- [ ] Compare two calls side by side
- [ ] A simple web page to drop a file in
