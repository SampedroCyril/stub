import { memo, useEffect, useRef } from "react";
import { BOSS_ART } from "./gfx/bossArt.js";
import { compile } from "./gfx/sprite.js";

const cache = new Map();
export function idleSprite(id) {
  if (!cache.has(id)) {
    const art = BOSS_ART[id] || BOSS_ART.clope;
    cache.set(id, compile(art.draw({ blink: 0, hurt: 0, talk: 0, crack: 0, anger: 0, f: 0 }), art.pal));
  }
  return cache.get(id);
}

/** Portrait fixe d'un boss (bestiaire, préparation du combat, pastille). */
function BossThumb({ id, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const sp = idleSprite(id), c = ref.current;
    c.width = sp.w; c.height = sp.h;
    const x = c.getContext("2d");
    x.clearRect(0, 0, sp.w, sp.h);
    x.drawImage(sp.img, 0, 0);
  }, [id]);
  return <canvas ref={ref} className={`boss-thumb ${className}`} aria-hidden="true" />;
}
export default memo(BossThumb);
