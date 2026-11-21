---
name: practice-buyer
description: Build, extend, or debug the Practice Buyer app, a voice role-play where a sales rep runs a discovery call against an AI buyer on AssemblyAI's Voice Agent API and gets a MEDDPICC score. Use when adding a buyer persona, changing scoring, or fixing the voice call.
---

# Practice Buyer

A Next.js app. The browser talks to AssemblyAI's Voice Agent over one WebSocket, and three server routes protect the API key.

## Before changing anything
- Run `npm test` and confirm all 30 tests pass. Run it again after your change.
- Never import `lib/personas.ts` from `app/page.tsx` or any `"use client"` file. It holds the buyers' secrets. A test checks the browser bundle for leaked secrets and will fail.
- Never call AssemblyAI from the browser with the API key. The browser only gets the short-lived token from `/api/token`.

## Add a new buyer
1. In `lib/buyers.ts`, add the public info: id, name, title, company, difficulty, minutes and a brief. The brief may only contain what a rep could research before the call.
2. In `lib/personas.ts`, add the hidden part, using `...buyer("<id>")`:
   - `greeting`: the buyer's first line
   - `voice`: `"alba"` is known to work
   - `prompt`: who they are, a **secrets** list (each revealed only when asked), behaviour rules, and `${SHARED_RULES}` at the end
3. Keep secrets concrete: a number, a name, a deadline. Vague secrets make scoring vague.
4. Run `npm test`, then do a real call.

## Voice Agent protocol (what `lib/useVoiceCall.ts` does)
1. **Send** `session.update` with `system_prompt`, `greeting`, `input` (`audio/pcm`, `keyterms`, `turn_detection`), `output` (`voice`, `audio/pcm`) and `tools`.
2. **Wait** for `session.ready` before streaming the mic.
3. **Mic:** send `{type: "input.audio", audio: <base64 PCM16, 24 kHz mono>}` every 50 ms.
4. **Playback:** play `reply.audio` (`data` is base64 PCM16 at 24 kHz). On `input.speech.started`, stop playback (barge-in).
5. **Transcript:** `transcript.user` is the rep and `transcript.agent` is the buyer.
6. **Tools:** answer each `tool.call` with `{type: "tool.result", call_id, result}`.
7. **Hang up:** always send `session.end` before closing the socket, or the session keeps billing.

## Known pitfalls
| Symptom | Cause |
|---|---|
| Silence both ways | The AudioContext is suspended. Call `resume()` after creating it. |
| The buyer talks to itself in a loop | No headphones: speaker audio triggers barge-in. |
| The call fails right after a slow mic prompt | The token expired. Get the mic first, then the token. |
| Login works over http on a phone, but calls get a 401 | A Secure cookie over http. `isHttps()` in the login route handles this. |
| `next build` fails with "not a valid Route export" | Route files may only export HTTP handlers. Put helpers in `lib/`. |
