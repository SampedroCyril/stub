/**
 * Comptage de répétitions et contrôle de forme à partir des 33 points de MediaPipe Pose.
 * Module pur (pas de DOM) : testé dans tests/counters.test.js avec des trajectoires synthétiques.
 *
 * Entrée de update() : landmarks normalisés [{x, y, visibility}] (y vers le bas), t en ms,
 * aspect = largeur / hauteur de l'image (pour calculer de vrais angles).
 */

/** Liaisons du squelette dessiné par-dessus la vidéo. */
export const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [28, 30], [27, 31], [28, 32], [29, 31], [30, 32],
];

export const LM = { nose: 0, sh: [11, 12], el: [13, 14], wr: [15, 16], hip: [23, 24], kn: [25, 26], an: [27, 28] };
const SIDE_KEYS = ["sh", "el", "wr", "hip", "kn", "an"];

/* ---------------- géométrie ---------------- */
export function angle(a, b, c) {
  const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
  const n = Math.hypot(...v1) * Math.hypot(...v2);
  if (!n) return 180;
  const cos = Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}
/** Angle de la droite a→b par rapport à l'horizontale, entre 0 et 90°. */
export function fromHorizontal(a, b) {
  const deg = Math.abs((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI);
  return deg > 90 ? 180 - deg : deg;
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/** > 0 si le bassin est au-dessus de la droite épaule → cheville (y vers le bas). */
function hipOffset(sh, hip, an) {
  const t = (hip[0] - sh[0]) / ((an[0] - sh[0]) || 1e-6);
  const yLine = sh[1] + t * (an[1] - sh[1]);
  return yLine - hip[1];
}

/** Lecture des points utiles, côté le plus visible. */
function read(lms, aspect) {
  const P = (i) => [lms[i].x * aspect, lms[i].y];
  const V = (i) => lms[i].visibility ?? 1;
  const vis = [0, 1].map((s) => SIDE_KEYS.reduce((a, k) => a + V(LM[k][s]), 0));
  const s = vis[0] >= vis[1] ? 0 : 1, o = 1 - s;
  const pick = (side) => Object.fromEntries(SIDE_KEYS.map((k) => [k, P(LM[k][side])]));
  const visOf = (side) => Object.fromEntries(SIDE_KEYS.map((k) => [k, V(LM[k][side])]));
  return { near: pick(s), far: pick(o), vNear: visOf(s), vFar: visOf(o), nose: P(LM.nose), vNose: V(LM.nose) };
}

/* ---------------- lissage et cycles ---------------- */
function ema(alpha = 0.45) {
  let v = null;
  return (x) => (v = v == null ? x : v + alpha * (x - v));
}

/**
 * Cycle repos → actif → repos = 1 rep.
 * Le compteur s'arme d'abord en position de repos, pour ne pas compter une demi-rep au démarrage.
 */
class Cycle {
  constructor({ enter, exit, partial, minMs = 350 }) {
    Object.assign(this, { enter, exit, partial, minMs });
    this.armed = false; this.state = "rest"; this.lastRep = -1e9; this.tEnter = 0; this.sawPartial = false;
  }
  update(m, t) {
    if (!this.armed) { if (this.exit(m)) this.armed = true; return null; }
    if (this.state === "rest") {
      if (this.enter(m)) { this.state = "active"; this.tEnter = t; this.sawPartial = false; return "enter"; }
      if (this.partial && this.partial(m)) this.sawPartial = true;
      else if (this.sawPartial && this.exit(m)) { this.sawPartial = false; return "partial"; }
      return null;
    }
    if (this.exit(m)) {
      this.state = "rest";
      if (t - this.lastRep >= this.minMs) { this.lastRep = t; return "rep"; }
    }
    return null;
  }
}

/* ---------------- moteur commun ---------------- */
function makeEngine(spec) {
  let count = 0, holdMs = 0, lastT = null, lastRepT = -1e9, fb = null, fbUntil = 0, good = null;
  const say = (msg, t, ms = 1600) => { fb = msg; fbUntil = t + ms; };
  const ctx = { say, rep: (t, ok = true) => { count++; lastRepT = t; good = ok; } };
  return {
    update(lms, t, aspect = 1) {
      const dt = lastT == null ? 0 : Math.min(t - lastT, 250);
      lastT = t;
      if (!lms || lms.length < 29) {
        say("Je ne te vois pas. Mets-toi dans le cadre.", t, 400);
        return this.snapshot(t, false, false);
      }
      const r = read(lms, aspect);
      const need = spec.need || ["sh", "hip", "kn"];
      const ready = need.every((k) => r.vNear[k] > 0.5);
      if (!ready) {
        say("Recule ou incline le téléphone : il faut voir tout ton corps.", t, 400);
        return this.snapshot(t, false, false);
      }
      const res = spec.step(r, t, ctx) || {};
      if (res.hold) holdMs += dt;
      if (spec.activeWindow && t - lastRepT < spec.activeWindow) holdMs += dt;
      return this.snapshot(t, true, !!res.hold || (spec.activeWindow ? t - lastRepT < spec.activeWindow : false));
    },
    snapshot(t, ready, active) {
      return { ready, active, count, holdMs, feedback: t < fbUntil ? fb : null, lastGood: good };
    },
  };
}

/* ---------------- spécifications par exercice ---------------- */
const upright = (r) => fromHorizontal(r.near.sh, r.near.hip) > 55;
const horizontal = (r, max = 40) => fromHorizontal(r.near.sh, r.near.hip) < max;

function squat({ slow = false } = {}) {
  const k = ema();
  let tDescend = null;
  const cyc = new Cycle({ enter: (m) => m < 100, exit: (m) => m > 155, partial: (m) => m < 135 });
  return {
    need: ["sh", "hip", "kn", "an"],
    step(r, t, c) {
      const m = k(angle(r.near.hip, r.near.kn, r.near.an));
      if (m > 165) tDescend = null; else if (tDescend == null) tDescend = t;
      const ev = cyc.update(m, t);
      if (ev === "enter" && fromHorizontal(r.near.sh, r.near.hip) < 35) c.say("Garde le buste plus droit", t);
      if (ev === "partial") c.say("Descends plus bas : cuisses parallèles au sol", t);
      if (ev === "rep") {
        const descent = cyc.tEnter - (this._tStart ?? cyc.tEnter);
        if (slow && descent < 1600) { c.say("Trop rapide : 3 s pour descendre. Pas comptée.", t, 2200); return; }
        c.rep(t);
      }
      if (ev === "enter") this._tStart = tDescend ?? t;
    },
  };
}

function lunge() {
  const k = ema();
  const cyc = new Cycle({ enter: (m) => m < 110, exit: (m) => m > 150, partial: (m) => m < 135 });
  return {
    need: ["sh", "hip", "kn", "an"],
    step(r, t, c) {
      const kn = Math.min(angle(r.near.hip, r.near.kn, r.near.an), r.vFar.kn > 0.3 ? angle(r.far.hip, r.far.kn, r.far.an) : 180);
      const ev = cyc.update(k(kn), t);
      if (ev === "partial") c.say("Descends plus : le genou arrière frôle le sol", t);
      if (ev === "rep") c.rep(t);
    },
  };
}

function pushup({ pike = false } = {}) {
  const k = ema();
  const cyc = new Cycle({ enter: (m) => m < (pike ? 100 : 95), exit: (m) => m > 150, partial: (m) => m < 125 });
  return {
    need: ["sh", "el", "wr", "hip"],
    step(r, t, c) {
      if (!pike && !horizontal(r, 45)) return;
      if (pike) {
        if (angle(r.near.sh, r.near.hip, r.near.kn) > 125) { c.say("Monte le bassin : corps en V", t); return; }
      } else if (r.vNear.an > 0.5) {
        const line = angle(r.near.sh, r.near.hip, r.near.an);
        if (line < 155) c.say(hipOffset(r.near.sh, r.near.hip, r.near.an) > 0 ? "Bassin trop haut, aligne-toi" : "Bassin trop bas : gaine-toi", t);
      }
      const ev = cyc.update(k(angle(r.near.sh, r.near.el, r.near.wr)), t);
      if (ev === "partial") c.say("Descends plus : poitrine près du sol", t);
      if (ev === "rep") c.rep(t);
    },
  };
}

function dips() {
  const k = ema();
  const cyc = new Cycle({ enter: (m) => m < 100, exit: (m) => m > 150, partial: (m) => m < 130 });
  return {
    need: ["sh", "el", "wr", "hip"],
    step(r, t, c) {
      if (r.near.hip[1] < r.near.sh[1]) return;
      const ev = cyc.update(k(angle(r.near.sh, r.near.el, r.near.wr)), t);
      if (ev === "partial") c.say("Plie plus les coudes : jusqu'à 90°", t);
      if (ev === "rep") c.rep(t);
    },
  };
}

function bridge() {
  const k = ema();
  const cyc = new Cycle({ enter: (m) => m > 160, exit: (m) => m < 145, partial: (m) => m > 152 });
  return {
    need: ["sh", "hip", "kn"],
    step(r, t, c) {
      if (fromHorizontal(r.near.sh, r.near.hip) > 50) return;
      const ev = cyc.update(k(angle(r.near.sh, r.near.hip, r.near.kn)), t);
      if (ev === "partial") c.say("Monte plus haut : genoux, hanches, épaules alignés", t);
      if (ev === "rep") c.rep(t);
    },
  };
}

function legRaise() {
  const k = ema();
  const cyc = new Cycle({ enter: (m) => m < 115, exit: (m) => m > 150, partial: (m) => m < 135 });
  return {
    need: ["sh", "hip", "kn", "an"],
    step(r, t, c) {
      const ev = cyc.update(k(angle(r.near.sh, r.near.hip, r.near.an)), t);
      if (ev === "partial") c.say("Monte les jambes jusqu'à la verticale", t);
      if (ev === "rep") c.rep(t);
    },
  };
}

function plank({ maxTilt = 30 } = {}) {
  const k = ema(0.3);
  return {
    need: ["sh", "hip", "an"],
    step(r, t, c) {
      if (fromHorizontal(r.near.sh, r.near.an) > maxTilt) { c.say("Mets-toi en position de gainage", t, 600); return; }
      const line = k(angle(r.near.sh, r.near.hip, r.near.an));
      if (line < 160) { c.say(hipOffset(r.near.sh, r.near.hip, r.near.an) > 0 ? "Bassin trop haut" : "Bassin trop bas : serre les abdos", t, 600); return; }
      return { hold: true };
    },
  };
}

function wallSit() {
  const kk = ema(0.3), kh = ema(0.3);
  return {
    need: ["sh", "hip", "kn", "an"],
    step(r, t, c) {
      const knee = kk(angle(r.near.hip, r.near.kn, r.near.an)), hip = kh(angle(r.near.sh, r.near.hip, r.near.kn));
      if (knee > 115) { c.say("Descends jusqu'à avoir les genoux à 90°", t, 600); return; }
      if (knee < 65) { c.say("Remonte un peu, genoux à 90°", t, 600); return; }
      if (hip < 65 || hip > 130) { c.say("Dos plaqué au mur", t, 600); return; }
      return { hold: true };
    },
  };
}

function jacks() {
  const cyc = new Cycle({
    enter: (m) => m.handsUp && m.spread > 0.6,
    exit: (m) => m.handsDown && m.spread < 0.35,
    minMs: 300,
  });
  return {
    need: ["sh", "hip", "an"],
    activeWindow: 1600,
    step(r, t, c) {
      const shM = mid(r.near.sh, r.far.sh), hipM = mid(r.near.hip, r.far.hip);
      const torso = dist(shM, hipM) || 1e-6;
      const spread = dist(r.near.an, r.far.an) / torso;
      const handsUp = r.near.wr[1] < r.nose[1] && r.far.wr[1] < r.nose[1];
      const handsDown = r.near.wr[1] > shM[1] && r.far.wr[1] > shM[1];
      if (cyc.update({ spread, handsUp, handsDown }, t) === "rep") c.rep(t);
    },
  };
}

/** Une jambe après l'autre : chaque jambe a son propre cycle. */
function alternating({ metric, enter, exit, guard, minMs = 180 }) {
  const ks = [ema(0.5), ema(0.5)];
  const cycles = [0, 1].map(() => new Cycle({ enter, exit, minMs }));
  return {
    need: ["sh", "hip", "kn"],
    activeWindow: 1600,
    step(r, t, c) {
      if (guard && !guard(r)) { c.say(guard.msg, t, 600); return; }
      [["near", "vNear"], ["far", "vFar"]].forEach(([side, v], i) => {
        if (r[v].kn < 0.3) return;
        if (cycles[i].update(ks[i](metric(r, side)), t) === "rep") c.rep(t);
      });
    },
  };
}

function burpee() {
  let sawFloor = false, lastRep = -1e9;
  return {
    need: ["sh", "hip", "kn"],
    step(r, t, c) {
      if (horizontal(r, 35)) sawFloor = true;
      const standing = upright(r) && angle(r.near.hip, r.near.kn, r.near.an) > 150;
      const armsUp = r.near.wr[1] < r.nose[1];
      if (standing && armsUp && sawFloor && t - lastRep > 700) { sawFloor = false; lastRep = t; c.rep(t); }
      if (standing && !armsUp && sawFloor && t - lastRep > 2500) c.say("Finis par un saut bras en l'air", t, 900);
    },
  };
}

const uprightGuard = Object.assign((r) => upright(r), { msg: "Reste bien droit, de profil" });
const plankGuard = Object.assign((r) => horizontal(r, 45), { msg: "Mets-toi en position de pompe" });

const SPECS = {
  squats: () => squat(),
  squats_lents: () => squat({ slow: true }),
  squats_sautes: () => squat(),
  fentes: lunge,
  fentes_sautees: lunge,
  pompes: () => pushup(),
  pompes_serrees: () => pushup(),
  pompes_declinees: () => pushup(),
  pompes_piquees: () => pushup({ pike: true }),
  dips,
  pont: bridge,
  releves: legRaise,
  gainage: () => plank(),
  gainage_lateral: () => plank({ maxTilt: 38 }),
  chaise: wallSit,
  jacks,
  genoux: () => alternating({ metric: (r, s) => angle(r[s].sh, r[s].hip, r[s].kn), enter: (m) => m < 115, exit: (m) => m > 150, guard: uprightGuard }),
  talons: () => alternating({ metric: (r, s) => angle(r[s].hip, r[s].kn, r[s].an), enter: (m) => m < 75, exit: (m) => m > 145, guard: uprightGuard }),
  climbers: () => alternating({ metric: (r, s) => angle(r[s].sh, r[s].hip, r[s].kn), enter: (m) => m < 120, exit: (m) => m > 150, guard: plankGuard }),
  burpees: burpee,
};

export const cameraSupported = (exId) => exId in SPECS;

/**
 * Crée un compteur pour un exercice.
 * Pour les exos en secondes : holdMs = temps tenu (gainage, chaise) ou temps actif (cardio).
 */
export function createCounter(exId) {
  const make = SPECS[exId];
  if (!make) throw new Error(`Exercice non pris en charge par la caméra : ${exId}`);
  return makeEngine(make());
}
