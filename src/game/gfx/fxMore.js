/**
 * Deuxième fournée d'effets à débloquer : auras d'Éveil, compteurs de combo, cendriers de victoire.
 * Auras et compteurs se greffent sur BossStage (moreMethods) ; les cendriers sont lus par AshtrayScene (TRAYS).
 */
import { SPARK, rnd } from "./particles.js";
import { AIR, pline, bolts, hash } from "./pix.js";

const FLOOR = 56;

// ======================= AURAS D'ÉVEIL =======================
/**
 * Une aura habille le boss pendant l'Éveil (palier 9).
 * col : contour du boss · back(b, t) derrière lui · front(b, t) devant · tick(t) fait naître des particules.
 */
export const AURAS = {
  rage: { n: "Rage", d: "Le classique : carrés rouges qui pulsent, contour sang.", col: "#ff1f3d" },
  vortex: {
    n: "Vortex", d: "Un anneau de runes tourne autour de lui.", col: "#38b7a0",
    _ring(b, t, front) {
      const p = this.pos, cx = p.x + p.w / 2, cy = p.y + p.h * 0.62, rx = p.w * 0.75 + 4, ry = 5;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + t * 0.06, s = Math.sin(a);
        if (front !== s > 0) continue;
        b.fillStyle = i % 2 ? "#38b7a0" : "#b55dff";
        const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + s * ry);
        b.fillRect(x, y, 2, 2); if (i % 3 === 0) b.fillRect(x + (i % 2 ? -1 : 2), y - 1, 1, 1);
      }
    },
    back(b, t) { AURAS.vortex._ring.call(this, b, t, false); },
    front(b, t) { AURAS.vortex._ring.call(this, b, t, true); },
    tick(t) { if (t % 4 === 0) { const p = this.pos, a = rnd(0, Math.PI * 2), r = rnd(18, 26), cx = p.x + p.w / 2, cy = p.y + p.h / 2; this.fx.add({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * 0.6 - Math.sin(a) * 0.5, vy: -Math.sin(a) * 0.6 + Math.cos(a) * 0.5, life: 30, c: Math.random() < 0.5 ? "#38b7a0" : "#b55dff" }); } },
  },
  flame: {
    n: "Flamme", d: "Des langues de feu qui épousent sa silhouette.", col: "#ef7d57",
    back(b, t) { tongues.call(this, b, t, ["#b13e53", "#ef7d57", "#ffcd75", "#fff6c8"], 10, 0.5); },
    tick(t) { if (t % 4 === 0) { const e = edgeTop.call(this); if (e) this.front.add({ x: e[0], y: e[1] - 3, vx: rnd(-0.2, 0.2), vy: rnd(-0.9, -0.5), wob: 0.3, life: rnd(16, 28) | 0, c: SPARK, blink: true }); } },
  },
  spark: {
    n: "Électrique", d: "Le contour grésille et des étincelles courent le long.", col: AIR,
    front(b, t) {
      const E = edges.call(this), [ox, oy] = origin.call(this), n = E.length;
      if (!n) return;
      // deux courants qui font le tour de la silhouette
      for (const [sp, len, c] of [[1.8, 12, "#ffffff"], [-1.3, 9, AIR], [0.9, 6, "#ffffff"]]) {
        const s = Math.floor(((t * sp) % n + n) % n);
        b.fillStyle = c;
        for (let i = 0; i < len; i++) { const e = E[(s + i) % n]; b.fillRect(ox + e[0] + e[2], oy + e[1] + e[3], 1, 1); }
      }
      // grésillement : quelques pixels du contour s'allument au hasard
      b.fillStyle = AIR;
      for (let i = 0; i < n; i += 3) if (hash(i * 7.3 + (t >> 1)) > 0.86) { const e = E[i]; b.fillRect(ox + e[0] + e[2], oy + e[1] + e[3], 1, 1); }
      // petit arc qui s'échappe
      if (t % 8 < 3) { const e = E[(hash(t >> 4) * n) | 0]; b.fillStyle = "#ffffff"; let x = ox + e[0], y = oy + e[1]; for (let k = 0; k < 4; k++) { x += e[2] * 1.5 + rnd(-1, 1); y += e[3] * 1.5 + rnd(-1, 1); b.fillRect(Math.round(x), Math.round(y), 1, 1); } }
    },
  },
  frost: {
    n: "Givre", d: "Contour glacé, cristaux qui tournent, brume au sol.", col: "#bfefff",
    _cr(b, t, front) {
      const p = this.pos, cx = p.x + p.w / 2, cy = p.y + p.h * 0.45;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t * 0.03, s = Math.sin(a);
        if (front !== s > 0) continue;
        const x = Math.round(cx + Math.cos(a) * (p.w * 0.7 + 3)), y = Math.round(cy + s * 9 + Math.sin(t * 0.07 + i) * 2);
        b.fillStyle = "#dff6ff"; b.fillRect(x, y - 1, 1, 3); b.fillRect(x - 1, y, 3, 1);
        if ((t + i * 9) % 30 < 4) { b.fillStyle = "#ffffff"; b.fillRect(x, y - 2, 1, 5); b.fillRect(x - 2, y, 5, 1); }
      }
    },
    back(b, t) { AURAS.frost._cr.call(this, b, t, false); },
    front(b, t) { AURAS.frost._cr.call(this, b, t, true); },
    tick(t) { if (t % 3 === 0) { const p = this.pos; this.fx.add({ x: p.x + rnd(-8, p.w + 8), y: FLOOR - rnd(0, 3), vx: rnd(-0.3, 0.3), vy: -0.05, life: rnd(40, 70) | 0, c: "#bfefff", fade: true, alpha: 0.6, size: 2, grow: 0.03 }); } },
  },
  halo: {
    n: "Halo", d: "Un anneau d'or au-dessus de lui, des rayons dans son dos.", col: "#ffcd75",
    _ring(b, t, front) {
      const p = this.pos, cx = p.x + this.kb + p.w / 2, cy = p.y - 4 + Math.round(Math.sin(t * 0.08)), rx = Math.max(6, p.w * 0.3);
      for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, s = Math.sin(a); if (front !== s > 0) continue; b.fillStyle = (i + (t >> 2)) % 7 ? "#ffcd75" : "#ffffff"; b.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + s * 2), 1, 1); }
    },
    back(b, t) {
      const p = this.pos, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      b.globalAlpha = 0.35; b.fillStyle = "#ffcd75";
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + t * 0.008; pline(b, cx + Math.cos(a) * (p.w * 0.45), cy + Math.sin(a) * (p.h * 0.45), cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, 1); }
      b.globalAlpha = 1;
      AURAS.halo._ring.call(this, b, t, false);
    },
    front(b, t) { AURAS.halo._ring.call(this, b, t, true); },
  },
  shadow: {
    n: "Ombre", d: "Des volutes noires et violettes s'échappent de lui.", col: "#7a3fa8",
    back(b, t) { tongues.call(this, b, t, ["#0a0612", "#2e1840", "#5d275d", "#8a4fb8"], 12, 0.25); },
    tick(t) { if (t % 7 === 0) { const e = edgeTop.call(this); if (e) this.front.add({ x: e[0], y: e[1] - 2, vy: -0.4, wob: 0.2, life: 24, c: "#ff1f3d", blink: true }); } },
  },
};

