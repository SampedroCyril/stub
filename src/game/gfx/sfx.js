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
/**
 * Basse virtuelle : la note grave + ses harmoniques 2, 3 et 4 qui suivent la même chute.
 * Un haut-parleur de téléphone ne produit pas le grave lui-même, mais l'oreille le reconstitue à partir des harmoniques.
 */
function vbass(a, d, t, f0, f1, glide, peak, decay) {
  [[1, 1], [2, 0.6], [3, 0.38], [4, 0.22], [5, 0.12]].forEach(([h, p]) => osc(a, d, t, { type: "sine", f0: f0 * h, f1: f1 * h, glide, peak: peak * p, decay: decay * (1 - h * 0.08) }));
}
/** Accord grave façon cuivres de film : dents de scie filtrées qui s'ouvrent puis se referment, sans tenir. */
function braam(a, d, t, root, decay, peak) {
  const f = a.createBiquadFilter(), g = a.createGain();
  f.type = "lowpass"; f.Q.value = 2;
  f.frequency.setValueAtTime(150, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.06); f.frequency.exponentialRampToValueAtTime(120, t + decay);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  f.connect(g).connect(d);
  [1, 1.5, 2, 1.005, 2.01].forEach((m) => { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(root * m, t); o.frequency.exponentialRampToValueAtTime(root * m * 0.94, t + decay); o.connect(f); o.start(t); o.stop(t + decay + 0.05); });
}
/** L'explosion grave du son « Anime » (H), réutilisée pour l'ultime et le K.O. */
function bigBoom(a, d, t, size = 1) {
  hiss(a, d, t, { type: "highpass", f0: 2500, peak: 0.6, decay: 0.05, dist: 10 });
  vbass(a, d, t, 75, 28, 0.4 * size, 1, 1.4 * size);
  hiss(a, d, t, { type: "lowpass", f0: 1500, f1: 70, q: 0.5, peak: 0.7, decay: 0.9 * size });
  braam(a, d, t + 0.01, 55, 0.8 * size, 0.35);
}
const crackle = (a, d, t, n, gap) => { for (let i = 0; i < n; i++) hiss(a, d, t + i * gap, { f0: 3000 + Math.random() * 5000, q: 4, peak: 0.35, decay: 0.02, dist: 15 }); };

