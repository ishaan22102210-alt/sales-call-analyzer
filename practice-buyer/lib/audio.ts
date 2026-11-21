/** Small audio helpers for the voice call. */

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromBase64(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
}

/**
 * Plays the buyer's voice: queues PCM chunks back to back, and can stop
 * instantly when you interrupt ("barge-in").
 */
export class Player {
  private next = 0;
  private playing = new Set<AudioBufferSourceNode>();

  constructor(private ctx: AudioContext, private rate = 24000) {}

  push(samples: Int16Array) {
    if (!samples.length) return;
    const f = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) f[i] = samples[i] / 32768;
    const buf = this.ctx.createBuffer(1, f.length, this.rate);
    buf.copyToChannel(f, 0);

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    if (this.next < now) this.next = now + 0.06; // small cushion against gaps
    src.start(this.next);
    this.next += buf.duration;
    this.playing.add(src);
    src.onended = () => this.playing.delete(src);
  }

  stop() {
    for (const s of this.playing) {
      try {
        s.onended = null;
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.playing.clear();
    this.next = 0;
  }
}