/** Contour du boss : pixels du bord avec leur normale vers l'extérieur, en cache sur le sprite. */
function edges() {
  const sp = this.sprite();
  if (sp._edges) return sp._edges;
  const on = new Set(sp.pixels.map((q) => q.x + "," + q.y)), out = [];
  for (const q of sp.pixels) for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) if (!on.has(q.x + dx + "," + (q.y + dy))) { out.push([q.x, q.y, dx, dy]); break; }
  // ordre approximatif autour du centre, pour que les courants fassent le tour
  const cx = sp.w / 2, cy = sp.h / 2;
  out.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  return (sp._edges = out);
}
/** Coin haut gauche du sprite tel qu'il est dessiné (recul et respiration compris). */
function origin() { const p = this.pos, bob = [0, 0, -1, -1][(this.t >> 4) % 4]; return [Math.round(p.x + this.kb), p.y + bob]; }
function edgeTop() { const E = edges.call(this).filter((e) => e[3] < 0), [ox, oy] = origin.call(this); if (!E.length) return null; const e = E[(Math.random() * E.length) | 0]; return [ox + e[0], oy + e[1]]; }
/** Langues (feu, fumée) qui montent du haut et des flancs de la silhouette. cols : de l'extérieur vers le cœur. */
function tongues(b, t, cols, maxL, speed) {
  const E = edges.call(this), [ox, oy] = origin.call(this);
  E.forEach((e, i) => {
    if (e[3] > 0) return; // pas sous les pieds
    const side = e[3] === 0, n = hash(e[0] * 3.1 + Math.floor(t * speed + e[0] * 0.37));
    const L = side ? 2 + Math.round(n * maxL * 0.35) : 3 + Math.round(n * maxL * (0.6 + 0.4 * Math.sin(t * 0.15 + e[0] * 0.5)));
    const x = ox + e[0], y = oy + e[1];
    cols.forEach((c, k) => {
      const l = Math.max(0, L - k * Math.ceil(L / cols.length));
      if (!l) return;
      b.fillStyle = c;
      if (side) { b.fillRect(e[2] > 0 ? x + 1 : x - l, y - (k ? 0 : 1), l, 1); b.fillRect(e[2] > 0 ? x + 1 : x - l + 1, y - 1 - (k ? 0 : 1), l - 1, 1); }
      else b.fillRect(x, y - l, 1, l);
    });
  });
}

