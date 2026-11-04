/** Icônes 2D (santé, défis) : pastille teintée + motif, viewBox 40 × 40. */

export const LUNG_L = "M17.5 13.5C10.5 13.5 7 21.5 7 28.5c0 4.2 2.6 6.4 5.6 5.8 3.4-.7 5.4-3.6 5.4-7.6V15.6c0-1.2-.2-2.1-.5-2.1z";
export const LUNG_R = "M22.5 13.5c7 0 10.5 8 10.5 15 0 4.2-2.6 6.4-5.6 5.8-3.4-.7-5.4-3.6-5.4-7.6V15.6c0-1.2.2-2.1.5-2.1z";
const HEART = "M20 33C10 26.5 6.5 21 8.2 15.6 9.8 10.9 15.6 9.8 20 14.6c4.4-4.8 10.2-3.7 11.8 1 1.7 5.4-1.8 10.9-11.8 17.4z";
const SHIELD = "M28 22l7 2.6v5.6c0 4.4-3 7.3-7 8.8-4-1.5-7-4.4-7-8.8v-5.6z";

const Check = ({ x, y, s = 1 }) => (
  <polyline points={`${x},${y} ${x + 3 * s},${y + 3 * s} ${x + 8 * s},${y - 3 * s}`} fill="none" stroke="#fff" strokeWidth={2.4 * s} strokeLinecap="round" strokeLinejoin="round" />
);
const Hi = (props) => <ellipse style={{ fill: "#fff" }} opacity=".35" {...props} />;

function Lungs({ c }) {
  return (
    <>
      <path d={LUNG_L} style={{ fill: c }} />
      <path d={LUNG_R} style={{ fill: c }} />
      <path d="M20 6v13m0 0l-4 4m4-4l4 4" fill="none" style={{ stroke: c }} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10.5 22c1.2-3 2.6-4.6 4.5-5.4M29.5 22c-1.2-3-2.6-4.6-4.5-5.4" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
    </>
  );
}
const ShieldTag = () => (
  <>
    <path d={SHIELD} style={{ fill: "var(--quit)", stroke: "var(--surface)" }} strokeWidth="2" />
    <Check x={24.6} y={29.6} s={0.7} />
  </>
);

