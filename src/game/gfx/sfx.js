/**
 * Bruitages synthétisés (Web Audio), aucun fichier.
 * Chaîne : instruments → saturation éventuelle → bus maître (compresseur) + envoi vers une réverbération générée.
 */
let ac = null, master = null, verb = null;
export const sound = { on: true };

function impulse(a, dur, decay) {
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(2, n, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** decay; }
  return buf;
}
function ctx() {
  if (!ac) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ac = new A();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 10; comp.attack.value = 0.002; comp.release.value = 0.3;
    master = ac.createGain(); master.gain.value = 0.85;
    master.connect(comp).connect(ac.destination);
    verb = ac.createConvolver(); verb.buffer = impulse(ac, 3, 2.6);
    const vg = ac.createGain(); vg.gain.value = 0.5;
    verb.connect(vg).connect(master);
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}
let noiseBuf = null;
const noiseSrc = (a) => {
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random(); return s;
};
let curve = null;
const drive = (a) => {
  if (!curve) { curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 512) - 1; curve[i] = ((1 + 40) * x) / (1 + 40 * Math.abs(x)); } }
  const w = a.createWaveShaper(); w.curve = curve; w.oversample = "2x"; return w;
};
/** Branche un nœud sur le maître, avec une part de réverbération. */
function out(a, node, wet = 0) {
  node.connect(master);
  if (wet > 0) { const g = a.createGain(); g.gain.value = wet; node.connect(g).connect(verb); }
}
function env(a, g, t, gain, dur, attack = 0.002) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

// ---------- instruments ----------
function tone(f0, f1, dur, { type = "square", gain = 0.12, at = 0, wet = 0, dist = false } = {}) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(a, g, t, gain, dur);
  let n = o.connect(g);
  if (dist) n = n.connect(drive(a));
  out(a, n, wet); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, { f = 1200, f2 = f, q = 0.8, type = "bandpass", gain = 0.25, at = 0, wet = 0, attack = 0.002, dist = false } = {}) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + at, s = noiseSrc(a), fl = a.createBiquadFilter(), g = a.createGain();
  fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
  env(a, g, t, gain, dur, attack);
  let n = s.connect(fl).connect(g);
  if (dist) n = n.connect(drive(a));
  out(a, n, wet); s.start(t); s.stop(t + dur + 0.05);
}
/** Grosse caisse cinéma : sinus qui plonge, saturé. */
const boom = (f0, f1, dur, gain, at = 0, wet = 0.3) => { tone(f0, f1, dur, { type: "sine", gain, at, wet, dist: true }); tone(f0 * 2, f1 * 2, dur * 0.4, { type: "triangle", gain: gain * 0.4, at, wet }); };
/** Claquement sec. */
const crack = (gain, at = 0, wet = 0.2, f = 3500) => { noise(0.05, { f, type: "highpass", gain, at, wet, dist: true }); noise(0.12, { f: f * 0.5, f2: 300, type: "bandpass", q: 0.6, gain: gain * 0.6, at, wet }); };
/** Cloche métallique (FM). */
function ring(f, dur, gain, at = 0, wet = 0.6) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + at, c = a.createOscillator(), m = a.createOscillator(), mg = a.createGain(), g = a.createGain();
  c.frequency.value = f; m.frequency.value = f * 1.414;
  mg.gain.setValueAtTime(f * 2, t); mg.gain.exponentialRampToValueAtTime(1, t + dur);
  m.connect(mg).connect(c.frequency);
  env(a, g, t, gain, dur);
  out(a, c.connect(g), wet); c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
}
/** Montée (riser) avant l'ultime. */
function riser(dur, at = 0) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), fl = a.createBiquadFilter(), g = a.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(420, t + dur);
  fl.type = "lowpass"; fl.Q.value = 8; fl.frequency.setValueAtTime(200, t); fl.frequency.exponentialRampToValueAtTime(7000, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
  out(a, o.connect(fl).connect(g), 0.3); o.start(t); o.stop(t + dur + 0.05);
  noise(dur, { f: 400, f2: 9000, gain: 0.2, at, attack: dur * 0.95, wet: 0.3 });
}
/** Grésillements de papier et de tabac. */
const crinkle = (n, spread, gain = 0.16, at = 0) => { for (let i = 0; i < n; i++) noise(0.012 + Math.random() * 0.02, { f: 2500 + Math.random() * 5000, q: 2, gain: gain * (0.5 + Math.random() * 0.5), at: at + Math.random() * spread }); };
/** Grésillement de braise qui s'éteint. */
const sizzle = (dur, gain = 0.12, at = 0) => { noise(dur, { f: 7000, f2: 4000, type: "highpass", gain, at, attack: 0.02, wet: 0.15 }); for (let i = 0; i < dur * 30; i++) noise(0.01, { f: 6000 + Math.random() * 4000, q: 3, gain: gain * Math.random() * (1 - i / (dur * 30)), at: at + i / 30 + Math.random() * 0.02 }); };