// ======================= COMPTEURS DE COMBO =======================
export const COUNTERS = {
  classic: { n: "Classique", d: "Blanc et net, cerné de noir. Il chauffe avec le combo." },
  arcade: { n: "Borne d'arcade", d: "Chiffres pixel et ombre dure, comme sur une borne." },
  neon: { n: "Néon", d: "Un tube qui s'allume : cyan, puis rose quand ça monte." },
  manga: { n: "Manga", d: "En biais, contour épais, étiquette « HITS ! » rouge." },
  lcd: { n: "LCD", d: "Sept segments verts sur leur petit écran." },
  flames: { n: "En feu", d: "Le chiffre se remplit de feu, des braises s'en échappent." },
};
const SEG = ["1111110", "0110000", "1101101", "1111001", "0110011", "1011011", "1011111", "1110000", "1111111", "1111011"];
const tierCol = (n, trance) => (trance ? "#ff1f3d" : n >= 30 ? "#ff6b3d" : n >= 20 ? "#ef7d57" : n >= 10 ? "#ffcd75" : "#ffffff");
/** Hauteur des capitales par police, pour que tous les compteurs aient exactement la même taille. */
const CAP = { chakra: 0.7, pixel: 0.875 };

// ======================= CENDRIERS =======================
/**
 * Cendriers de la victoire. pal : couleurs du cendrier (a : bord, b : pied, i : intérieur, h : fond).
 * ash : couleurs des cendres au fond · back/front(b, t, s) : décor avant et après la clope (s = scène).
 */
