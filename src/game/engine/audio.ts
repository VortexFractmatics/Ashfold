/** Tiny Web Audio bus. Unlocks on first gesture. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let muted = false;
let volume = 0.45;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC({ latencyHint: "interactive" });
  master = ctx.createGain();
  sfx = ctx.createGain();
  sfx.connect(master);
  master.connect(ctx.destination);
  master.gain.value = muted ? 0 : volume * volume;
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c.state === "suspended") void c.resume();
}

export function setMuted(v: boolean) {
  muted = v;
  if (master && ctx) master.gain.setTargetAtTime(v ? 0 : volume * volume, ctx.currentTime, 0.02);
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (master && ctx && !muted) master.gain.setTargetAtTime(volume * volume, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

function beep(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  const c = ctx;
  if (!c || !sfx || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g);
  g.connect(sfx);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
  o.onended = () => { o.disconnect(); g.disconnect(); };
}

export function sfxUi() {
  beep(520, 0.07, "triangle", 0.05);
}
export function sfxHit() {
  beep(180 + Math.random() * 40, 0.09, "square", 0.07, -80);
}
export function sfxStep() {
  beep(90 + Math.random() * 20, 0.04, "sine", 0.03);
}
export function sfxQuest() {
  beep(440, 0.12, "triangle", 0.06, 180);
}
export function sfxDie() {
  beep(140, 0.35, "sawtooth", 0.05, -90);
}