const SFX = {
  hit: () => { boom(170, 55, 0.18, 0.5, 0, 0.1); crack(0.25, 0, 0.05); },
  weakhit: (n = 0) => { boom(190, 60, 0.14, 0.45, 0, 0.08); crack(0.22, 0, 0.05); tone(660 * 2 ** (Math.min(n, 24) / 12), 660 * 2 ** (Math.min(n, 24) / 12), 0.07, { type: "square", gain: 0.05, at: 0.01 }); },
  black: () => {
    crack(0.9, 0, 0.4, 5000);
    boom(150, 26, 1.1, 1.0, 0, 0.6);
    for (let i = 0; i < 9; i++) noise(0.02, { f: 3000 + Math.random() * 5000, q: 4, gain: 0.35, at: 0.02 + i * 0.016, dist: true });
    ring(2300, 1.6, 0.08, 0.02);
    noise(1.2, { f: 1400, f2: 60, type: "lowpass", gain: 0.45, at: 0.03, wet: 0.5 });
  },
  charge: () => riser(0.56),
  ultimate: () => {
    crack(1, 0, 0.5, 4500);
    boom(110, 18, 2.0, 1.3, 0, 0.8);
    boom(60, 22, 1.4, 0.8, 0.05, 0.6);
    noise(2.2, { f: 900, f2: 40, type: "lowpass", gain: 0.6, wet: 0.7, dist: true });
    ring(880, 2.5, 0.06, 0.03, 0.9);
    for (let i = 0; i < 14; i++) noise(0.03, { f: 2000 + Math.random() * 6000, q: 3, gain: 0.3, at: 0.02 + i * 0.03 });
  },
  ko: () => {
    crack(0.9, 0, 0.5);
    boom(90, 20, 1.6, 1.1, 0, 0.7);
    for (let i = 0; i < 18; i++) { tone(1800 + Math.random() * 4000, 900 + Math.random() * 1500, 0.08 + Math.random() * 0.15, { type: "triangle", gain: 0.05, at: Math.random() * 0.35, wet: 0.5 }); noise(0.03, { f: 4000 + Math.random() * 4000, q: 2, gain: 0.25, at: Math.random() * 0.4 }); }
    tone(440, 55, 1.4, { type: "sawtooth", gain: 0.07, at: 0.1, wet: 0.6 });
  },
  slam: () => { boom(120, 35, 0.5, 0.9, 0, 0.5); crack(0.5, 0, 0.3, 2500); },
  refuse: () => {
    noise(0.03, { f: 2200, q: 6, gain: 0.9, dist: true });
    noise(0.07, { f: 900, q: 3, gain: 0.5, at: 0.005 });
    boom(220, 70, 0.25, 0.6, 0.01, 0.2);
    noise(0.35, { f: 600, f2: 4000, gain: 0.15, at: 0.05, wet: 0.2 });
    [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.22 + i * 0.05, { type: "square", gain: 0.06, at: 0.12 + i * 0.06, wet: 0.5 }));
    [1047, 1319, 1568].forEach((f) => tone(f, f, 0.9, { type: "triangle", gain: 0.05, at: 0.36, wet: 0.7 }));
  },
  miss: () => noise(0.16, { f: 3000, f2: 700, gain: 0.1, type: "highpass" }),
  weak: () => tone(990, 1480, 0.06, { type: "triangle", gain: 0.05 }),
  combo: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.12, { type: "square", gain: 0.05, at: i * 0.05, wet: 0.4 })); },
  heal: () => { [523, 659, 784].forEach((f, i) => tone(f, f, 0.14, { type: "triangle", gain: 0.08, at: i * 0.07, wet: 0.4 })); tone(392, 196, 0.4, { type: "sawtooth", gain: 0.04, wet: 0.3 }); },
  tap: () => { tone(140, 60, 0.08, { gain: 0.14 }); noise(0.05, { f: 1800, gain: 0.15 }); },
  touch: () => { sizzle(0.25, 0.1); crinkle(4, 0.08, 0.12); },
  crush: () => { crinkle(7, 0.12, 0.2); noise(0.08, { f: 400, type: "lowpass", gain: 0.2 }); },
  psch: () => { sizzle(1.1, 0.13); noise(0.5, { f: 3000, f2: 1200, type: "bandpass", gain: 0.06, wet: 0.2 }); },
  coin: () => { tone(988, 988, 0.07, { type: "square", gain: 0.05 }); tone(1319, 1319, 0.22, { type: "square", gain: 0.05, at: 0.07, wet: 0.3 }); },
};
export function play(name, arg) { if (sound.on) try { SFX[name]?.(arg); } catch { /* audio indisponible */ } }
