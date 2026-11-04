import { useEffect, useRef } from "react";
import { Gauge } from "./gfx/Gauge.js";

/** Jauge de rythme (gfx/Gauge) : gaugeRef reçoit l'instance, le thème peut changer à chaud. */
export default function GaugeView({ gaugeRef: ext, style = "fluid", demo = false }) {
  const cv = useRef(null), own = useRef(null);
  const gaugeRef = ext || own;
  useEffect(() => {
    const g = new Gauge(cv.current, style);
    gaugeRef.current = g;
    return () => { g.destroy(); if (gaugeRef.current === g) gaugeRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (gaugeRef.current) gaugeRef.current.style = style; }, [style, gaugeRef]);
  // aperçu (réglages) : une note toutes les 1,4 s, jouée parfaitement
  useEffect(() => {
    if (!demo) return;
    let i = 0, t;
    const loop = () => {
      const g = gaugeRef.current;
      if (!g) return;
      i++;
      g.note = { t0: performance.now(), dur: 900, kind: i % 4 === 0 ? "cig" : "hit", perfect: 90, good: 210 };
      t = setTimeout(() => { if (!gaugeRef.current) return; gaugeRef.current.note = null; gaugeRef.current.judge(i % 4 === 0 ? "refused" : i % 3 === 0 ? "good" : "perfect"); t = setTimeout(loop, 500); }, 900 + (i % 3 === 0 ? 120 : 0));
    };
    t = setTimeout(loop, 300);
    return () => clearTimeout(t);
  }, [demo, gaugeRef]);
  return <div className="gauge-view"><canvas ref={cv} aria-label="Jauge de rythme : touche l'écran quand les notes arrivent au centre" /></div>;
}