export const TRAYS = {
  classic: { n: "Bleu", d: "Le cendrier de toujours.", pal: { a: { r: ["#1f3b7a", "#3b5dc9", "#73a6f6"], cyl: true }, b: { r: ["#151d3b", "#29366f", "#3b5dc9"] }, i: "#1b2550", h: "#25336a" } },
  glass: {
    n: "Verre", d: "Transparent, avec des reflets qui glissent.", alpha: 0.62,
    count(s) { s.front.burst(14, () => ({ x: 24 + rnd(-16, 16), y: 22 + rnd(-4, 4), vy: rnd(-0.4, -0.1), life: rnd(16, 30) | 0, c: "#ffffff", blink: true })); },
    pal: { a: { r: ["#4f8fa8", "#9fd6e8", "#e8fbff"], cyl: true }, b: { r: ["#2f5f78", "#5f8fa8", "#9fd6e8"] }, i: "#3f7088", h: "#5a8fa6" },
    front(b, t) {
      b.fillStyle = "#ffffff"; const x = 4 + ((t * 0.5) % 60);
      if (x < 44) { b.globalAlpha = 0.85; pline(b, x, 23, x + 4, 19, 1); pline(b, x + 3, 24, x + 6, 21, 1); b.globalAlpha = 1; }
      b.fillRect(9, 20, 4, 1); b.fillRect(36, 28, 3, 1); b.globalAlpha = 0.5; b.fillRect(10, 27, 6, 1); b.globalAlpha = 1;
    },
  },
  obsidian: {
    n: "Obsidienne", d: "Pierre noire, fissures de lave qui respirent.",
    pal: { a: { r: ["#120e18", "#2a2236", "#4a3e58"], cyl: true }, b: { r: ["#0a080e", "#1a1520", "#2a2236"] }, i: "#0e0a14", h: "#1a1422" },
    ash: ["#3a2a2a", "#5a3a2a"],
    count(s) { s.front.burst(18, () => ({ x: 24 + rnd(-14, 14), y: 24 + rnd(-3, 3), vx: rnd(-0.4, 0.4), vy: rnd(-1.4, -0.5), g: 0.03, life: rnd(26, 46) | 0, c: SPARK, blink: true })); },
    front(b, t) {
      const k = 0.5 + 0.5 * Math.sin(t * 0.08);
      b.fillStyle = k > 0.6 ? "#ffcd75" : "#ef7d57";
      for (const [x0, y0, x1, y1] of [[6, 22, 9, 25], [9, 25, 12, 26], [36, 21, 39, 24], [39, 24, 41, 24], [20, 29, 23, 28], [28, 28, 31, 29]]) pline(b, x0, y0, x1, y1, 1);
    },
  },
  trophy: {
    n: "Trophée", d: "En or massif. Des éclats brillent sur le bord.",
    count(s) { s.front.burst(30, (i) => { const a = rnd(-Math.PI * 0.9, -Math.PI * 0.1), v = rnd(0.8, 2); return { x: 24, y: 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.06, drag: 0.97, life: rnd(40, 70) | 0, c: ["#ffcd75", "#fff6c8", "#d8a31a", "#ffffff"][i % 4], blink: true }; }); },
    pal: { a: { r: ["#8a5a10", "#d8a31a", "#ffe08a"], cyl: true }, b: { r: ["#5a3a08", "#8a5a10", "#d8a31a"] }, i: "#6a4410", h: "#7a5214" },
    front(b, t) {
      for (const [x, y, ph] of [[8, 21, 0], [37, 20, 40], [24, 18, 80]]) {
        const k = (t + ph) % 120; if (k > 14) continue;
        const L = [1, 2, 3, 3, 2, 1][k >> 1] ?? 1;
        b.fillStyle = "#fff6c8"; pline(b, x - L, y, x + L, y, 1); pline(b, x, y - L, x, y + L, 1);
      }
    },
  },
  pot: {
    n: "Pot de fleur", d: "La clope finit en terreau… et une pousse sort de terre.",
    pal: { a: { r: ["#8a3a1f", "#c2602f", "#e8955a"], cyl: true }, b: { r: ["#5a2414", "#8a3a1f", "#c2602f"] }, i: "#3a2418", h: "#4a2e1e" },
    ash: ["#5a3a24", "#3a2418"],
    count(s) { s.front.burst(10, (i) => ({ x: 30 + rnd(-2, 2), y: 18, vx: rnd(-0.8, 0.8), vy: rnd(-0.9, -0.3), g: 0.02, wob: 0.3, life: rnd(40, 60) | 0, c: i % 2 ? "#a7f070" : "#38b764", fade: true })); },
    // la pousse : tige, deux feuilles, puis la fleur, après l'extinction
    front(b, t, s) {
      const g = t - s.T_END - 30; if (g < 0) return;
      const x = s.CONTACT.x + 6, y0 = s.FLOOR - 1, h = Math.min(13, g * 0.2), sway = Math.round(Math.sin(t * 0.05));
      b.fillStyle = "#38b764"; pline(b, x, y0, x + sway, y0 - h, 1); pline(b, x + 1, y0, x + 1 + sway, y0 - h + 2, 1);
      if (h > 5) { b.fillStyle = "#a7f070"; b.fillRect(x - 3, y0 - 5, 3, 2); b.fillRect(x - 4, y0 - 6, 2, 1); b.fillRect(x + 2, y0 - 8, 3, 2); b.fillRect(x + 4, y0 - 9, 2, 1); }
      if (h >= 13) {
        const o = Math.min(3, (g - 65) / 12), fx = x + sway, fy = y0 - 15;
        if (o > 0) { b.fillStyle = "#ff6fb5"; b.fillRect(fx - 1, fy - 1, 3, 3); }
        if (o >= 2) { b.fillStyle = "#ff9ecf"; b.fillRect(fx - 3, fy, 2, 2); b.fillRect(fx + 2, fy, 2, 2); b.fillRect(fx, fy - 3, 2, 2); b.fillRect(fx - 1, fy + 2, 2, 2); }
        if (o >= 3) { b.fillStyle = "#ffcd75"; b.fillRect(fx, fy, 1, 1); }
      }
    },
  },
  neon: {
    n: "Néon", d: "Juste un contour qui pulse, rose et cyan.", alpha: 0,
    count(s) { s.front.burst(24, (i) => { const a = (i / 24) * Math.PI * 2; return { x: 24 + Math.cos(a) * 19, y: 24 + Math.sin(a) * 6, vx: Math.cos(a) * 0.8, vy: Math.sin(a) * 0.5 - 0.3, drag: 0.94, life: 26, c: i % 2 ? "#ff5fd2" : "#5ff3ff" }; }); },
    pal: { a: { r: ["#1a1c2c", "#1a1c2c", "#1a1c2c"] }, b: { r: ["#1a1c2c", "#1a1c2c", "#1a1c2c"] }, i: "#100f1c", h: "#141325" },
    back(b) { b.fillStyle = "#100f1c"; for (let y = -6; y <= 6; y++) { const dx = Math.sqrt(Math.max(0, 1 - (y / 6.4) ** 2)) * 19.6; b.fillRect(Math.round(24 - dx), 24 + y, Math.round(dx * 2), 1); } },
    front(b, t) {
      const on = (t >> 3) % 7 !== 0;
      const ring = (rx, ry, cy, col) => { b.fillStyle = col; const n = 90; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; b.fillRect(Math.round(24 + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1); } };
      ring(19.6, 6.4, 24, on ? "#ff5fd2" : "#7a2a66");
      ring(15.6, 3.7, 23, on ? "#5ff3ff" : "#2a6a77");
    },
  },
};

