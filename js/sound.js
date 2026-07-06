// Procedural sound — everything synthesized with WebAudio, no audio files.
let ctx = null;
let master = null;
let muted = false;
try { muted = localStorage.getItem("ow-muted") === "1"; } catch (_) {}

export const isMuted = () => muted;

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem("ow-muted", muted ? "1" : "0"); } catch (_) {}
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.1);
  return muted;
}

// Must be called from a user gesture (browser autoplay policy).
export function initSound() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  startHum();
}

function noiseBuffer(seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/* Deep, slow space ambience: two detuned sines + rumbling filtered noise */
function startHum() {
  const humGain = ctx.createGain();
  humGain.gain.value = 0;
  humGain.connect(master);
  humGain.gain.setTargetAtTime(1, ctx.currentTime, 3);

  [46, 52.3].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.014;
    o.connect(g); g.connect(humGain);
    // slow breathing via LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + i * 0.03;
    const lg = ctx.createGain();
    lg.gain.value = 0.006;
    lfo.connect(lg); lg.connect(g.gain);
    o.start(); lfo.start();
  });

  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(4);
  n.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 110;
  const g = ctx.createGain();
  g.gain.value = 0.02;
  n.connect(f); f.connect(g); g.connect(humGain);
  n.start();
}

/* Airy whoosh for camera flights */
export function whoosh() {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(1.6);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(160, t);
  bp.frequency.exponentialRampToValueAtTime(1500, t + 0.45);
  bp.frequency.exponentialRampToValueAtTime(200, t + 1.4);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  src.connect(bp); bp.connect(g); g.connect(master);
  src.start(t);
  src.stop(t + 1.6);
}

/* Soft sonar ping when a rock is selected */
export function ping() {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(920, t);
  o.frequency.exponentialRampToValueAtTime(690, t + 0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g); g.connect(master);
  o.start(t);
  o.stop(t + 0.55);
}
