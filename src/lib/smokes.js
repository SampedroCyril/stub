/**
 * Corriger l'historique des cigarettes (module pur, testé dans tests/smokes.test.js) : en ajouter une oubliée à une heure passée,
 * changer l'heure ou le déclencheur d'une cigarette notée, ou la retirer.
 *
 * La date de dernière cigarette (quitAt) suit : c'est la plus récente entre la date déclarée et les cigarettes notées.
 * Le record de jours est recalculé sur l'historique corrigé, pour qu'une cigarette oubliée ne laisse pas un record gonflé.
 */
import { compute } from "./compute.js";
import { dayKey } from "./util.js";

const same = (a, b) => a.k === "smoked" && a.t === b.t;

function without(days, ev) {
  const k = dayKey(new Date(ev.t));
  const out = { ...days, [k]: (days[k] || []).filter((e) => !same(e, ev)) };
  if (!out[k].length) delete out[k];
  return out;
}
function withEv(days, ev) {
  const k = dayKey(new Date(ev.t));
  return { ...days, [k]: [...(days[k] || []), ev] };
}

/**
 * Applique une correction. add : cigarette à ajouter { t, tr? } · remove : cigarette notée à retirer.
 * Les deux ensemble = modifier. Renvoie { state, days }.
 */
export function editSmokes({ state, days }, { add = null, remove = null }, now = new Date()) {
  let d = days, quitAt = state.quitAt;
  if (remove) {
    d = without(d, remove);
    if (+new Date(quitAt) === +new Date(remove.t)) {
      // c'était la dernière : on revient à la plus récente qui reste, ou à la date d'avant
      const left = Object.values(d).flat().filter((e) => e?.k === "smoked").map((e) => +new Date(e.t));
      quitAt = new Date(Math.max(+new Date(remove.pq || state.startAt || 0), ...left, 0)).toISOString();
    }
  }
  if (add) {
    const t = new Date(Math.min(+new Date(add.t), +now));
    const ev = { k: "smoked", t: t.toISOString(), ...(add.tr ? { tr: add.tr } : {}), pq: quitAt, ...(add.late ? { late: true } : {}) };
    d = withEv(d, ev);
    if (t > new Date(quitAt)) quitAt = ev.t;
  }
  const next = { ...state, quitAt, best: 0 };
  next.best = compute(next, d, now).best;
  return { state: next, days: d };
}
