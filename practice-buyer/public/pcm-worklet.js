/**
 * Runs on the browser's audio thread. Takes microphone audio, resamples it to
 * 24 kHz (what the Voice Agent API expects), converts it to 16-bit PCM, and
 * sends 50 ms chunks to the page.
 */
class PCMCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = options.processorOptions || {};
    this.targetRate = opts.targetRate || 24000;
    this.chunk = opts.chunk || 1200; // 50 ms at 24 kHz
    // Some browsers ignore the requested sample rate, so use the real one.
    this.step = sampleRate / this.targetRate;
    this.carry = new Float32Array(0);
    this.pos = 0;
    this.out = new Int16Array(this.chunk);
    this.n = 0;
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;

    const buf = new Float32Array(this.carry.length + input.length);
    buf.set(this.carry);
    buf.set(input, this.carry.length);

    let p = this.pos;
    while (Math.floor(p) + 1 < buf.length) {
      const i = Math.floor(p);
      const f = p - i;
      const s = Math.max(-1, Math.min(1, buf[i] * (1 - f) + buf[i + 1] * f));
      this.out[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.chunk) {
        const copy = this.out.slice(0);
        this.port.postMessage(copy.buffer, [copy.buffer]);
        this.n = 0;
      }
      p += this.step;
    }
    const used = Math.floor(p);
    this.carry = buf.slice(used);
    this.pos = p - used;
    return true;
  }
}

registerProcessor("pcm-capture", PCMCapture);
