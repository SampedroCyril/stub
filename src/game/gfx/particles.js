/** Système de particules pixel : débris, étincelles, fumée. */
export const SPARK = (t) => (t < 0.25 ? "#fff6c8" : t < 0.5 ? "#ffcd75" : t < 0.75 ? "#ef7d57" : "#b13e53");
export const rnd = (a, b) => a + Math.random() * (b - a);

export class Particles {
  constructor() { this.list = []; }
  add(p) { this.list.push({ vx: 0, vy: 0, g: 0, drag: 1, life: 60, age: 0, size: 1, floor: null, bounce: 0.35, fade: false, seed: Math.random() * 100, ...p }); }
  burst(n, f) { for (let i = 0; i < n; i++) this.add(f(i, n)); }
  update() {
    for (const p of this.list) {
      p.age++;
      p.vy += p.g;
      p.vx *= p.drag; p.vy *= p.drag;
      if (p.wob) p.x += Math.sin((p.age + p.seed) * p.wob) * 0.12;
      p.x += p.vx; p.y += p.vy;
      if (p.floor != null && p.y > p.floor) {
        p.y = p.floor; p.vy *= -p.bounce; p.vx *= 0.6;
        if (Math.abs(p.vy) < 0.35) p.vy = 0;
      }
      if (p.grow) p.size += p.grow;
    }
    this.list = this.list.filter((p) => p.age < p.life);
  }
  draw(ctx) {
    for (const p of this.list) {
      const t = p.age / p.life;
      if (p.blink && t > 0.7 && (p.age >> 2) % 2) continue;
      let a = p.fade ? (p.fadeIn && t < 0.15 ? t / 0.15 : 1 - t) * (p.alpha ?? 1) : p.alpha ?? 1;
      a = Math.round(a * 4) / 4;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = typeof p.c === "function" ? p.c(t) : p.c;
      const s = Math.max(1, Math.round(p.size));
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
  }
}