export const moreMethods = {
  /**
   * Compteur de combo, net, dans le coin haut droit de la scène. Tous les styles partagent la même boîte :
   * chiffres de hauteur H alignés à droite sur le même point, étiquette dessous, même rebond, même chute à la casse.
   */
  drawCounter(c) {
    const st = this.counter;
    if (!st) return;
    const n = this.combo;
    if (n !== this._cc) { if (n > (this._cc || 0)) this._pop = 7; else if ((this._cc || 0) >= 2) this._brk = { n: this._cc, age: 0 }; this._cc = n; }
    const brk = this._brk && this._brk.age < 18 ? this._brk : null;
    if (brk) brk.age++;
    if (n < 2 && !brk) return;
    const r = this.cv.getBoundingClientRect(), dpr = this.ov.width / (parseFloat(this.ov.style.width) || this.ov.width);
    const H = Math.round(Math.max(24, r.width * 0.1) * dpr), X = (r.right - r.width * 0.035) * dpr, Y = (r.top + r.height * 0.25) * dpr + H;
    const pop = this._pop > 0 ? 1 + this._pop * 0.03 : 1;
    if (this._pop > 0) this._pop--;
    const val = String(brk ? brk.n : n), hot = tierCol(n, this.trance), dead = "#566c86";
    const chakra = (h) => `700 ${Math.round(h / CAP.chakra)}px "Chakra Petch", system-ui, sans-serif`;
    c.save();
    if (brk) { c.globalAlpha = Math.max(0, 1 - brk.age / 18); c.translate(rnd(-2, 2) * dpr, brk.age * 1.2 * dpr); }
    c.translate(X, Y); c.scale(pop, pop);
    c.textAlign = "right"; c.textBaseline = "alphabetic"; c.lineJoin = "round";
    const lab = (txt, col, plate) => {
      c.font = chakra(H * 0.26);
      if (plate) { const w = c.measureText(txt).width + H * 0.24; c.fillStyle = plate; c.fillRect(-w, H * 0.14, w, H * 0.38); }
      c.fillStyle = col; c.fillText(txt, plate ? -H * 0.12 : 0, H * 0.44);
    };
    if (st === "classic") {
      c.font = chakra(H); c.lineWidth = H * 0.16; c.strokeStyle = "#0a0006"; c.strokeText(val, 0, 0);
      c.fillStyle = brk ? dead : hot; c.fillText(val, 0, 0);
      lab("COMBO", brk ? dead : "#c2c3c7");
    } else if (st === "arcade") {
      c.font = `${Math.round(H / CAP.pixel)}px "Press Start 2P", monospace`;
      const o = Math.max(2, Math.round(H * 0.09));
      c.fillStyle = "#0a0006"; c.fillText(val, o, o);
      c.fillStyle = brk ? dead : hot; c.fillText(val, 0, 0);
      c.font = `${Math.round(H * 0.26 / CAP.pixel)}px "Press Start 2P", monospace`; c.fillStyle = brk ? dead : "#94b0c2"; c.fillText("COMBO", 0, H * 0.48);
    } else if (st === "neon") {
      const nc = brk ? dead : n >= 20 || this.trance ? "#ff5fd2" : "#5ff3ff";
      c.font = chakra(H);
      c.shadowColor = nc; c.shadowBlur = brk ? 0 : H * 0.45;
      c.lineWidth = H * 0.1; c.strokeStyle = nc; c.strokeText(val, 0, 0);
      c.shadowBlur = 0; c.fillStyle = brk ? "#3a4256" : "#ffffff"; c.fillText(val, 0, 0);
      c.shadowColor = nc; c.shadowBlur = brk ? 0 : H * 0.3; lab("HITS", nc);
    } else if (st === "manga") {
      c.transform(1, 0, -0.22, 1, 0, 0);
      c.font = chakra(H); c.lineWidth = H * 0.24; c.strokeStyle = "#0a0006"; c.strokeText(val, 0, 0);
      c.fillStyle = brk ? dead : "#ffffff"; c.fillText(val, 0, 0);
      lab("HITS !", "#ffffff", brk ? dead : "#e43b44");
    } else if (st === "lcd") {
      const dw = H * 0.52, th = Math.max(2, H * 0.12), gap = H * 0.14, W = val.length * (dw + gap) - gap, pad = H * 0.16;
      c.fillStyle = "#0b1a0e"; c.fillRect(-W - pad, -H - pad, W + pad * 2, H + pad * 2);
      c.strokeStyle = "#2a4a2e"; c.lineWidth = Math.max(1, H * 0.05); c.strokeRect(-W - pad, -H - pad, W + pad * 2, H + pad * 2);
      [...val].forEach((ch, i) => {
        const x0 = -W + i * (dw + gap), y0 = -H, on = SEG[+ch], hh = H / 2;
        const sg = [[x0 + th, y0, dw - 2 * th, th], [x0 + dw - th, y0 + th * 0.8, th, hh - th * 1.3], [x0 + dw - th, y0 + hh + th * 0.5, th, hh - th * 1.3], [x0 + th, y0 + H - th, dw - 2 * th, th], [x0, y0 + hh + th * 0.5, th, hh - th * 1.3], [x0, y0 + th * 0.8, th, hh - th * 1.3], [x0 + th, y0 + hh - th / 2, dw - 2 * th, th]];
        sg.forEach((q, k) => { c.fillStyle = on[k] === "1" ? (brk ? "#3a6a40" : "#7dff8a") : "#132816"; c.fillRect(...q); });
      });
      c.translate(pad, pad); lab("COMBO", brk ? "#3a6a40" : "#7dff8a");
    } else if (st === "flames") {
      c.font = chakra(H);
      const w = c.measureText(val).width, k = Math.min(1, n / 30);
      // remplissage de feu : le niveau monte avec le combo
      const g = c.createLinearGradient(0, 0, 0, -H);
      g.addColorStop(0, "#b13e53"); g.addColorStop(Math.max(0.05, 0.25 + 0.4 * k), "#ef7d57"); g.addColorStop(Math.min(1, 0.55 + 0.45 * k), "#ffcd75"); g.addColorStop(1, "#fff6c8");
      c.lineWidth = H * 0.16; c.strokeStyle = "#2a0a0a"; c.strokeText(val, 0, 0);
      c.fillStyle = brk ? dead : g; c.fillText(val, 0, 0);
      if (!brk) for (let i = 0; i < 3 + Math.round(4 * k); i++) {
        const ph = (this.t * 0.04 + i * 0.37) % 1, x = -w * hash(i * 3.7 + Math.floor(this.t * 0.04 + i * 0.37)), y = -H - ph * H * 0.7;
        c.globalAlpha = 1 - ph; c.fillStyle = ph < 0.4 ? "#ffcd75" : "#ef7d57"; c.fillRect(x, y, H * 0.07, H * 0.07);
      }
      c.globalAlpha = 1; lab("COMBO", brk ? dead : "#ffcd75");
    }
    c.restore();
  },
  hudOn() { return !!this.counter && (this.combo >= 2 || (this._brk && this._brk.age < 18)); },
};
