/**
 * Personnage 2D des exercices.
 * Squelette : tête h, épaules n, bassin p, bras a/A, jambes l/L (majuscule = côté éloigné),
 * habillé (tee-shirt, short, peau, chaussures, cheveux). Le fantôme montre la position de départ.
 * Les mêmes poses servent aux tests du coach caméra (tests/poseFixtures.js).
 */
import { POSE, stand, shift } from "./poses.js";

const pts = (a) => a.map((q) => q.map((v) => +v.toFixed(1)).join(",")).join(" ");
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const last = (a) => a[a.length - 1];

function Body({ p, ghost }) {
  const g = "var(--ghost)";
  const C = ghost
    ? { skin: g, skinF: g, shirt: g, shirtF: g, pants: g, pantsF: g, shoe: g, hair: g }
    : { skin: "var(--skin)", skinF: "var(--skin-far)", shirt: "var(--shirt)", shirtF: "var(--shirt-far)", pants: "var(--pants)", pantsF: "var(--pants-far)", shoe: "var(--shoe)", hair: "var(--hair)" };
  const L = (key, a, c, w) => <polyline key={key} points={pts(a)} style={{ stroke: c }} strokeWidth={w} />;
  const D = (key, q, r, c) => <circle key={key} cx={q[0].toFixed(1)} cy={q[1].toFixed(1)} r={r} style={{ fill: c }} />;
  const arm = (k, a, sh, sk, wS, wF, hr) => [L(`${k}1`, [p.n, a[0]], sh, wS), L(`${k}2`, a, sk, wF), D(`${k}3`, last(a), hr, sk)];
  const leg = (k, l, pa, wl) => [L(`${k}1`, [p.p, ...l], pa, wl), D(`${k}2`, last(l), 4.4, C.shoe)];
  return (
    <g>
      {leg("Lf", p.L, C.pantsF, 9)}
      {arm("Af", p.A, C.shirtF, C.skinF, 7, 5, 3.1)}
      {L("neck", [lerp(p.n, p.h, 0.5), p.n], C.skin, 5.5)}
      {L("torso", [p.n, p.p], C.shirt, 15)}
      {L("shorts", [lerp(p.p, p.n, 0.3), p.p], C.pants, 15)}
      {leg("Ln", p.l, C.pants, 9.8)}
      {arm("An", p.a, C.shirt, C.skin, 7.6, 5.6, 3.4)}
      {ghost
        ? D("head", p.h, 7.6, g)
        : [D("hair", [p.h[0] - 1.3, p.h[1] - 1.4], 7.9, C.hair), D("face", [p.h[0] + 0.7, p.h[1] + 0.8], 6.8, C.skin)]}
    </g>
  );
}

const ArrowV = ({ x, y1, y2 }) => (
  <g className="arrow">
    <line x1={x} y1={y1} x2={x} y2={y2} />
    <polyline points={`${x - 4},${y1 + 5} ${x},${y1} ${x + 4},${y1 + 5}`} />
    <polyline points={`${x - 4},${y2 - 5} ${x},${y2} ${x + 4},${y2 - 5}`} />
  </g>
);
const ArrowH = ({ y, x1, x2 }) => (
  <g className="arrow">
    <line x1={x1} y1={y} x2={x2} y2={y} />
    <polyline points={`${x1 + 5},${y - 4} ${x1},${y} ${x1 + 5},${y + 4}`} />
    <polyline points={`${x2 - 5},${y - 4} ${x2},${y} ${x2 - 5},${y + 4}`} />
  </g>
);
const ArrowUp = ({ x, y1, y2 }) => (
  <g className="arrow">
    <line x1={x} y1={y1} x2={x} y2={y2} />
    <polyline points={`${x - 4},${y2 + 5} ${x},${y2} ${x + 4},${y2 + 5}`} />
  </g>
);
const ArrowR = ({ x1, x2, y }) => (
  <g className="arrow">
    <line x1={x1} y1={y} x2={x2} y2={y} />
    <polyline points={`${x2 - 5},${y - 4} ${x2},${y} ${x2 - 5},${y + 4}`} />
  </g>
);
const Curve = ({ d, head }) => (
  <g className="arrow">
    <path d={d} />
    <polyline points={head} />
  </g>
);

