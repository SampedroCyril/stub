import { EX, sides, circuitXp } from "../data/exercises.js";
import { CRAV_XP, XP_DAY, DEFI_XP, SPORT_K, PLAYER_K, levelOf, quitLevelOf, stageMult, segMult, afterSmoke, withMult, REBOUND_XP, methodOf, playerXpOf, HEALTH, ivOf } from "../data/rules.js";
import { DEFIS, pickDefis, evalDefi } from "../data/defis.js";
import { BADGES, badgeInfo } from "../data/badges.js";
import { RANK_XP } from "../game/battle.js";
import { DAY, dayKey, weekStart, addDays, clamp } from "./util.js";

/** Liste triée de tous les événements. */
export function flatEvents(days) {
  return Object.keys(days)
    .sort()
    .flatMap((k) => days[k] || [])
    .filter((e) => e && e.k && e.t)
    .sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
}

/**
 * Calcule tout l'état dérivé.
 * - Sevrage : XP et badges sur tout le suivi ; seule la série (et son multiplicateur) repart à zéro après une cigarette.
 * - Sport, respiration, défis, stats : tout l'historique.
 * Chaque badge a une série chronologique {t, v} pour dater ses paliers.
 */
export function compute(state, days, now = new Date()) {
  let q = new Date(state.quitAt);
  if (isNaN(q) || q > now) q = now;
  let startAt = new Date(state.startAt || state.quitAt);
  if (isNaN(startAt)) startAt = q;

  const ev = flatEvents(days);
  const ser = {};
  const smokes = ev.filter((e) => e.k === "smoked");
  const cravAll = ev.filter((e) => e.k === "craving");
  const breaths = ev.filter((e) => e.k === "breath");

  /* ---- défis, semaine par semaine ---- */
  const weeks = [];
  const firstT = ev.length ? new Date(ev[0].t) : now;
  let ws = weekStart(new Date(Math.min(+firstT, +startAt, +now)));
  const curWs = weekStart(now);
  while (ws <= curWs) {
    const we = addDays(ws, 7);
    const list = ev.filter((e) => { const t = new Date(e.t); return t >= ws && t < we; });
    const ids = pickDefis(dayKey(ws));
    weeks.push({ ws: new Date(ws), we, cur: +ws === +curWs, defs: ids.map((id) => ({ id, ...evalDefi(id, list, ws, we, now, smokes, startAt) })) });
    ws = we;
  }
  const allWins = weeks
    .flatMap((w) => w.defs.filter((d) => d.doneAt && d.doneAt <= now).map((d) => ({ ...d, g: DEFIS[d.id].g })))
    .sort((a, b) => a.doneAt - b.doneAt);
  ser.defis = allWins.map((d, i) => ({ t: d.doneAt, v: i + 1 }));

  /* ---- sevrage ----
   * L'XP se cumule sur tout le suivi et ne repart jamais à zéro. Le multiplicateur (commun à tous les modules) suit les
   * caps santé de la série en cours ; une cigarette relance la série et garde au moins la moitié du bonus. */
  const elapsed = now - q;
  const streak = Math.floor(elapsed / DAY);
  const t0 = Math.min(+startAt, +q);
  // débuts de série : le début du suivi, chaque cigarette, la dernière date déclarée
  const starts = [...new Set([t0, ...smokes.map((e) => +new Date(e.t)).filter((t) => t >= t0 && t < +q), +q])].sort((a, b) => a - b);
  const segs = []; // [début, fin, bonus gardé]
  starts.forEach((s, i) => {
    const e = i + 1 < starts.length ? starts[i + 1] : +now;
    const prev = segs[i - 1];
    segs.push([s, e, prev ? afterSmoke(segMult(prev[1] - prev[0], prev[2])) - 1 : 0]);
  });
  /** Multiplicateur à l'instant t (avant le début du suivi : × 1). */
  const multAt = (t) => {
    let g = null;
    for (const x of segs) { if (x[0] <= t) g = x; else break; }
    return g ? segMult(t - g[0], g[2]) : 1;
  };
  const qPoints = [];
  ser.streak = []; // record de jours d'affilée, qui ne redescend jamais
  ser.rebond = [];
  let rec = 0, xpDays = 0, xpReb = 0;
  segs.forEach(([s, e, b0], i) => {
    const n = Math.floor((e - s) / DAY);
    for (let k = 1; k <= n; k++) {
      const t = new Date(s + k * DAY), x = withMult(XP_DAY, segMult(k * DAY, b0));
      qPoints.push({ t, x });
      xpDays += x;
      if (k > rec) { rec = k; ser.streak.push({ t, v: k }); }
    }
    if (i > 0 && n >= 1) {
      const t = new Date(s + DAY), x = withMult(REBOUND_XP, segMult(DAY, b0));
      qPoints.push({ t, x });
      xpReb += x;
      ser.rebond.push({ t, v: ser.rebond.length + 1 });
    }
  });
  const att = cravAll.filter((e) => +new Date(e.t) >= t0);
  let res = 0, resSport = 0, resBreath = 0, xpCrav = 0;
  ser.res = [];
  ser.ressport = [];
  att.forEach((e) => {
    const d = new Date(e.t), m = methodOf(e);
    res++;
    ser.res.push({ t: d, v: res });
    if (m === "sport") { resSport++; ser.ressport.push({ t: d, v: resSport }); }
    if (m === "breath") resBreath++;
    const x = withMult(CRAV_XP[m] + (RANK_XP[e.rk] || 0), multAt(+d));
    qPoints.push({ t: d, x });
    xpCrav += x;
  });
  const quitWins = allWins.filter((d) => d.g === "quit" && +d.doneAt >= t0);
  let xpDefQ = 0;
  quitWins.forEach((d) => { const x = withMult(DEFI_XP, multAt(+d.doneAt)); qPoints.push({ t: d.doneAt, x }); xpDefQ += x; });
  qPoints.sort((a, b) => a.t - b.t);
  let qx = 0;
  ser.lvlq = [];
  qPoints.forEach((p) => { qx += p.x; ser.lvlq.push({ t: p.t, v: quitLevelOf(qx).L }); });
  const best = Math.max(state.best || 0, rec, streak);
  const lastSeg = segs[segs.length - 1];
  const mult = segMult(+now - lastSeg[0], lastSeg[2]);
  const multKept = 1 + lastSeg[2] > stageMult(+now - lastSeg[0]); // le bonus gardé l'emporte sur les caps

  /* ---- jeu : boss et Frénésie ---- */
  let bossN = 0, frenzyN = 0;
  ser.boss = [];
  ser.frenzy = [];
  cravAll.forEach((e) => { if (e.b) { bossN++; ser.boss.push({ t: new Date(e.t), v: bossN }); } });
  ev.filter((e) => e.k === "game" && e.g === "frenzy").forEach((e) => { if (e.h) { frenzyN += e.h; ser.frenzy.push({ t: new Date(e.t), v: frenzyN }); } });

  /* ---- respiration ---- */
  ser.breath = breaths.map((e, i) => ({ t: new Date(e.t), v: i + 1 }));
  const breathSec = breaths.reduce((a, e) => a + (e.sec || 0), 0);

  /* ---- sport ---- */
  const tot = {};
  const c = { circ: 0, pompes: 0, squats: 0, fentes: 0, gainage: 0, cardio: 0, burpees: 0, reps: 0, camreps: 0, xp: 0 };
  ["circ", "pompes", "squats", "fentes", "gainage", "cardio", "burpees", "reps", "camreps"].forEach((k) => (ser[k] = []));
  const sportDays = new Map();
  const sPoints = [];
  ev.filter((e) => e.k === "circuit" || e.k === "challenge").forEach((e) => {
    const d = new Date(e.t);
    if (e.k === "circuit") { c.circ++; ser.circ.push({ t: d, v: c.circ }); }
    const dk = dayKey(d);
    if (!sportDays.has(dk)) sportDays.set(dk, d);
    (e.items || []).forEach((it) => {
      const x = EX[it.e];
      if (!x) return;
      const amt = it.n * sides(it.e);
      tot[it.e] = (tot[it.e] || 0) + amt;
      const push = (k) => { c[k] += amt; ser[k].push({ t: d, v: c[k] }); };
      if (x.cat === "pompes") push("pompes");
      if (x.cat === "squats") push("squats");
      if (x.cat === "fentes") push("fentes");
      if (x.cat === "gainage" && x.u === "s") push("gainage");
      if (x.t === "cardio" && x.u === "s") push("cardio");
      if (it.e === "burpees") push("burpees");
      if (x.u === "reps") push("reps");
      if (it.cam && x.u === "reps") push("camreps");
    });
    sPoints.push({ t: d, x: withMult(circuitXp(e), multAt(+d)) });
  });
  const sportWins = allWins.filter((d) => d.g === "sport");
  sportWins.forEach((d) => sPoints.push({ t: d.doneAt, x: withMult(DEFI_XP, multAt(+d.doneAt)) }));
  sPoints.sort((a, b) => a.t - b.t);
  ser.lvls = [];
  sPoints.forEach((p) => { c.xp += p.x; ser.lvls.push({ t: p.t, v: levelOf(c.xp, SPORT_K).L }); });

  ser.serie = [];
  let run = 0, bestRun = 0, prev = null;
  [...sportDays.keys()].sort().forEach((k) => {
    const d = new Date(`${k}T12:00:00`);
    run = prev && Math.round((d - prev) / DAY) === 1 ? run + 1 : 1;
    prev = d;
    if (run > bestRun) { bestRun = run; ser.serie.push({ t: sportDays.get(k), v: run }); }
  });
  let sStreak = 0;
  {
    const d = new Date(now);
    if (!sportDays.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (sportDays.has(dayKey(d))) { sStreak++; d.setDate(d.getDate() - 1); }
  }

  /* ---- joueur : combats et Arcade ---- */
  let px = 0;
  const pDay = new Map();
  ser.lvlp = [];
  ev.forEach((e) => { const x = withMult(playerXpOf(e, pDay), multAt(+new Date(e.t))); if (x) { px += x; ser.lvlp.push({ t: new Date(e.t), v: levelOf(px, PLAYER_K).L }); } });

  return {
    now, q, startAt, ev, ser, qPoints, sPoints, playerXp: px, player: levelOf(px, PLAYER_K),
    elapsed, streak, res, resSport, resBreath, xpDays, xpCrav, xpDefQ,
    quitXp: qx, quit: quitLevelOf(qx), mult, multKept, xpReb, rebonds: ser.rebond.length, best, cravAll, smokes, breaths, breathSec, bossN, frenzyN,
    tot, c, sportXp: c.xp, sport: levelOf(c.xp, SPORT_K), sportDays, sStreak, bestRun,
    weeks, allWins, sportWinsN: sportWins.length,
  };
}

/* ---------------- Santé ---------------- */
export function healthState(S) {
  const el = S.elapsed;
  const idx = HEALTH.findIndex((h) => el < h.ms);
  const next = idx === -1 ? null : HEALTH[idx];
  const prevMs = idx <= 0 ? 0 : HEALTH[idx - 1].ms;
  const frac = next ? clamp((el - prevMs) / (next.ms - prevMs), 0, 1) : 1;
  const doneN = idx === -1 ? HEALTH.length : idx;
  return { idx, next, frac, doneN };
}

/* ---------------- Récap hebdo ---------------- */
function levelAt(series, t) {
  let v = 1;
  for (const p of series) { if (p.t < t) v = p.v; else break; }
  return v;
}

export function weekData(S, state, ws) {
  const we = addDays(ws, 7);
  const inW = (t) => { const d = new Date(t); return d >= ws && d < we; };
  const ev = S.ev.filter((e) => inW(e.t));
  const crav = ev.filter((e) => e.k === "craving");
  const withI = crav.filter((e) => ivOf(e));
  const avgI = withI.length ? withI.reduce((a, e) => a + ivOf(e), 0) / withI.length : null;
  const circ = ev.filter((e) => e.k === "circuit");
  const reps = ev.filter((e) => e.k === "circuit" || e.k === "challenge").reduce((a, e) => a + (e.items || []).reduce((b, it) => b + (EX[it.e] && EX[it.e].u === "reps" ? it.n * sides(it.e) : 0), 0), 0);
  const breaths = ev.filter((e) => e.k === "breath");
  const tc = {};
  crav.forEach((e) => { if (e.tr) tc[e.tr] = (tc[e.tr] || 0) + 1; });
  const topT = Object.entries(tc).sort((a, b) => b[1] - a[1])[0] || null;
  const hours = Array(24).fill(0);
  crav.forEach((e) => hours[new Date(e.t).getHours()]++);
  const hMax = Math.max(...hours), topH = hMax ? hours.indexOf(hMax) : null;
  const meth = { sport: 0, breath: 0, hold: 0 };
  crav.forEach((e) => meth[methodOf(e)]++);
  const end = new Date(Math.min(+we, +S.now));
  let clean = 0, counted = 0;
  for (let d = new Date(ws); d < end; d.setDate(d.getDate() + 1)) {
    const de = addDays(d, 1);
    if (de <= S.startAt) continue;
    counted++;
    if (!S.smokes.some((e) => { const t = new Date(e.t); return t >= d && t < de; })) clean++;
  }
  const inPts = (l) => l.filter((p) => p.t >= ws && p.t < we).reduce((a, p) => a + p.x, 0);
  const week = S.weeks.find((w) => +w.ws === +ws);
  const wins = week ? week.defs.filter((d) => d.doneAt && d.doneAt <= S.now) : [];
  const badges = [];
  BADGES.forEach((b) => {
    const i = badgeInfo(b, S);
    let best = 0;
    i.dates.forEach((d, k) => { if (d && d >= ws && d < we) best = k + 1; });
    if (best) badges.push({ b, t: best });
  });
  badges.sort((a, b) => b.t - a.t);
  const caps = HEALTH.filter((h) => { const t = new Date(+S.q + h.ms); return t >= ws && t < we && t <= S.now; });
  return {
    ws, we, live: we > S.now, crav: crav.length, avgI, withI: withI.length, smokes: ev.filter((e) => e.k === "smoked").length,
    circ: circ.length, reps, breaths: breaths.length, breathSec: breaths.reduce((a, e) => a + (e.sec || 0), 0),
    topT, topH, meth, clean, counted, xpQ: inPts(S.qPoints), xpS: inPts(S.sPoints), wins, badges, caps,
    lvQ: [levelAt(S.ser.lvlq, ws), levelAt(S.ser.lvlq, we)], lvS: [levelAt(S.ser.lvls, ws), levelAt(S.ser.lvls, we)],
  };
}

/** Semaine dont le récap doit s'ouvrir tout seul, ou null. */
export function recapDue(S, state, now, recapHour) {
  const cur = weekStart(now);
  if (now.getDay() === 0 && now.getHours() >= recapHour && (state.recapSeen || "") < dayKey(cur)) return cur;
  // rattrapage : seulement si la page était déjà utilisée au moment prévu (dimanche, recapHour)
  const last = addDays(cur, -7);
  const due = addDays(last, 6);
  due.setHours(recapHour, 0, 0, 0);
  const firstUse = S.ev.length ? new Date(S.ev[0].t) : now;
  if (firstUse < due && (state.recapSeen || "") < dayKey(last)) return last;
  return null;
}
