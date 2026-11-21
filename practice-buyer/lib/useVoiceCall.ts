"use client";

/**
 * Runs one voice call with an AI buyer over AssemblyAI's Voice Agent API.
 *
 * Flow:
 *   1. ask our server for a short-lived token (/api/token)
 *   2. open a WebSocket to AssemblyAI with that token
 *   3. send `session.update` with the buyer's persona, voice and tools
 *   4. stream mic audio up as `input.audio`; play `reply.audio` back
 *   5. collect `transcript.user` (you) and `transcript.agent` (buyer) lines
 *   6. send `session.end` before closing, so the session stops billing
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Player, fromBase64, toBase64 } from "./audio";
import { END_CALL_TOOL, type Persona } from "./personas";

const AGENT_WS = "wss://agents.assemblyai.com/v1/ws";
const RATE = 24000;

export type Status = "idle" | "connecting" | "live" | "ended" | "error";
export type Line = { speaker: "rep" | "buyer"; text: string; at: number };

export function useVoiceCall() {
  const [status, setStatus] = useState<Status>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [partial, setPartial] = useState("");
  const [buyerTalking, setBuyerTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const ws = useRef<WebSocket | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const node = useRef<AudioWorkletNode | null>(null);
  const player = useRef<Player | null>(null);
  const startedAt = useRef(0);
  const ending = useRef(false);
  const hangUpAfterReply = useRef(false);

  const teardown = useCallback(() => {
    node.current?.disconnect();
    node.current = null;
    mic.current?.getTracks().forEach((t) => t.stop());
    mic.current = null;
    player.current?.stop();
    player.current = null;
    ctx.current?.close().catch(() => {});
    ctx.current = null;
    ws.current = null;
    setBuyerTalking(false);
    setPartial("");
  }, []);

  const stop = useCallback(() => {
    if (ending.current) return;
    ending.current = true;
    const sock = ws.current;
    const finish = () => {
      try {
        sock?.close(1000);
      } catch {
        /* already closed */
      }
      teardown();
      setStatus((s) => (s === "error" ? s : "ended"));
    };
    if (sock?.readyState === WebSocket.OPEN) {
      // Tell AssemblyAI the call is over first, or the session can keep billing.
      sock.send(JSON.stringify({ type: "session.end" }));
      setTimeout(finish, 600);
    } else {
      finish();
    }
  }, [teardown]);

  const start = useCallback(
    async (persona: Persona) => {
      if (ws.current) return;
      ending.current = false;
      hangUpAfterReply.current = false;
      setStatus("connecting");
      setError(null);
      setLines([]);
      setPartial("");
      setElapsed(0);

      const fail = (message: string) => {
        setError(message);
        setStatus("error");
        ending.current = true;
        try {
          ws.current?.close();
        } catch {
          /* ignore */
        }
        teardown();
      };

      try {
        const res = await fetch("/api/token", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Couldn't start the call.");

        mic.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
        const audioCtx = new AudioContext({ sampleRate: RATE });
        ctx.current = audioCtx;
        await audioCtx.audioWorklet.addModule("/pcm-worklet.js");
        player.current = new Player(audioCtx, RATE);

        const url = new URL(AGENT_WS);
        url.searchParams.set("token", body.token);
        const sock = new WebSocket(url);
        ws.current = sock;

        sock.onopen = () => {
          sock.send(
            JSON.stringify({
              type: "session.update",
              session: {
                system_prompt: persona.prompt,
                greeting: persona.greeting,
                input: {
                  format: { encoding: "audio/pcm" },
                  keyterms: ["AssemblyAI", "MEDDPICC", "Whisper", "Deepgram", persona.company],
                  turn_detection: { vad_threshold: 0.5, min_silence: 300, max_silence: 900, interrupt_response: true },
                },
                output: { voice: persona.voice, format: { encoding: "audio/pcm" } },
                tools: [END_CALL_TOOL],
              },
            }),
          );
        };

        sock.onmessage = (ev) => {
          let msg: Record<string, unknown>;
          try {
            msg = JSON.parse(String(ev.data));
          } catch {
            return;
          }
          switch (msg.type) {
            case "session.ready": {
              startedAt.current = Date.now();
              setStatus("live");
              // Start sending the mic only once the session is ready.
              const src = audioCtx.createMediaStreamSource(mic.current!);
              const worklet = new AudioWorkletNode(audioCtx, "pcm-capture", {
                numberOfInputs: 1,
                numberOfOutputs: 0,
                processorOptions: { targetRate: RATE, chunk: 1200 },
              });
              worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
                if (sock.readyState === WebSocket.OPEN && !ending.current) {
                  sock.send(JSON.stringify({ type: "input.audio", audio: toBase64(e.data) }));
                }
              };
              src.connect(worklet);
              node.current = worklet;
              break;
            }
            case "input.speech.started":
              // You started talking: stop the buyer's audio (barge-in).
              player.current?.stop();
              setBuyerTalking(false);
              break;
            case "transcript.user.delta":
              setPartial(String(msg.text ?? ""));
              break;
            case "transcript.user": {
              const text = String(msg.text ?? "").trim();
              setPartial("");
              if (text) setLines((l) => [...l, { speaker: "rep", text, at: Date.now() - startedAt.current }]);
              break;
            }
            case "reply.started":
              setBuyerTalking(true);
              break;
            case "reply.audio":
              if (typeof msg.data === "string") player.current?.push(fromBase64(msg.data));
              break;
            case "transcript.agent": {
              const text = String(msg.text ?? "").trim();
              if (text) setLines((l) => [...l, { speaker: "buyer", text, at: Date.now() - startedAt.current }]);
              break;
            }
            case "reply.done":
              setBuyerTalking(false);
              if (hangUpAfterReply.current) setTimeout(stop, 1500); // let the goodbye finish playing
              break;
            case "tool.call": {
              if (msg.name === "end_call") hangUpAfterReply.current = true;
              sock.send(
                JSON.stringify({ type: "tool.result", call_id: String(msg.call_id), result: JSON.stringify({ ok: true }) }),
              );
              break;
            }
            case "session.error":
              fail(`AssemblyAI error: ${String(msg.message ?? msg.code ?? "unknown")}`);
              break;
            case "session.ended":
              if (!ending.current) stop();
              break;
          }
        };

        sock.onerror = () => fail("Connection error. Check your internet and try again.");
        sock.onclose = (e) => {
          if (ending.current) return;
          if (e.code === 1000 || e.code === 1005) stop();
          else fail(`The call dropped (code ${e.code}).`);
        };
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        fail(
          name === "NotAllowedError"
            ? "Microphone access was blocked. Allow it in your browser and try again."
            : e instanceof Error
              ? e.message
              : String(e),
        );
      }
    },
    [stop, teardown],
  );

  // Call clock.
  useEffect(() => {
    if (status !== "live") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [status]);

  // Hang up if the page is closed mid-call.
  useEffect(() => () => stop(), [stop]);

  return { status, lines, partial, buyerTalking, error, elapsed, start, stop };
}
