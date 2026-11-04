/**
 * Bruitages synthétisés, sans fichier.
 * Chaque son est calculé une seule fois hors ligne (OfflineAudioContext) au premier appui,
 * puis rejoué comme un simple échantillon : pas de pic de calcul pendant le jeu, donc pas de craquements.
 */
export const sound = { on: true };
const SR = 44100;
let ac = null, bus = null, rendering = null;
const buffers = {};

// ---------- instruments (fonctionnent dans n'importe quel contexte audio) ----------
function envGain(a, t, peak, attack, decay) {
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}
function noiseBuffer(a) {
  if (a._noise) return a._noise;
  const b = a.createBuffer(1, a.sampleRate, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (a._noise = b);
}
function drive(a, amount = 30) {
  const w = a.createWaveShaper(), c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x)); }
  w.curve = c; w.oversample = "4x";
  return w;
}
function osc(a, dest, t, { type = "sine", f0, f1 = f0, glide, peak = 0.3, attack = 0.003, decay = 0.2, dist = 0 }) {
  const o = a.createOscillator(), g = envGain(a, t, peak, attack, decay);
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + (glide ?? attack + decay));
  // la saturation passe AVANT l'enveloppe : le son décroît naturellement au lieu de bourdonner
  if (dist) o.connect(drive(a, dist)).connect(g).connect(dest); else o.connect(g).connect(dest);
  o.start(t); o.stop(t + attack + decay + 0.05);
}
function hiss(a, dest, t, { f0 = 2000, f1 = f0, q = 0.7, type = "bandpass", peak = 0.2, attack = 0.003, decay = 0.2, dist = 0 }) {
  const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = envGain(a, t, peak, attack, decay);
  s.buffer = noiseBuffer(a); s.loop = true;
  fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
  if (dist) s.connect(fl).connect(drive(a, dist)).connect(g).connect(dest); else s.connect(fl).connect(g).connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + attack + decay + 0.05);
}
/** Coup sourd : sinus qui plonge (la « grosse caisse »). */
const kick = (a, d, t, f0, f1, decay, peak) => osc(a, d, t, { f0, f1, glide: decay * 0.6, peak, decay });
/** Petit claquement, filtré pour rester doux. */
const click = (a, d, t, peak = 0.25, f = 2500) => hiss(a, d, t, { f0: f, q: 1.2, peak, decay: 0.03 });
/** Tintement clair (deux triangles légèrement désaccordés). */
const chime = (a, d, t, f, peak = 0.1, decay = 0.6) => { osc(a, d, t, { type: "triangle", f0: f, peak, decay }); osc(a, d, t, { type: "sine", f0: f * 2.01, peak: peak * 0.4, decay: decay * 0.6 }); };
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const note = (base, step) => base * 2 ** (PENTA[Math.min(step, PENTA.length - 1)] / 12);

/**
 * Impact lourd : claquement saturé + craquement médium + gros coup grave saturé qui plonge vite.
 * Tout est coupé net : aucune queue grave au-delà de ~0,4 s, donc rien qui bourdonne.
 */
function impact(a, d, t, { punch = 1, body = 0.12, snap = 2200 } = {}) {
  hiss(a, d, t, { f0: snap, q: 1.1, peak: 0.5, decay: 0.025 });
  hiss(a, d, t, { type: "lowpass", f0: 900, f1: 200, q: 0.7, peak: 0.6 * punch, decay: body });
  kick(a, d, t, 150, 55, 0.09 + body * 0.4, 0.7 * punch);
}
function heavy(a, d, t, size = 1) {
  hiss(a, d, t, { type: "highpass", f0: 4500, peak: 0.9, decay: 0.05, dist: 20 });
  hiss(a, d, t, { f0: 1500, f1: 300, q: 0.6, peak: 0.6, decay: 0.12 * size });
  osc(a, d, t, { type: "sine", f0: 170, f1: 48, glide: 0.12 * size, peak: 1, decay: 0.2 * size, dist: 8 });
  osc(a, d, t, { type: "triangle", f0: 320, f1: 84, glide: 0.1 * size, peak: 0.4, decay: 0.12 * size });
}
const crackle = (a, d, t, n, gap) => { for (let i = 0; i < n; i++) hiss(a, d, t + i * gap, { f0: 3000 + Math.random() * 5000, q: 4, peak: 0.35, decay: 0.02, dist: 15 }); };

