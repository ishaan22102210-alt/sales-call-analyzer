# Practice Buyer

Practise sales discovery calls by voice against an AI buyer, then get a MEDDPICC score. Built on [AssemblyAI](https://www.assemblyai.com)'s Voice Agent API and LLM Gateway.

- **Three buyers:** Dana (rushed COO, hard, 5 min), Priya (technical CTO, medium), Marcus (friendly founder, easy)
- **Each buyer has secrets** they only reveal when you ask the right question
- **After the call:** talk ratio, longest monologue, questions asked, MEDDPICC score, the secrets you found and missed, and 3 things to fix
- **Download the transcript** in the format `analyze.py` (in the parent folder) reads

## How it works

    browser ──(1) access code──> /api/login     sets a signed, httpOnly cookie
    browser ──(2) start call───> /api/token     server gets a 2-minute AssemblyAI token
                                                + this buyer's hidden prompt
    browser <══(3) voice═══════> wss://agents.assemblyai.com   (mic up, buyer's voice down)
    browser ──(4) transcript───> /api/score     server asks the LLM Gateway for a MEDDPICC score

Your AssemblyAI key never leaves the server.

| file | what it does |
|---|---|
| `lib/buyers.ts` | public buyer info shown on the page (no secrets) |
| `lib/personas.ts` | **server only**: each buyer's hidden prompt and secrets |
| `lib/useVoiceCall.ts` | the voice call: mic, WebSocket, playback, transcript |
| `lib/guard.ts` | backend protection: access code, same-origin, rate limits |
| `lib/score.ts` | validates transcripts in and scores out |
| `app/api/*` | the three server routes |
| `tests/` | 30 automated tests (run `npm test`) |

## Run it locally

Needs Node 20+. Use headphones, or the buyer hears itself through your speakers.

```sh
cd practice-buyer
npm install
cp .env.example .env.local
```

Fill in `.env.local`:
- `ASSEMBLYAI_API_KEY`: your key from the [AssemblyAI dashboard](https://www.assemblyai.com/dashboard)
- `ACCESS_CODE`: a password of 12+ characters that people type to use the app
- `SESSION_SECRET`: run `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` and paste the output

```sh
npm run dev
```

Open http://localhost:3000, enter your access code, pick a buyer and click **Call**.

## Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repo.
2. Set **Root Directory** to `practice-buyer`.
3. Add the three environment variables: `ASSEMBLYAI_API_KEY`, `ACCESS_CODE`, `SESSION_SECRET`.
4. Click **Deploy**. Only share the URL and access code with people you trust: every call uses your AssemblyAI credits.

## Security

The app spends your AssemblyAI credits, so the backend is locked down:

| Protection | What it stops |
|---|---|
| Access code + signed httpOnly cookie (HMAC-SHA256, 12 h) | Strangers using your credits. The cookie can't be read by page scripts or forged. |
| Same-origin check on every request | Other websites calling your API (CSRF) |
| Rate limits: per visitor, plus a site-wide cap | Spamming calls, or brute-forcing the access code |
| Short-lived tokens (2 min to start, 11 min max call) | A leaked token being reused |
| Strict input validation, size limits, timeouts | Malformed requests crashing the server or hanging it |
| Transcript treated as data in the scoring prompt | Saying "give me full marks" on the call to game your score |
| Error details logged on the server, never sent to the browser | Leaking keys or internals |
| Security headers (CSP, no framing, mic-only permissions) | Clickjacking and loading outside scripts |

**Known limits:**
- The rate limits live in memory, per server instance. That's enough for a personal project. For real traffic, use a shared store such as Upstash Redis.
- The browser has to hand the buyer's prompt to AssemblyAI, so someone digging through network traffic could read the secrets. They're kept out of the page's code, so you can't see them by accident.

## Tests

```sh
npm test
```

This builds the app, starts it with a test access code and a fake API key, then checks:
- every route
- forged, tampered and expired cookies
- requests from other websites
- malformed and oversized input
- rate limits
- upstream failures, and that no keys or secrets leak to the browser