const SHAPES = {
  heart: (c) => (<><path d={HEART} style={{ fill: c }} /><Hi cx="14" cy="16.5" rx="3" ry="2" transform="rotate(-30 14 16.5)" /><polyline points="9,21 15,21 17,17 20,25 22,20 31,20" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></>),
  drop: (c) => (<><path d="M20 6c-5.6 7.7-10 12.8-10 18.6a10 10 0 0 0 20 0C30 18.8 25.6 13.7 20 6z" style={{ fill: c }} /><Hi cx="15.5" cy="24" rx="2" ry="3.4" /><text x="20.6" y="29" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="700" fontSize="8.5" fill="#fff">O₂</text></>),
  flower: (c) => (<>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="20" cy="12.5" rx="4.4" ry="6.2" style={{ fill: c }} transform={`rotate(${a} 20 19)`} opacity=".9" />)}<circle cx="20" cy="19" r="4.4" style={{ fill: "var(--gold)" }} /><path d="M20 24v11" style={{ stroke: "var(--quit)" }} strokeWidth="2.4" strokeLinecap="round" /><path d="M20 31c3-4 6-4 8-3.5-1 3-4 4.5-8 3.5z" style={{ fill: "var(--quit)" }} /></>),
  lungs: (c) => <Lungs c={c} />,
  wave: (c) => (<><path d="M7 14c3-3 5-3 8 0s5 3 8 0 5-3 8 0" fill="none" style={{ stroke: c }} strokeWidth="2.8" strokeLinecap="round" /><path d="M8 21c3-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0" fill="none" style={{ stroke: c }} strokeWidth="2.6" strokeLinecap="round" opacity=".7" /><path d="M9 28h22" style={{ stroke: c }} strokeWidth="2.4" strokeLinecap="round" opacity=".45" /></>),
  bolt: (c) => (<><path d="M23 5L10.5 22.5h8L16.5 35 29.5 17h-8.2z" style={{ fill: c }} /><path d="M22 8l-8 11.5h4" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="1.6" strokeLinecap="round" /></>),
  lungsStar: (c) => (<><Lungs c={c} /><path d="M31 5l1.4 3.2 3.2 1.4-3.2 1.4L31 14.2l-1.4-3.2-3.2-1.4 3.2-1.4z" style={{ fill: "var(--gold)" }} /><circle cx="8" cy="9" r="1.6" style={{ fill: "var(--gold)" }} /></>),
  heartShield: (c) => (<><path d={HEART} style={{ fill: c }} /><Hi cx="14" cy="16.5" rx="3" ry="2" transform="rotate(-30 14 16.5)" /><ShieldTag /></>),
  lungsShield: (c) => (<><Lungs c={c} /><ShieldTag /></>),
  trophy: (c) => (<><path d="M12 8h16v6.5a8 8 0 0 1-16 0z" style={{ fill: "var(--gold)" }} /><path d="M12 10H7.5c0 4.2 2 6.4 5.5 6.8M28 10h4.5c0 4.2-2 6.4-5.5 6.8" fill="none" style={{ stroke: "var(--gold)" }} strokeWidth="2.2" /><rect x="18" y="22" width="4" height="6" style={{ fill: "var(--gold)" }} /><rect x="13" y="28" width="14" height="4.5" rx="1.5" style={{ fill: c }} /><path d="M16 10.5v4" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" /></>),
  dumbbell: (c) => (<><rect x="12" y="18.3" width="16" height="3.4" rx="1.2" style={{ fill: c }} /><rect x="8" y="12.5" width="4.6" height="15" rx="1.6" style={{ fill: c }} /><rect x="27.4" y="12.5" width="4.6" height="15" rx="1.6" style={{ fill: c }} /><rect x="4.6" y="15.3" width="3.4" height="9.4" rx="1.2" style={{ fill: c }} opacity=".7" /><rect x="32" y="15.3" width="3.4" height="9.4" rx="1.2" style={{ fill: c }} opacity=".7" /></>),
  calendar: (c) => (<><rect x="8" y="10" width="24" height="22" rx="4" style={{ fill: c }} /><rect x="8" y="15" width="24" height="2" style={{ fill: "#000" }} opacity=".12" /><rect x="13" y="7" width="2.6" height="6" rx="1.3" style={{ fill: c }} /><rect x="24.4" y="7" width="2.6" height="6" rx="1.3" style={{ fill: c }} /><Check x={14.5} y={24.5} /></>),
  shield: (c) => (<><path d="M20 5l11 4v9c0 7.4-4.8 12.4-11 14.9C13.8 30.4 9 25.4 9 18V9z" style={{ fill: c }} /><Check x={14.8} y={19.5} /></>),
  flame: (c) => (<><path d="M20 5c4.2 6 9.5 9.2 9.5 17a9.5 9.5 0 0 1-19 0c0-4.6 2.6-7.6 4.6-10.4.6 3.6 2.6 5 4.4 5.2C19.8 13 19 9.6 20 5z" style={{ fill: c }} /><path d="M20 20c2 2.6 4 4 4 7a4 4 0 0 1-8 0c0-2.4 2-4.2 4-7z" style={{ fill: "var(--gold)" }} /></>),
  wind: (c) => (<><path d="M7 15h15a4.2 4.2 0 1 0-4.2-4.2" fill="none" style={{ stroke: c }} strokeWidth="2.8" strokeLinecap="round" /><path d="M7 21h20a4.2 4.2 0 1 1-4.2 4.2" fill="none" style={{ stroke: c }} strokeWidth="2.8" strokeLinecap="round" /><path d="M7 27h9" fill="none" style={{ stroke: c }} strokeWidth="2.8" strokeLinecap="round" opacity=".6" /></>),
  tag: (c) => (<><path d="M9 9.5h11.2L31 20.3 20.3 31 9.5 20.2z" style={{ fill: c }} /><circle cx="15" cy="15" r="2.4" style={{ fill: "var(--surface)" }} /></>),
  star: (c) => <path d="M20 6l4.1 8.6 9.4 1.2-6.9 6.5 1.8 9.3L20 27.1l-8.4 4.5 1.8-9.3-6.9-6.5 9.4-1.2z" style={{ fill: c }} />,
  camera: (c) => (<><rect x="7" y="13" width="26" height="18" rx="4" style={{ fill: c }} /><path d="M15 13l2-4h6l2 4z" style={{ fill: c }} /><circle cx="20" cy="22" r="5.6" style={{ fill: "var(--surface)" }} /><circle cx="20" cy="22" r="3.2" style={{ fill: c }} /></>),
};

export default function Icon({ name, col = "accent", plain = false }) {
  const c = `var(--${col})`;
  const draw = SHAPES[name];
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      {!plain && <circle cx="20" cy="20" r="20" style={{ fill: c }} opacity=".14" />}
      {draw ? draw(c) : null}
    </svg>
  );
}

export function Medal({ t }) {
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  const col = t ? `var(--t${Math.min(t, 9)})` : "var(--t0)";
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true">
      <path d="M26 2 L46 13.5 L46 38.5 L26 50 L6 38.5 L6 13.5 Z" style={{ fill: col }} />
      <path d="M26 2 L46 13.5 L26 26 L6 13.5 Z" fill="#fff" opacity=".12" />
      <path d="M26 8 L41 16.6 L41 35.4 L26 44 L11 35.4 L11 16.6 Z" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.5" />
      <text className="medal-num" x="26" y="31.5" textAnchor="middle">{t ? ROMAN[t - 1] : "–"}</text>
    </svg>
  );
}