const CHAIR_L = <g className="prop"><polyline points="8,72 40,72" /><polyline points="10,72 10,102" /><polyline points="38,72 38,102" /><polyline points="10,72 10,46" /></g>;
const CHAIR_R = <g className="prop"><polyline points="100,68 134,68" /><polyline points="102,68 102,102" /><polyline points="132,68 132,102" /><polyline points="132,68 132,38" /></g>;
const WALL = <g className="prop"><polyline points="40,-6 40,102" /></g>;

/** Pose principale, fantôme, accessoires, flèche, ombre. */
const FIGS = {
  squat: { main: POSE.squat, ghost: stand(80), arrow: <ArrowV x={138} y1={30} y2={80} /> },
  squatSlow: { main: POSE.squat, ghost: stand(80), arrow: <><ArrowV x={138} y1={30} y2={80} /><text className="arrow-txt" x="126" y="96">3 s</text></> },
  jumpSquat: { main: POSE.jumpUp, ghost: shift(POSE.squat, -40, 0), arrow: <ArrowUp x={130} y1={88} y2={24} />, sw: 20 },
  lunge: { main: POSE.lunge, ghost: stand(80), arrow: <ArrowV x={136} y1={44} y2={84} /> },
  jumpLunge: { main: POSE.lungeAir, arrow: <ArrowUp x={136} y1={90} y2={36} />, sw: 30 },
  push: { main: POSE.pushTop, ghost: POSE.pushLow, arrow: <ArrowV x={140} y1={60} y2={92} />, sx: 70, sw: 46 },
  pushClose: { main: POSE.pushTop, ghost: POSE.pushLow, arrow: <ArrowV x={140} y1={60} y2={92} />, sx: 70, sw: 46 },
  decline: { main: POSE.decline, props: CHAIR_L, arrow: <ArrowV x={140} y1={62} y2={94} />, sx: 90, sw: 24 },
  pike: { main: POSE.pike, arrow: <ArrowV x={132} y1={64} y2={94} />, sx: 78, sw: 38 },
  plank: { main: POSE.plank, sx: 72, sw: 50 },
  side: { main: POSE.side, sx: 70, sw: 46 },
  taps: { main: POSE.taps, ghost: POSE.pushTop, sx: 70, sw: 46 },
  dips: { main: POSE.dipLow, props: CHAIR_R, ghost: POSE.dipTop, arrow: <ArrowV x={30} y1={34} y2={74} />, sx: 72, sw: 22 },
  wall: { main: POSE.wall, props: WALL, sx: 62, sw: 16 },
  bridge: { main: POSE.bridge, ghost: POSE.bridge0, arrow: <ArrowV x={70} y1={42} y2={68} />, sx: 64, sw: 42 },
  superman: { main: POSE.super, ghost: POSE.super0, arrow: <ArrowV x={148} y1={62} y2={86} />, sx: 84, sw: 56 },
  legRaise: { main: POSE.legsUp, ghost: POSE.legsDn, arrow: <Curve d="M126 90 Q124 58 96 46" head="102,42 96,46 102,51" />, sx: 70, sw: 46 },
  calf: { main: POSE.calf, ghost: stand(80), arrow: <ArrowV x={112} y1={72} y2={98} />, sw: 16 },
  jacks: { main: POSE.jackOut, ghost: POSE.jackIn, sw: 26 },
  knees: { main: POSE.knees, arrow: <ArrowV x={124} y1={52} y2={80} />, sw: 18 },
  kicks: { main: POSE.kicks, sw: 18 },
  climb: { main: POSE.climb, ghost: POSE.pushTop, sx: 70, sw: 46 },
  skate: { main: POSE.skate, arrow: <ArrowH y={-2} x1={50} x2={120} />, sw: 24 },
  box: { main: POSE.box, arrow: <ArrowR x1={122} x2={142} y={24} />, sw: 24 },
  burpee: { main: POSE.burpJump, ghost: shift(POSE.pushTop, -30, 0), arrow: <Curve d="M84 62 Q92 34 104 36" head="98,32 104,36 99,41" />, sx: 66, sw: 62 },
};

export default function Figure({ name, className = "" }) {
  const f = FIGS[name];
  if (!f) return null;
  const sx = f.sx ?? 80, sw = f.sw ?? 30;
  return (
    <svg className={`fig ${className}`} viewBox="0 -10 160 120" aria-hidden="true">
      <ellipse className="shadow" cx={sx} cy="102" rx={sw} ry="3.5" />
      <line className="ground" x1="4" y1="103" x2="156" y2="103" />
      {f.props}
      {f.ghost && <Body p={f.ghost} ghost />}
      <Body p={f.main} />
      {f.arrow}
    </svg>
  );
}
