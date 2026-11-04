import { grid } from "./sprite.js";

/**
 * Bosses dessinés à la main (32 × 32) avec leurs variantes :
 * s = { blink, hurt, talk, crack (0-3), anger, f (frame d'animation) }
 */
export const BOSS_ART = {
  cafe: {
    pal: {
      m: { r: ["#9aa3bf", "#e9edf6", "#ffffff"], cyl: true },
      h: { r: ["#9aa3bf", "#e9edf6", "#ffffff"] },
      c: { r: ["#3b1f12", "#6b3a1f", "#9a5a32"] },
      v: "#c98c5a",
      s: { r: ["#333c57", "#566c86", "#94b0c2"] },
      e: "#ffffff", k: "#140c1c", w: "#f4f4f4", r: "#e43b44", t: "#b13e53", R: "#e43b44",
    },
    steam: { x: 16, y: 7, angry: "#e8a0a0" },
    weakZone: { x0: 8, x1: 24, y0: 12, y1: 24 },
    draw(s) {
      const g = grid(32, 31);
      g.ellipse(15.5, 27.6, 14, 2.6, "s");
      g.ellipse(26, 17, 4.6, 5.6, "h").ellipse(26, 17, 2.1, 3.1, ".");
      g.rect(6, 9, 19, 17, "m").px(6, 25, ".").px(24, 25, ".");
      g.ellipse(15.5, 9.5, 9.6, 2.6, "m");
      g.ellipse(15.5, 9.4, 7.8, 1.6, "c");
      g.px(9 + ((s.f >> 1) % 5) * 2, 9, "v").px(10 + ((s.f >> 1) % 5) * 2, 9, "v");
      // yeux
      if (s.hurt) {
        g.line(9, 13, 12, 15, "k").line(12, 15, 9, 17, "k");
        g.line(22, 13, 19, 15, "k").line(19, 15, 22, 17, "k");
      } else if (s.blink) {
        g.rect(9, 15, 4, 1, "k").rect(19, 15, 4, 1, "k");
      } else {
        g.rect(9, 13, 4, 4, "e").px(9, 13, "m").px(12, 16, "m").px(9, 16, "m");
        g.rect(19, 13, 4, 4, "e").px(22, 13, "m").px(19, 16, "m").px(22, 16, "m");
        g.rect(11, 14, 2, 2, "k").rect(19, 14, 2, 2, "k");
        g.px(11, 14, "w").px(19, 14, "w");
      }
      // sourcils colère
      g.line(8, 11, 13, 13, "k").line(9, 11, 13, 12, "k");
      g.line(23, 11, 18, 13, "k").line(22, 11, 18, 12, "k");
      // bouche
      if (s.hurt) {
        g.ellipse(15.5, 21.5, 3.6, 2.8, "k").rect(14, 22, 4, 1, "t");
      } else if (s.talk) {
        g.rect(11, 19, 10, 5, "k").rect(13, 22, 6, 2, "t");
        g.px(12, 19, "w").px(14, 19, "w").px(17, 19, "w").px(19, 19, "w");
      } else {
        g.rect(11, 20, 10, 3, "k");
        g.px(12, 20, "w").px(14, 20, "w").px(17, 20, "w").px(19, 20, "w").px(13, 22, "w").px(18, 22, "w");
      }
      // fissures selon les dégâts
      if (s.crack >= 1) g.line(21, 18, 23, 21, "k").line(23, 21, 22, 24, "k");
      if (s.crack >= 2) g.line(8, 18, 10, 21, "k").line(10, 21, 9, 23, "k").px(7, 18, "k");
      if (s.crack >= 3) { g.px(19, 7, ".").px(20, 7, ".").px(20, 8, ".").line(14, 24, 16, 22, "k").line(16, 22, 17, 25, "k"); }
      // veine de colère
      if (s.anger) g.stamp(24, 2, [" R R", "RR RR", "", "RR RR", " R R"].map((r) => r.replace(/ /g, " ")));
      return g;
    },
  },
};
