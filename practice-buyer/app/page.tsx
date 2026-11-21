"use client";

import { useEffect, useMemo, useState } from "react";
import { PERSONAS, type Persona } from "@/lib/personas";
import { talkMetrics, toAnalyzerJson } from "@/lib/metrics";
import { useVoiceCall } from "@/lib/useVoiceCall";

type Score = {
  meddpicc?: { element: string; score: number; evidence?: string }[];
  secrets_found?: string[];
  secrets_missed?: string[];
  objection_handling?: string;
  next_step?: string;
  best_moment?: string;
  fix_next_time?: string[];
  one_line_summary?: string;
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [persona, setPersona] = useState<Persona>(PERSONAS[0]);
  const [score, setScore] = useState<Score | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const call = useVoiceCall();

  useEffect(() => {
    fetch("/api/login", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setAuthed(Boolean(b.authed)))
      .catch(() => setAuthed(false));
  }, []);

  // Hang up automatically when the time limit is reached.
  const limit = persona.minutes * 60;
  useEffect(() => {
    if (call.status === "live" && call.elapsed >= limit) call.stop();
  }, [call, limit]);

  const metrics = useMemo(() => talkMetrics(call.lines), [call.lines]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setAuthed(true);
    else setLoginError(body.error ?? "Something went wrong.");
  }

  async function getScore() {
    setScoring(true);
    setScoreError("");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          lines: call.lines.map(({ speaker, text }) => ({ speaker, text })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setScore(body);
      else setScoreError(body.error ?? "Scoring failed.");
    } finally {
      setScoring(false);
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify(toAnalyzerJson(call.lines), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `practice-${persona.id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const inCall = call.status === "connecting" || call.status === "live";
  const total = score?.meddpicc?.reduce((s, m) => s + m.score, 0) ?? 0;

  if (authed === null) return <main><p className="sub">Loading…</p></main>;

  if (!authed) {
    return (
      <main>
        <h1>Practice Buyer</h1>
        <p className="sub">Enter the access code to start practising.</p>
        <form onSubmit={login} className="row">
          <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" aria-label="Access code" autoFocus />
          <button className="primary" type="submit" disabled={!code}>Enter</button>
        </form>
        {loginError && <p className="error">{loginError}</p>}
      </main>
    );
  }

  return (
    <main>
      <h1>Practice Buyer</h1>
      <p className="sub">
        Run a discovery call against an AI buyer, then get a MEDDPICC score. Built on AssemblyAI&apos;s Voice Agent API. Use headphones.
      </p>

      <h2>1. Pick your buyer</h2>
      <div className="grid">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            className="card persona"
            aria-pressed={p.id === persona.id}
            disabled={inCall}
            onClick={() => { setPersona(p); setScore(null); }}
          >
            <strong>{p.name}</strong>
            <span className="pill">{p.difficulty}</span>
            <br />
            <small>{p.title}, {p.company} · {p.minutes} min</small>
          </button>
        ))}
      </div>
      <p className="brief"><b>What you know before the call:</b> {persona.brief}</p>

      <h2>2. Make the call</h2>
      <div className="card">
        <div className="row">
          {!inCall ? (
            <button className="primary" onClick={() => { setScore(null); call.start(persona); }}>
              {call.status === "ended" ? "Call again" : `Call ${persona.name.split(" ")[0]}`}
            </button>
          ) : (
            <button className="ghost" onClick={call.stop}>Hang up</button>
          )}
          <span className={`timer ${call.elapsed >= limit - 60 && call.status === "live" ? "late" : ""}`}>
            {fmt(call.elapsed)} / {fmt(limit)}
          </span>
          <span className="brief">
            {call.status === "connecting" && "Connecting…"}
            {call.status === "live" && (call.buyerTalking ? `${persona.name.split(" ")[0]} is talking…` : "Listening…")}
            {call.status === "ended" && "Call ended."}
          </span>
        </div>
        {call.error && <p className="error">{call.error}</p>}

        {(call.lines.length > 0 || call.partial) && (
          <div className="transcript" style={{ marginTop: 16 }}>
            {call.lines.map((l, i) => (
              <div key={i} className={`bubble ${l.speaker}`}>
                <b>{l.speaker === "rep" ? "You" : persona.name.split(" ")[0]}</b>
                {l.text}
              </div>
            ))}
            {call.partial && <div className="bubble rep partial">{call.partial}</div>}
          </div>
        )}
      </div>

      {call.lines.length > 0 && (
        <>
          <h2>3. How you did</h2>
          <div className="stats">
            <div className="card stat">
              <b className={metrics.repTalkPct <= 45 ? "ok" : "error"}>{metrics.repTalkPct}%</b>
              <small>You talked (aim for under 45%)</small>
            </div>
            <div className="card stat">
              <b className={metrics.longestMonologueSec <= 30 ? "ok" : "error"}>~{metrics.longestMonologueSec}s</b>
              <small>Longest monologue (aim for under 30s)</small>
            </div>
            <div className="card stat">
              <b>{metrics.questions}</b>
              <small>Questions you asked</small>
            </div>
          </div>

          {!inCall && (
            <div className="row" style={{ marginTop: 16 }}>
              <button className="primary" onClick={getScore} disabled={scoring || call.lines.length < 2}>
                {scoring ? "Scoring…" : "Get my MEDDPICC score"}
              </button>
              <button className="ghost" onClick={download}>Download transcript (for analyze.py)</button>
            </div>
          )}
          {scoreError && <p className="error">{scoreError}</p>}

          {score && (
            <div className="card" style={{ marginTop: 16 }}>
              <h2 style={{ marginTop: 0 }}>MEDDPICC: {total} / 16</h2>
              {score.one_line_summary && <p>{score.one_line_summary}</p>}
              <table>
                <tbody>
                  {(score.meddpicc ?? []).map((m) => (
                    <tr key={m.element}>
                      <td><b>{m.element}</b></td>
                      <td>{m.score}/2</td>
                      <td>{m.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h2>Secrets you found</h2>
              <ul>{list(score.secrets_found).map((s, i) => <li key={i} className="ok">{s}</li>)}</ul>
              <h2>Secrets you missed</h2>
              <ul>{list(score.secrets_missed).map((s, i) => <li key={i}>{s}</li>)}</ul>
              <p><b>Objection handling:</b> {score.objection_handling}</p>
              <p><b>Next step agreed:</b> {score.next_step}</p>
              {score.best_moment && <p><b>Your best moment:</b> “{score.best_moment}”</p>}
              <h2>Fix next time</h2>
              <ul>{list(score.fix_next_time).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
        </>
      )}
    </main>
  );
}