/** Recettes : durée totale, part de réverbération (salle courte), et le dessin du son. */
const RECIPES = {
  hit: [0.4, 0.12, (a, d) => impact(a, d, 0, { punch: 0.8, body: 0.09 })],
  weakhit: [0.4, 0.12, (a, d) => { impact(a, d, 0, { punch: 0.7, body: 0.08, snap: 2800 }); osc(a, d, 0, { type: "triangle", f0: 880, peak: 0.08, decay: 0.06 }); }],
  black: [0.9, 0.3, (a, d) => { heavy(a, d, 0, 1); crackle(a, d, 0.02, 9, 0.016); }],
  charge: [0.65, 0, (a, d) => hiss(a, d, 0, { f0: 600, f1: 5000, q: 0.9, peak: 0.22, attack: 0.5, decay: 0.05 })],
  ultimate: [1.1, 0.35, (a, d) => { heavy(a, d, 0, 1.4); heavy(a, d, 0.05, 1); crackle(a, d, 0.02, 14, 0.02); }],
  ko: [1.1, 0.35, (a, d) => {
    heavy(a, d, 0, 1.3);
    for (let i = 0; i < 16; i++) hiss(a, d, 0.03 + Math.random() * 0.3, { f0: 3000 + Math.random() * 5000, q: 4, peak: 0.22, decay: 0.025, dist: 10 });
  }],
  slam: [0.6, 0.2, (a, d) => heavy(a, d, 0, 0.8)],
  refuse: [0.6, 0.2, (a, d) => {
    hiss(a, d, 0, { f0: 3200, q: 4, peak: 0.8, decay: 0.015, dist: 20 });
    hiss(a, d, 0.004, { f0: 1100, q: 2, peak: 0.4, decay: 0.04 });
    heavy(a, d, 0.01, 0.7);
  }],
  miss: [0.2, 0, (a, d) => hiss(a, d, 0, { f0: 1600, f1: 600, q: 1, peak: 0.12, attack: 0.02, decay: 0.1 })],
  weak: [0.1, 0, (a, d) => osc(a, d, 0, { type: "triangle", f0: 1100, peak: 0.12, decay: 0.05 })],
  combo: [0.25, 0, (a, d) => [0, 4, 7].forEach((s, i) => osc(a, d, i * 0.05, { type: "triangle", f0: 880 * 2 ** (s / 12), peak: 0.1, decay: 0.06 }))],
  heal: [0.25, 0, (a, d) => { osc(a, d, 0, { type: "triangle", f0: 330, peak: 0.12, decay: 0.07 }); osc(a, d, 0.09, { type: "triangle", f0: 247, peak: 0.12, decay: 0.09 }); }],
  tap: [0.2, 0, (a, d) => impact(a, d, 0, { punch: 0.5, body: 0.06 })],
  touch: [0.4, 0, (a, d) => { hiss(a, d, 0, { type: "highpass", f0: 4000, peak: 0.12, attack: 0.01, decay: 0.25 }); hiss(a, d, 0, { f0: 3500, q: 1.2, peak: 0.12, decay: 0.03 }); }],
  crush: [0.2, 0, (a, d) => { for (let i = 0; i < 5; i++) hiss(a, d, i * 0.025 + Math.random() * 0.01, { f0: 2500 + Math.random() * 2500, q: 2.5, peak: 0.12, decay: 0.015 }); hiss(a, d, 0, { type: "lowpass", f0: 600, peak: 0.15, decay: 0.05 }); }],
  psch: [0.8, 0, (a, d) => hiss(a, d, 0, { f0: 6000, f1: 3000, q: 0.7, peak: 0.13, attack: 0.03, decay: 0.6 })],
  coin: [0.25, 0, (a, d) => { osc(a, d, 0, { type: "triangle", f0: 988, peak: 0.08, decay: 0.05 }); osc(a, d, 0.07, { type: "triangle", f0: 1319, peak: 0.08, decay: 0.1 }); }],
};

/** Niveau de crête visé pour chaque son (les gros impacts dominent, les petits bruits restent discrets). */
const LEVEL = { hit: 0.55, weakhit: 0.5, black: 0.95, charge: 0.4, ultimate: 0.95, ko: 0.9, slam: 0.7, refuse: 0.7, miss: 0.22, weak: 0.25, combo: 0.35, heal: 0.4, tap: 0.4, touch: 0.3, crush: 0.35, psch: 0.3, coin: 0.35 };
function impulse(a, dur) {
  const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(2, n, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 5; }
  return b;
}
async function renderAll() {
  const O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!O) return;
  for (const [name, [dur, wet, draw]] of Object.entries(RECIPES)) {
    const a = new O(2, Math.ceil(SR * dur), SR);
    const dry = a.createGain(); dry.gain.value = 1; dry.connect(a.destination);
    if (wet > 0) {
      const cv = a.createConvolver(); cv.buffer = impulse(a, 0.45);
      const w = a.createGain(); w.gain.value = wet;
      dry.connect(cv).connect(w).connect(a.destination);
    }
    draw(a, dry);
    try {
      const buf = await a.startRendering();
      // normalisation : chaque son à son niveau cible, jamais au-delà de 0,95 (pas d'écrêtage)
      let pk = 0;
      for (let c = 0; c < buf.numberOfChannels; c++) for (const v of buf.getChannelData(c)) pk = Math.max(pk, Math.abs(v));
      const k = pk > 0 ? (LEVEL[name] ?? 0.5) / pk : 1;
      for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
      buffers[name] = buf;
    } catch { /* son ignoré */ }
  }
}

/** Débloque l'audio au premier geste (obligatoire sur iPhone), puis prépare tous les sons. */
export function unlock() {
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  if (!ac) {
    ac = new A();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    bus = ac.createGain(); bus.gain.value = 0.7;
    bus.connect(comp).connect(ac.destination);
  }
  if (ac.state !== "running") ac.resume?.();
  const s = ac.createBufferSource(); s.buffer = ac.createBuffer(1, 1, 22050); s.connect(ac.destination); s.start(0);
  if (!rendering) rendering = renderAll();
}
if (typeof window !== "undefined") {
  const once = () => unlock();
  for (const ev of ["pointerdown", "touchend", "keydown"]) window.addEventListener(ev, once, { capture: true, passive: true });
}

/** Joue un son préparé. arg : rang dans le combo (la note monte sur une gamme pentatonique). */
export function play(name, arg) {
  if (!sound.on || !ac || ac.state !== "running") return;
  const b = buffers[name];
  if (!b) return;
  const s = ac.createBufferSource();
  s.buffer = b;
  let rate = 1 + (Math.random() - 0.5) * 0.04;
  if (name === "weakhit" && arg) rate = 2 ** (PENTA[Math.min(arg - 1, PENTA.length - 1)] / 12);
  s.playbackRate.value = rate;
  s.connect(bus);
  s.start();
}
export const _buffers = buffers;
