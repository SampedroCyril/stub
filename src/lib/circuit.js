import { EX, RENFO, CARDIO } from "../data/exercises.js";
import { clamp } from "./util.js";

export const isUnlocked = (e, sportL) => EX[e].lv <= sportL;

export function nextIdx(list, i, sportL) {
  for (let k = 0; k < list.length; k++) {
    const j = (i + k) % list.length;
    if (isUnlocked(list[j], sportL)) return j;
  }
  return 0;
}

/** Quantités : +10 % par niveau sport, ±12 % par retour « trop dur / trop facile ». */
export const scaleOf = (sportL, adj) => clamp(1 + 0.1 * (sportL - 1) + 0.12 * adj, 0.6, 3);

export function amount(e, sportL, adj) {
  const x = EX[e], n = x.base * scaleOf(sportL, adj);
  return x.u === "s" ? Math.max(10, Math.round(n / 5) * 5) : Math.max(3, Math.round(n));
}

export const pairAt = (state, sportL) => [RENFO[nextIdx(RENFO, state.ri, sportL)], CARDIO[nextIdx(CARDIO, state.ci, sportL)]];

export function upcoming(state, sportL, count) {
  let ri = state.ri, ci = state.ci;
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = nextIdx(RENFO, ri, sportL), c = nextIdx(CARDIO, ci, sportL);
    out.push([RENFO[r], CARDIO[c]]);
    ri = r + 1;
    ci = c + 1;
  }
  return out;
}

export function randomPair(current, sportL) {
  const ur = RENFO.filter((e) => isUnlocked(e, sportL)), uc = CARDIO.filter((e) => isUnlocked(e, sportL));
  let r, c;
  do {
    r = ur[Math.floor(Math.random() * ur.length)];
    c = uc[Math.floor(Math.random() * uc.length)];
  } while (r === current[0] && c === current[1] && ur.length * uc.length > 1);
  return [r, c];
}

export const advanceRotation = (state, sportL) => ({
  ri: (nextIdx(RENFO, state.ri, sportL) + 1) % RENFO.length,
  ci: (nextIdx(CARDIO, state.ci, sportL) + 1) % CARDIO.length,
});
