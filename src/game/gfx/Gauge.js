/**
 * Jauge de rythme, rendu vectoriel net (lueurs, dégradés, traînées). Trois thèmes au choix dans les réglages :
 * fluid (Néon fluide) · katana (rouge, noir, blanc, formes en biais) · led (Arcade LED, rampe de diodes).
 * La logique de jeu (useClicker) pose this.note = {t0, dur, kind, perfect, good} et appelle judge(kind).
 */
const GOLD = "#ffcd75", CYAN = "#5ff3ff", PINK = "#ff5fd2", RED = "#ff2e4d", WHITE = "#ffffff";
const WORD = { perfect: "PARFAIT", good: "BIEN", miss: "RATÉ", took: "PRISE", refused: "REFUSÉE", streak: "SÉRIE !" };
export const GAUGE_STYLES = [["fluid", "Néon fluide"], ["katana", "Katana"], ["led", "Arcade LED"]];

export class Gauge {
  constructor(canvas, style = "fluid") {
    this.cv = canvas; this.style = style; this.note = null; this.fx = []; this.t = 0; this.streak = 0; this.streakFlash = 0; this.shake = 0;
    window.__gauge = this; // poignée de débogage (tests de bout en bout)
    this.resize();
    this.onResize = () => this.resize();
    addEventListener("resize", this.onResize);
    const loop = () => { this.t++; this.draw(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  destroy() { cancelAnimationFrame(this.raf); removeEventListener("resize", this.onResize); }
  resize() {
    const dpr = Math.min(3, devicePixelRatio || 1);
    this.W = Math.min(440, this.cv.parentElement.clientWidth); this.H = 104;
    this.cv.style.width = `${this.W}px`; this.cv.style.height = `${this.H}px`;
    this.cv.width = this.W * dpr; this.cv.height = this.H * dpr;
    this.c = this.cv.getContext("2d"); this.c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  judge(kind) {
    this.fx.push({ kind, age: 0 });
    if (kind === "perfect") { this.streak++; if (this.streak >= 5) { this.streak = 0; this.streakFlash = 40; this.fx.push({ kind: "streak", age: -8 }); } }
    else if (kind !== "refused") this.streak = 0;
    if (kind === "miss" || kind === "took") this.shake = 6;
  }
  geo() {
    const W = this.W, cx = W / 2, cy = 46, x0 = 22, x1 = W - 22, n = this.note, now = performance.now();
    const k = n ? (now - n.t0) / n.dur : 0, ppm = n ? (cx - x0) / n.dur : 0;
    const dt = n ? now - n.t0 - n.dur : 1e9;
    return { W, cx, cy, x0, x1, n, k, ppm, cig: n?.kind === "cig", inPerf: n && Math.abs(dt) <= n.perfect, inGood: n && Math.abs(dt) <= n.good,
      good: n ? n.good * ppm : 22, perf: n ? n.perfect * ppm : 9, off: n ? (cx - x0) * Math.min(k, 1.2) : 0 };
  }
  draw() {
    const c = this.c;
    c.clearRect(0, 0, this.W, this.H);
    c.save();
    if (this.shake > 0.3) { c.translate((Math.random() * 2 - 1) * this.shake, 0); this.shake *= 0.82; } else this.shake = 0;
    const g = this.geo();
    this[this.style](c, g);
    this.fx.forEach((f) => { if (f.age >= 0) this[`fx_${this.style}`](c, g, f); f.age++; });
    this.fx = this.fx.filter((f) => f.age < 34);
    this.pips(c, g);
    if (this.streakFlash > 0) this.streakFlash--;
    c.restore();
  }
  glow(c, col, blur) { c.shadowColor = col; c.shadowBlur = blur; }
  noGlow(c) { c.shadowBlur = 0; }
  rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  word(c, g, f, col, font, y) {
    const a = f.age, t = Math.min(1, a / 5), fade = a < 18 ? 1 : Math.max(0, (34 - a) / 16);
    c.save(); c.globalAlpha = fade;
    c.font = font; c.textAlign = "center"; c.textBaseline = "middle";
    c.translate(g.cx, y - t * 6); c.scale(1.4 - 0.4 * t, 1.4 - 0.4 * t);
    this.glow(c, col, 14); c.fillStyle = col; c.fillText(WORD[f.kind], 0, 0);
    c.restore();
  }
  pips(c, g) {
    for (let i = 0; i < 5; i++) {
      const on = i < this.streak || (this.streakFlash > 0 && (this.streakFlash >> 2) % 2);
      const x = g.x1 - i * 13, y = g.cy + 40;
      c.save(); c.translate(x, y); c.rotate(Math.PI / 4);
      if (on) this.glow(c, GOLD, 10);
      c.fillStyle = on ? GOLD : "rgba(255,255,255,.12)"; c.fillRect(-3.5, -3.5, 7, 7);
      c.restore();
    }
    this.noGlow(c);
  }
  cigShape(c, x, y, dir, len = 34) {
    c.save(); c.translate(x, y); c.scale(dir, 1);
    this.glow(c, "#ff7a3d", 14); c.fillStyle = "#ffb15a"; c.beginPath(); c.arc(0, 0, 3.5, 0, Math.PI * 2); c.fill();
    this.noGlow(c);
    c.fillStyle = "#8b8794"; c.fillRect(-6, -3.5, 3, 7);
    c.fillStyle = "#f4f4f4"; c.fillRect(-len + 10, -3.5, len - 16, 7);
    c.fillStyle = "#e07a3e"; c.fillRect(-len, -3.5, 10, 7);
    c.restore();
  }

  // ================= A · Néon fluide =================
  fluid(c, g) {
    const { cx, cy, x0, x1, n, k, cig } = g;
    const accent = cig ? RED : PINK;
    // rail
    c.lineCap = "round";
    c.strokeStyle = "rgba(255,255,255,.08)"; c.lineWidth = 6; c.beginPath(); c.moveTo(x0, cy); c.lineTo(x1, cy); c.stroke();
    const grad = c.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, "rgba(95,243,255,.05)"); grad.addColorStop(0.5, cig ? "rgba(255,46,77,.7)" : "rgba(255,95,210,.55)"); grad.addColorStop(1, "rgba(95,243,255,.05)");
    c.strokeStyle = grad; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, cy); c.lineTo(x1, cy); c.stroke();
    // traînées lumineuses derrière les notes
    if (n) for (const [hx, from] of [[x0 + g.off, x0], [x1 - g.off, x1]]) {
      const tg = c.createLinearGradient(from, 0, hx, 0);
      tg.addColorStop(0, "rgba(95,243,255,0)"); tg.addColorStop(1, cig ? "rgba(255,120,60,.8)" : "rgba(95,243,255,.9)");
      c.strokeStyle = tg; c.lineWidth = 4; this.glow(c, cig ? "#ff7a3d" : CYAN, 12);
      c.beginPath(); c.moveTo(from, cy); c.lineTo(hx, cy); c.stroke();
    }
    this.noGlow(c);
    // zones
    if (!cig) {
      this.rr(c, cx - g.good, cy - 15, g.good * 2, 30, 8); c.fillStyle = "rgba(255,255,255,.05)"; c.fill();
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1; c.stroke();
      this.rr(c, cx - g.perf, cy - 15, g.perf * 2, 30, 6); c.fillStyle = g.inPerf ? "rgba(255,205,117,.35)" : "rgba(255,205,117,.12)"; c.fill();
      this.glow(c, GOLD, g.inPerf ? 18 : 6); c.strokeStyle = GOLD; c.lineWidth = 1.5; c.stroke(); this.noGlow(c);
    }
    // cible + cercle d'approche
    this.glow(c, accent, 16);
    c.strokeStyle = cig ? RED : g.inPerf ? GOLD : WHITE; c.lineWidth = 2.5;
    c.beginPath(); c.arc(cx, cy, 12, 0, Math.PI * 2); c.stroke();
    if (cig) { c.beginPath(); c.moveTo(cx - 8, cy + 8); c.lineTo(cx + 8, cy - 8); c.stroke(); }
    else { c.fillStyle = g.inPerf ? GOLD : WHITE; c.beginPath(); c.arc(cx, cy, 3, 0, Math.PI * 2); c.fill(); }
    if (n && !cig && k < 1.08) {
      const r = 12 + 34 * Math.max(0, 1 - k);
      c.globalAlpha = Math.min(1, k * 1.6); c.lineWidth = g.inPerf ? 3.5 : 2;
      c.strokeStyle = g.inPerf ? GOLD : "rgba(255,255,255,.85)";
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
    }
    this.noGlow(c);
    // notes : capsules lumineuses
    if (n) for (const [x, dir, col] of [[x0 + g.off, 1, CYAN], [x1 - g.off, -1, PINK]]) {
      if (cig) { this.cigShape(c, x, cy, dir); continue; }
      this.glow(c, g.inPerf ? GOLD : col, 18);
      const rg = c.createRadialGradient(x, cy, 1, x, cy, 9);
      rg.addColorStop(0, WHITE); rg.addColorStop(0.55, g.inPerf ? GOLD : col); rg.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = rg; this.rr(c, x - 9, cy - 9, 18, 18, 9); c.fill();
      c.fillStyle = WHITE; this.rr(c, x - 1, cy - 13, 2, 26, 1); c.fill();
    }
    this.noGlow(c);
  }
  fx_fluid(c, g, f) {
    const { cx, cy } = g, a = f.age;
    const col = { perfect: GOLD, streak: GOLD, good: WHITE, miss: RED, took: RED, refused: CYAN }[f.kind];
    c.save();
    c.globalAlpha = a < 16 ? 1 : Math.max(0, (34 - a) / 18);
    this.glow(c, col, 18); c.strokeStyle = col; c.fillStyle = col;
    if (f.kind === "perfect" || f.kind === "streak") {
      c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 12 + a * 3.2, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, 12 + a * 1.8, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2 + 0.2, r0 = 14 + a * 2.2, r1 = r0 + 10 - a * 0.25; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0 * 0.7); c.lineTo(cx + Math.cos(t) * r1, cy + Math.sin(t) * r1 * 0.7); c.stroke(); }
    } else if (f.kind === "good" || f.kind === "refused") {
      c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 12 + a * 2.2, 0, Math.PI * 2); c.stroke();
    } else {
      c.lineWidth = 4; c.lineCap = "round"; const s = 10 + Math.min(a, 4);
      c.beginPath(); c.moveTo(cx - s, cy - s); c.lineTo(cx + s, cy + s); c.moveTo(cx + s, cy - s); c.lineTo(cx - s, cy + s); c.stroke();
    }
    c.restore();
    this.word(c, g, f, col, "italic 800 20px 'IBM Plex Sans', system-ui, sans-serif", g.cy - 30);
  }

  // ================= B · Katana =================
  katana(c, g) {
    const { cx, cy, x0, x1, n, cig } = g, sk = -0.28;
    c.save(); c.translate(cx, cy); c.transform(1, 0, sk, 1, 0, 0); c.translate(-cx, -cy);
    // bande noire en biais, doublée d'un liseré rouge décalé
    c.fillStyle = cig ? "#5a0a18" : RED; c.fillRect(x0 - 6, cy - 17, x1 - x0 + 12, 34);
    c.fillStyle = "#0b0b0e"; c.fillRect(x0 - 2, cy - 15, x1 - x0 + 4, 30);
    // trame en bout de bande
    c.fillStyle = "rgba(255,255,255,.12)";
    for (let x = x0; x < x0 + 40; x += 5) for (let y = cy - 12; y < cy + 13; y += 5) c.fillRect(x, y, 1.6 - (x - x0) / 30, 1.6 - (x - x0) / 30);
    for (let x = x1; x > x1 - 40; x -= 5) for (let y = cy - 12; y < cy + 13; y += 5) c.fillRect(x, y, 1.6 - (x1 - x) / 30, 1.6 - (x1 - x) / 30);
    c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(x0, cy - 0.5, x1 - x0, 1);
    // cible : barre rouge (bien) et entaille blanche (parfait)
    if (!cig) {
      c.fillStyle = g.inGood ? "#ff4d66" : "#a3172d"; c.fillRect(cx - g.good, cy - 15, g.good * 2, 30);
      c.fillStyle = g.inPerf ? WHITE : "#f1d6da"; c.fillRect(cx - g.perf, cy - 15, g.perf * 2, 30);
      c.fillStyle = "#0b0b0e"; c.fillRect(cx - 1, cy - 15, 2, 30);
    } else {
      c.fillStyle = "#3a0a12"; c.fillRect(cx - g.good, cy - 15, g.good * 2, 30);
      c.strokeStyle = RED; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 7, cy - 7); c.lineTo(cx + 7, cy + 7); c.moveTo(cx + 7, cy - 7); c.lineTo(cx - 7, cy + 7); c.stroke();
    }
    // notes : losanges blancs à traînée rouge
    if (n) for (const [x, dir] of [[x0 + g.off, 1], [x1 - g.off, -1]]) {
      if (cig) { c.restore(); this.cigShape(c, x + (cy - cy) * sk, cy, dir); c.save(); c.translate(cx, cy); c.transform(1, 0, sk, 1, 0, 0); c.translate(-cx, -cy); continue; }
      c.fillStyle = RED; c.beginPath(); c.moveTo(x - dir * 4, cy - 6); c.lineTo(x - dir * 40, cy - 2); c.lineTo(x - dir * 40, cy + 2); c.lineTo(x - dir * 4, cy + 6); c.fill();
      c.save(); c.translate(x, cy); c.rotate(Math.PI / 4);
      c.fillStyle = "#0b0b0e"; c.fillRect(-9, -9, 18, 18);
      c.fillStyle = g.inPerf ? GOLD : WHITE; c.fillRect(-6.5, -6.5, 13, 13);
      c.restore();
    }
    c.restore();
  }
  fx_katana(c, g, f) {
    const { cx, cy } = g, a = f.age;
    c.save();
    c.globalAlpha = a < 14 ? 1 : Math.max(0, (34 - a) / 20);
    if (f.kind === "perfect" || f.kind === "streak" || f.kind === "good") {
      const big = f.kind !== "good", L = (big ? 70 : 40) * Math.min(1, a / 3);
      c.strokeStyle = big ? RED : WHITE; c.lineWidth = big ? 9 - a * 0.2 : 5 - a * 0.12; c.lineCap = "butt";
      c.beginPath(); c.moveTo(cx - L, cy + L * 0.45); c.lineTo(cx + L, cy - L * 0.45); c.stroke();
      if (big) { c.strokeStyle = WHITE; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - L, cy + L * 0.45); c.lineTo(cx + L, cy - L * 0.45); c.stroke(); }
    } else if (f.kind === "refused") {
      c.strokeStyle = CYAN; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 14 + a * 2, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    // étiquette en biais façon manga
    const fade = f.age < 18 ? 1 : Math.max(0, (34 - f.age) / 16);
    c.save(); c.globalAlpha = fade; c.translate(cx, cy - 34 - Math.min(6, f.age)); c.transform(1, 0, -0.25, 1, 0, 0);
    const txt = WORD[f.kind]; c.font = "italic 900 17px 'IBM Plex Sans', system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    const w = c.measureText(txt).width + 18;
    c.fillStyle = f.kind === "miss" || f.kind === "took" ? "#2a2a30" : f.kind === "refused" ? "#0b5a66" : f.kind === "good" ? "#0b0b0e" : RED;
    c.fillRect(-w / 2, -12, w, 24);
    c.fillStyle = WHITE; c.fillText(txt, 0, 1);
    c.restore();
  }

  // ================= C · Arcade LED =================
  led(c, g) {
    const { cx, cy, x0, x1, n, cig } = g, seg = 7, gap = 2.5, h = 18;
    // cadre métal
    const mg = c.createLinearGradient(0, cy - 26, 0, cy + 26);
    mg.addColorStop(0, "#6b7090"); mg.addColorStop(0.5, "#2b2e44"); mg.addColorStop(1, "#4b4f6a");
    this.rr(c, x0 - 14, cy - 24, x1 - x0 + 28, 48, 10); c.fillStyle = mg; c.fill();
    this.rr(c, x0 - 8, cy - 18, x1 - x0 + 16, 36, 6); c.fillStyle = "#07070d"; c.fill();
    for (const x of [x0 - 8, x1 + 8]) { c.fillStyle = "#9aa0bf"; c.beginPath(); c.arc(x, cy - 20, 1.6, 0, Math.PI * 2); c.arc(x, cy + 20, 1.6, 0, Math.PI * 2); c.fill(); }
    // diodes
    const count = Math.floor((cx - x0 - 10) / (seg + gap));
    const head = n ? Math.min(1, g.k) * (cx - x0) : -1;
    for (const side of [-1, 1]) for (let i = 0; i <= count; i++) {
      const d = 10 + i * (seg + gap), x = cx + side * d - (side < 0 ? seg : 0);
      const fromEdge = cx - x0 - d;
      let col = "#141526", glow = 0;
      const inGoodZone = d <= g.good, inPerfZone = d <= g.perf + 4;
      if (!cig && inPerfZone) col = g.inPerf ? GOLD : "#4a3a14";
      else if (!cig && inGoodZone) col = g.inGood ? "#e8e8f0" : "#2a2a3a";
      if (n && fromEdge <= head && fromEdge > head - 70) {
        const trail = 1 - (head - fromEdge) / 70;
        col = cig ? `rgba(255,${90 + 80 * trail},50,${0.3 + 0.7 * trail})` : `rgba(95,243,255,${0.25 + 0.75 * trail})`;
        glow = trail > 0.85 ? 16 : 0;
      }
      if (glow) this.glow(c, cig ? "#ff7a3d" : CYAN, glow);
      c.fillStyle = col; this.rr(c, x, cy - h / 2, seg, h, 2); c.fill();
      this.noGlow(c);
    }
    // cœur central
    this.glow(c, cig ? RED : g.inPerf ? GOLD : WHITE, g.inPerf || cig ? 18 : 6);
    c.fillStyle = cig ? RED : g.inPerf ? GOLD : "#ffffff"; this.rr(c, cx - 4, cy - 13, 8, 26, 3); c.fill();
    this.noGlow(c);
  }
  fx_led(c, g, f) {
    const { cx, cy, x0 } = g, a = f.age;
    const col = { perfect: GOLD, streak: GOLD, good: WHITE, miss: RED, took: RED, refused: CYAN }[f.kind];
    c.save();
    const reach = Math.min(1, a / 10) * (cx - x0), alpha = a < 12 ? 0.9 : Math.max(0, (34 - a) / 25);
    c.globalAlpha = alpha; this.glow(c, col, 14); c.fillStyle = col;
    if (f.kind === "perfect" || f.kind === "streak" || f.kind === "good" || f.kind === "refused") {
      const w = f.kind === "good" || f.kind === "refused" ? 0.55 : 1;
      for (const side of [-1, 1]) { const x = cx + side * reach * w; this.rr(c, x - 3, cy - 11, 6, 22, 2); c.fill(); }
    } else { this.rr(c, x0 - 8, cy - 18, (cx - x0) * 2 + 16, 36, 6); c.globalAlpha = alpha * 0.35; c.fill(); }
    c.restore();
    this.word(c, g, f, col, "400 13px 'Press Start 2P', monospace", g.cy - 38);
  }
}