/** Recettes : durée totale, part de réverbération (salle courte), et le dessin du son. */
const RECIPES = {
  hit: [0.4, 0.12, (a, d) => impact(a, d, 0, { punch: 0.8, body: 0.09 })],
  weakhit: [0.4, 0.12, (a, d) => { impact(a, d, 0, { punch: 0.7, body: 0.08, snap: 2800 }); osc(a, d, 0, { type: "triangle", f0: 880, peak: 0.08, decay: 0.06 }); }],
  black: [0.9, 0.3, (a, d) => { heavy(a, d, 0, 1); crackle(a, d, 0.02, 9, 0.016); }],
  // --- comparateur, deuxième série ---
  // E Bande-annonce : souffle qui monte, impact, chute de basse et accord de cuivres grave, grande salle
  crit_e: [2.6, 0.4, (a, d) => {
    hiss(a, d, 0, { type: "highpass", f0: 4000, peak: 0.8, decay: 0.04, dist: 12 });
    vbass(a, d, 0, 72, 30, 0.35, 1, 1.2);
    braam(a, d, 0.01, 55, 0.9, 0.55);
    hiss(a, d, 0, { type: "lowpass", f0: 1200, f1: 90, q: 0.5, peak: 0.5, decay: 0.6 });
  }, "long"],
  // F 808 : chute de basse longue et ronde, claquement net (style rap)
  crit_f: [2.0, 0.15, (a, d) => {
    hiss(a, d, 0, { f0: 1800, q: 0.9, peak: 0.9, decay: 0.03, dist: 10 });
    hiss(a, d, 0.008, { f0: 1200, q: 1.5, peak: 0.5, decay: 0.05 });
    vbass(a, d, 0, 95, 38, 0.18, 1, 1.3);
  }],
  // G Enclume : métal frappé géant, double coup grave, débris
  crit_g: [2.4, 0.35, (a, d) => {
    hiss(a, d, 0, { type: "highpass", f0: 3500, peak: 0.8, decay: 0.05, dist: 12 });
    [[220, 0.5], [563, 0.35], [891, 0.25], [1342, 0.18], [1995, 0.1]].forEach(([f, p]) => osc(a, d, 0, { type: "sine", f0: f, f1: f * 0.98, peak: p * 0.5, decay: 0.5 }));
    vbass(a, d, 0, 80, 34, 0.25, 1, 0.9);
    vbass(a, d, 0.035, 60, 30, 0.3, 0.6, 0.8);
    for (let i = 0; i < 10; i++) hiss(a, d, 0.05 + Math.random() * 0.35, { f0: 2000 + Math.random() * 4000, q: 3, peak: 0.12, decay: 0.03 });
  }, "long"],
  // H Anime : claquement et grésillement figé pendant les images d'impact, puis l'explosion grave quand l'image repart
  crit_h: [2.6, 0.4, (a, d) => {
    hiss(a, d, 0, { type: "highpass", f0: 5000, peak: 0.9, decay: 0.03, dist: 20 });
    for (let i = 0; i < 9; i++) hiss(a, d, 0.01 + i * 0.016, { f0: 2500 + (i % 3) * 1500, q: 2, peak: 0.35, decay: 0.012, dist: 15 });
    const T = 0.15;
    hiss(a, d, T, { type: "highpass", f0: 2500, peak: 0.6, decay: 0.05, dist: 10 });
    vbass(a, d, T, 75, 28, 0.4, 1, 1.4);
    hiss(a, d, T, { type: "lowpass", f0: 1500, f1: 70, q: 0.5, peak: 0.7, decay: 0.9 });
    braam(a, d, T + 0.01, 55, 0.8, 0.35);
  }, "long"],
  // --- ultime et K.O., calés sur les images (60 images/s) ---
  ult_fracture: [3, 0.4, (a, d) => {
    hiss(a, d, 0, { type: "highpass", f0: 5000, peak: 0.9, decay: 0.03, dist: 20 });
    for (let i = 0; i < 14; i++) hiss(a, d, 0.02 + i * 0.03, { f0: 3500 + Math.random() * 4500, q: 5, peak: 0.12 + i * 0.012, decay: 0.015 });
    const T = 0.5;
    hiss(a, d, T, { type: "lowpass", f0: 7000, f1: 1500, q: 0.5, peak: 0.6, decay: 0.35 });
    for (let i = 0; i < 24; i++) hiss(a, d, T + Math.random() * 0.45, { f0: 3000 + Math.random() * 6000, q: 6, peak: 0.2, decay: 0.03 });
    bigBoom(a, d, T, 1.1);
  }, "long"],
  ult_nova: [3.4, 0.45, (a, d) => {
    hiss(a, d, 0, { type: "highpass", f0: 5000, peak: 0.8, decay: 0.03, dist: 20 });
    hiss(a, d, 0.05, { f0: 300, f1: 6000, q: 1, peak: 0.35, attack: 0.4, decay: 0.02 });
    osc(a, d, 0.05, { type: "sine", f0: 120, f1: 480, glide: 0.42, peak: 0.25, attack: 0.4, decay: 0.02 });
    bigBoom(a, d, 0.47, 1.3);
    braam(a, d, 0.48, 46, 1.2, 0.5);
  }, "long"],
  ko_cut: [2.8, 0.4, (a, d) => {
    osc(a, d, 0, { type: "sine", f0: 150, f1: 60, peak: 0.6, decay: 0.08 });
    hiss(a, d, 0.2, { f0: 1500, f1: 9000, q: 1.2, peak: 0.6, decay: 0.12 });
    osc(a, d, 0.2, { type: "sine", f0: 3200, f1: 2500, peak: 0.15, decay: 0.3 });
    bigBoom(a, d, 0.7, 1.2);
  }, "long"],
  ko_manga: [2.8, 0.4, (a, d) => {
    [0, 0.133, 0.266].forEach((t, i) => { hiss(a, d, t, { type: "highpass", f0: 3500, peak: 0.7, decay: 0.03, dist: 15 }); vbass(a, d, t, 110 - i * 15, 60, 0.08, 0.6, 0.18); });
    bigBoom(a, d, 0.76, 1.2);
  }, "long"],
  // --- pack d'effets : ultimes (calés sur l'image d'impact de chaque effet) ---
  // Foudre : pluie et grondement sourd, deux éclairs de chaleur, puis le claquement sec et l'orage qui roule
  ult_thunder: [3.4, 0.45, (a, d) => {
    hiss(a, d, 0, { type: "highpass", f0: 3000, peak: 0.12, attack: 0.15, decay: 0.3 });
    vbass(a, d, 0.1, 50, 40, 0.3, 0.25, 0.25);
    const T = 0.27;
    hiss(a, d, T, { type: "highpass", f0: 6000, peak: 1, decay: 0.04, dist: 30 });
    crackle(a, d, T + 0.005, 12, 0.012);
    bigBoom(a, d, T + 0.02, 1.2);
    for (let i = 0; i < 4; i++) hiss(a, d, T + 0.35 + i * 0.22, { type: "lowpass", f0: 500, f1: 90, q: 0.6, peak: 0.35 - i * 0.06, attack: 0.05, decay: 0.4 });
  }, "long"],
  // Trou noir : tout est aspiré (souffle et grave qui montent), silence, puis l'explosion
  ult_void: [3.6, 0.45, (a, d) => {
    hiss(a, d, 0, { f0: 200, f1: 4000, q: 1.2, peak: 0.4, attack: 0.6, decay: 0.03 });
    osc(a, d, 0, { type: "sawtooth", f0: 40, f1: 220, glide: 0.62, peak: 0.12, attack: 0.6, decay: 0.03 });
    vbass(a, d, 0, 45, 90, 0.6, 0.3, 0.62);
    bigBoom(a, d, 0.66, 1.4);
    braam(a, d, 0.67, 41, 1.3, 0.5);
  }, "long"],
  // Encre : le pinceau fouette, le taiko frappe, les claquoirs de bois
  ult_ink: [3, 0.4, (a, d) => {
    hiss(a, d, 0.05, { f0: 900, f1: 3500, q: 1.4, peak: 0.5, attack: 0.1, decay: 0.08 });
    const T = 0.22;
    vbass(a, d, T, 95, 48, 0.12, 1, 0.55);
    hiss(a, d, T, { type: "lowpass", f0: 700, f1: 120, q: 0.6, peak: 0.6, decay: 0.25 });
    hiss(a, d, T, { type: "highpass", f0: 2500, peak: 0.5, decay: 0.03, dist: 10 });
    [0.3, 0.42].forEach((t) => { osc(a, d, T + t, { type: "triangle", f0: 1800, f1: 1500, peak: 0.25, decay: 0.05 }); hiss(a, d, T + t, { f0: 2600, q: 3, peak: 0.3, decay: 0.02 }); });
    braam(a, d, T + 0.01, 55, 0.9, 0.3);
  }, "long"],
  // Glitch : crépitements numériques hachés, puis tout repart d'un coup
  ult_glitch: [2.6, 0.3, (a, d) => {
    for (let i = 0; i < 22; i++) { const t = i * 0.024; if (Math.random() < 0.25) continue; osc(a, d, t, { type: "square", f0: 200 + Math.random() * 1800, peak: 0.12, decay: 0.012, dist: 20 }); }
    hiss(a, d, 0.2, { type: "bandpass", f0: 3000, q: 8, peak: 0.25, decay: 0.15, dist: 30 });
    osc(a, d, 0.45, { type: "square", f0: 1500, f1: 60, glide: 0.08, peak: 0.25, decay: 0.08 });
    bigBoom(a, d, 0.53, 1.1);
  }, "long"],
  // Météore : sifflement qui tombe et grondement de feu, puis l'impact énorme et les débris
  ult_meteor: [3.6, 0.45, (a, d) => {
    osc(a, d, 0, { type: "sine", f0: 2400, f1: 300, glide: 0.46, peak: 0.12, attack: 0.05, decay: 0.42 });
    hiss(a, d, 0, { type: "lowpass", f0: 300, f1: 2500, q: 0.7, peak: 0.45, attack: 0.44, decay: 0.03 });
    const T = 0.47;
    bigBoom(a, d, T, 1.5);
    for (let i = 0; i < 18; i++) hiss(a, d, T + 0.1 + Math.random() * 0.8, { f0: 600 + Math.random() * 2500, q: 2, peak: 0.12, decay: 0.04 });
  }, "long"],
  // Mille lames : dix coups de lame qui sifflent et tintent, puis la croix
  ult_blades: [3, 0.4, (a, d) => {
    for (let i = 0; i < 11; i++) { const t = (2 + i * 2.6) / 60; hiss(a, d, t, { f0: 2000, f1: 8000, q: 1.5, peak: 0.35, decay: 0.035 }); osc(a, d, t + 0.01, { type: "sine", f0: 3000 + Math.random() * 1500, peak: 0.06, decay: 0.12 }); }
    const T = 31 / 60;
    hiss(a, d, T, { f0: 1500, f1: 9000, q: 1.2, peak: 0.7, decay: 0.1 });
    osc(a, d, T, { type: "sine", f0: 3600, f1: 2900, peak: 0.15, decay: 0.4 });
    bigBoom(a, d, T + 0.02, 1.2);
  }, "long"],
  // --- pack d'effets : K.O. ---
  // Cendres : un coup sourd, la braise qui s'éteint, puis le vent qui emporte tout en crépitant
  ko_ash: [3.4, 0.4, (a, d) => {
    vbass(a, d, 0, 70, 30, 0.4, 0.8, 1);
    hiss(a, d, 0.05, { type: "highpass", f0: 5000, f1: 2500, peak: 0.25, attack: 0.03, decay: 0.7 });
    hiss(a, d, 0.3, { type: "bandpass", f0: 400, f1: 900, q: 0.8, peak: 0.3, attack: 0.6, decay: 1.6 });
    for (let i = 0; i < 40; i++) hiss(a, d, 0.35 + Math.random() * 1.6, { f0: 2500 + Math.random() * 5000, q: 5, peak: 0.08, decay: 0.012 });
    chime(a, d, 1.2, 330, 0.05, 1.2);
  }, "long"],
  // Écrasé : la botte qui tombe, l'écrasement, puis on tourne comme pour éteindre un mégot
  ko_stomp: [3, 0.35, (a, d) => {
    hiss(a, d, 0, { f0: 3000, f1: 400, q: 0.8, peak: 0.3, attack: 0.18, decay: 0.05 });
    const T = 14 / 60;
    heavy(a, d, T, 1.5);
    bigBoom(a, d, T, 1.2);
    for (let i = 0; i < 18; i++) hiss(a, d, T + Math.random() * 0.2, { f0: 2000 + Math.random() * 4000, q: 3, peak: 0.25, decay: 0.02, dist: 10 });
    [0.33, 0.47, 0.6].forEach((t) => hiss(a, d, t, { f0: 500, f1: 300, q: 4, peak: 0.25, attack: 0.03, decay: 0.08, dist: 8 }));
    hiss(a, d, 0.7, { f0: 6000, f1: 3000, q: 0.7, peak: 0.12, attack: 0.03, decay: 0.5 });
  }, "long"],
  // Feu d'artifice : la fusée monte en sifflant, puis quatre bouquets et leurs paillettes
  ko_fireworks: [3.6, 0.45, (a, d) => {
    heavy(a, d, 0, 1);
    osc(a, d, 0.1, { type: "sine", f0: 600, f1: 2200, glide: 0.38, peak: 0.08, attack: 0.05, decay: 0.35 });
    [[0.5, 1.1], [0.8, 0.8], [1.03, 0.8], [1.33, 1.3]].forEach(([t, s]) => {
      hiss(a, d, t, { type: "highpass", f0: 2000, peak: 0.5 * s, decay: 0.04, dist: 10 });
      vbass(a, d, t, 90, 40, 0.15, 0.6 * s, 0.4 * s);
      for (let i = 0; i < 10 * s; i++) hiss(a, d, t + 0.35 + Math.random() * 0.4, { f0: 4000 + Math.random() * 4000, q: 6, peak: 0.1, decay: 0.01 });
    });
    [0, 4, 7, 12].forEach((st, i) => chime(a, d, 1.4 + i * 0.09, 523 * 2 ** (st / 12), 0.06, 0.7));
  }, "long"],
  // Extinction : grésillement, la télé qui s'éteint (le « tchiou »), puis le clic
  ko_crt: [2.6, 0.3, (a, d) => {
    hiss(a, d, 0, { type: "highpass", f0: 2000, peak: 0.3, decay: 0.2 });
    vbass(a, d, 0, 70, 30, 0.3, 0.7, 0.6);
    osc(a, d, 0.2, { type: "sine", f0: 1600, f1: 50, glide: 0.38, peak: 0.25, decay: 0.42 });
    hiss(a, d, 0.2, { f0: 5000, f1: 300, q: 2, peak: 0.2, decay: 0.4 });
    click(a, d, 0.95, 0.4, 1800);
  }, "long"],
  // Gel : cristaux qui chantent, la glace craque, puis éclate
  ko_freeze: [3.4, 0.45, (a, d) => {
    vbass(a, d, 0, 70, 34, 0.3, 0.6, 0.6);
    for (let i = 0; i < 16; i++) chime(a, d, 0.05 + i * 0.045, 1800 + Math.random() * 2800, 0.025, 0.4);
    crackle(a, d, 0.77, 8, 0.02);
    const T = 56 / 60;
    hiss(a, d, T, { type: "highpass", f0: 4000, f1: 2000, peak: 0.7, decay: 0.3, dist: 6 });
    for (let i = 0; i < 26; i++) chime(a, d, T + Math.random() * 0.5, 2500 + Math.random() * 4500, 0.04, 0.15);
    bigBoom(a, d, T, 1);
  }, "long"],
  // Envolé : le coup de poing, le boss qui s'éloigne en sifflant, et le « ting ! » de l'étoile
  ko_sky: [2.6, 0.35, (a, d) => {
    heavy(a, d, 0, 1.4);
    bigBoom(a, d, 0, 0.8);
    hiss(a, d, 0.08, { f0: 1500, f1: 7000, q: 2, peak: 0.3, attack: 0.05, decay: 0.6 });
    osc(a, d, 0.08, { type: "sine", f0: 900, f1: 2400, glide: 0.6, peak: 0.06, decay: 0.6 });
    chime(a, d, 0.75, 2637, 0.18, 0.9);
    chime(a, d, 0.75, 3951, 0.08, 0.6);
  }, "long"],
  // --- signatures : une petite couche par-dessus le son du coup ---
  sig_embers: [0.4, 0.1, (a, d) => { hiss(a, d, 0, { f0: 700, f1: 2600, q: 0.9, peak: 0.4, attack: 0.02, decay: 0.16 }); crackle(a, d, 0.02, 5, 0.025); }],
  sig_ink: [0.35, 0.1, (a, d) => { hiss(a, d, 0, { type: "lowpass", f0: 1400, f1: 250, q: 1.2, peak: 0.6, decay: 0.09 }); kick(a, d, 0, 140, 60, 0.06, 0.4); hiss(a, d, 0.05, { f0: 3000, q: 4, peak: 0.12, decay: 0.02 }); }],
  sig_neon: [0.35, 0.15, (a, d) => { osc(a, d, 0, { type: "square", f0: 2200, f1: 280, glide: 0.09, peak: 0.12, decay: 0.1 }); osc(a, d, 0.01, { type: "sine", f0: 3300, peak: 0.08, decay: 0.12 }); }],
  sig_petals: [0.6, 0.2, (a, d) => { const f = [1046, 1175, 1319, 1568][(Math.random() * 4) | 0]; chime(a, d, 0, f, 0.12, 0.35); hiss(a, d, 0, { type: "highpass", f0: 5000, peak: 0.06, attack: 0.03, decay: 0.2 }); }],
  sig_gold: [0.4, 0.1, (a, d) => { osc(a, d, 0, { type: "square", f0: 988, peak: 0.07, decay: 0.05 }); osc(a, d, 0.06, { type: "square", f0: 1319, peak: 0.07, decay: 0.16 }); }],
  sig_rainbow: [0.45, 0.15, (a, d) => [0, 4, 7, 12].forEach((st, i) => osc(a, d, i * 0.03, { type: "triangle", f0: 1046 * 2 ** (st / 12), peak: 0.08, decay: 0.12 }))],
  sig_bd: [0.35, 0.1, (a, d) => { osc(a, d, 0, { type: "sine", f0: 900, f1: 180, glide: 0.07, peak: 0.35, decay: 0.09 }); click(a, d, 0, 0.3, 1800); }],
  // --- paliers 2 à 5 : de plus en plus lourds ---
  hit2: [0.45, 0.12, (a, d) => { impact(a, d, 0, { punch: 0.9, body: 0.1, snap: 2600 }); osc(a, d, 0.005, { type: "triangle", f0: 990, peak: 0.08, decay: 0.08 }); }],
  hit3: [0.6, 0.2, (a, d) => { heavy(a, d, 0, 0.7); hiss(a, d, 0, { f0: 2200, f1: 600, q: 0.8, peak: 0.25, decay: 0.15 }); }],
  crit4: [0.8, 0.25, (a, d) => { heavy(a, d, 0, 0.9); crackle(a, d, 0.02, 4, 0.02); vbass(a, d, 0, 80, 40, 0.15, 0.6, 0.35); }],
  crit5: [1.2, 0.3, (a, d) => { hiss(a, d, 0, { type: "highpass", f0: 5000, peak: 0.9, decay: 0.03, dist: 20 }); crackle(a, d, 0.01, 6, 0.016); vbass(a, d, 0.05, 78, 32, 0.25, 1, 0.7); hiss(a, d, 0.05, { type: "lowpass", f0: 1200, f1: 80, q: 0.5, peak: 0.5, decay: 0.45 }); }, "long"],
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
const LEVEL = { hit2: 0.6, hit3: 0.7, crit4: 0.8, crit5: 0.9, ult_fracture: 0.95, ult_nova: 0.95, ko_cut: 0.95, ko_manga: 0.95, sig_embers: 0.4, sig_ink: 0.45, sig_neon: 0.35, sig_petals: 0.35, sig_gold: 0.35, sig_rainbow: 0.35, sig_bd: 0.45, ult_thunder: 0.95, ult_void: 0.95, ult_ink: 0.95, ult_glitch: 0.9, ult_meteor: 0.95, ult_blades: 0.95, ko_ash: 0.9, ko_stomp: 0.95, ko_fireworks: 0.9, ko_crt: 0.85, ko_freeze: 0.92, ko_sky: 0.92, crit_e: 0.95, crit_f: 0.95, crit_g: 0.95, crit_h: 0.95, hit: 0.55, weakhit: 0.5, black: 0.95, charge: 0.4, ultimate: 0.95, ko: 0.9, slam: 0.7, refuse: 0.7, miss: 0.22, weak: 0.25, combo: 0.35, heal: 0.4, tap: 0.4, touch: 0.3, crush: 0.35, psch: 0.3, coin: 0.35 };
function impulse(a, dur, pow = 5) {
  const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(2, n, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** pow; }
  return b;
}
async function renderAll() {
  const O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!O) return;
  for (const [name, [dur, wet, draw, room = "short"]] of Object.entries(RECIPES)) {
    const a = new O(2, Math.ceil(SR * dur), SR);
    const dry = a.createGain(); dry.gain.value = 1; dry.connect(a.destination);
    if (wet > 0) {
      const cv = a.createConvolver(); cv.buffer = impulse(a, room === "long" ? 1.6 : 0.45, room === "long" ? 2.5 : 5);
      const w = a.createGain(); w.gain.value = wet;
      // salle longue assombrie : de l'espace sans sifflement
      const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = room === "long" ? 2200 : 8000;
      dry.connect(cv).connect(lp).connect(w).connect(a.destination);
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
