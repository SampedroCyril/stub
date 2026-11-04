/** Bruitages synthétisés (Web Audio), aucun fichier. */
let ac = null;
export const sound = { on: true };
const ctx = () => {
  if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
  if (ac.state === "suspended") ac.resume();
  return ac;
};
let noiseBuf = null;
function noise(dur, { f = 1200, f2 = f, q = 0.8, type = "bandpass", gain = 0.25, at = 0 } = {}) {
  const a = ctx(); if (!a) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = a.currentTime + at, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; s.loop = true;
  fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + 0.02);
}
function tone(f0, f1, dur, { type = "square", gain = 0.12, at = 0 } = {}) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  hit: () => { tone(180, 60, 0.12, { gain: 0.16 }); noise(0.07, { f: 900, gain: 0.25 }); },
  crit: () => { tone(260, 70, 0.16, { gain: 0.16 }); noise(0.1, { f: 1400, gain: 0.3 }); tone(1320, 1760, 0.08, { type: "triangle", gain: 0.08, at: 0.03 }); },
  big: () => { tone(120, 35, 0.35, { gain: 0.22 }); noise(0.3, { f: 600, f2: 120, gain: 0.4, type: "lowpass" }); tone(880, 1320, 0.1, { type: "triangle", gain: 0.07, at: 0.05 }); },
  miss: () => noise(0.14, { f: 3000, f2: 900, gain: 0.08, type: "highpass" }),
  weak: () => tone(990, 1480, 0.06, { type: "triangle", gain: 0.05 }),
  heal: () => [523, 659, 784].forEach((f, i) => tone(f, f, 0.12, { type: "triangle", gain: 0.07, at: i * 0.07 })),
  refuse: () => { tone(330, 990, 0.1, { gain: 0.09 }); tone(660, 1320, 0.12, { type: "triangle", gain: 0.06, at: 0.06 }); },
  ko: () => { noise(0.5, { f: 800, f2: 80, gain: 0.45, type: "lowpass" }); tone(220, 40, 0.6, { gain: 0.18 }); },
  slam: () => { tone(90, 40, 0.25, { gain: 0.25 }); noise(0.12, { f: 400, gain: 0.3, type: "lowpass" }); },
  tap: () => { tone(140, 60, 0.08, { gain: 0.14 }); noise(0.05, { f: 1800, gain: 0.15 }); },
  crush: () => { for (let i = 0; i < 5; i++) noise(0.03, { f: 2500 + Math.random() * 2000, gain: 0.18, at: i * 0.035 + Math.random() * 0.02 }); },
  psch: () => noise(0.9, { f: 6000, f2: 2500, gain: 0.14, type: "highpass" }),
  coin: () => { tone(988, 988, 0.07, { type: "square", gain: 0.05 }); tone(1319, 1319, 0.18, { type: "square", gain: 0.05, at: 0.07 }); },
};
export function play(name) { if (sound.on) try { SFX[name]?.(); } catch { /* audio indisponible */ } }
