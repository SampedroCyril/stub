import { memo } from "react";
import { SPRITES } from "./sprites.js";

/** Sprite pixel art en SVG : un rectangle par série de pixels de même couleur, rendu net. */
function Pixel({ name, className = "", title }) {
  const sp = SPRITES[name];
  if (!sp) return null;
  const w = sp.px[0].length, h = sp.px.length;
  const rects = [];
  sp.px.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      const c = row[x];
      let end = x + 1;
      while (end < w && row[end] === c) end++;
      if (c !== ".") rects.push(<rect key={`${y}-${x}`} x={x} y={y} width={end - x} height={1} fill={sp.pal[c]} />);
      x = end;
    }
  });
  return (
    <svg className={`pixel ${className}`} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {rects}
    </svg>
  );
}

export default memo(Pixel);
