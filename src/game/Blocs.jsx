import { useEffect, useRef, useState } from "react";
import { createGame, move, rotate, tick, hardDrop, ghostOf, cellsOf, gravityMs, SHAPES, COLORS, W, H } from "./blocks.js";
import { pad } from "../lib/util.js";

const CELL = 16;

function drawCell(g, x, y, color, alpha = 1) {
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.fillRect(x * CELL, y * CELL, CELL, CELL);
  // biseau pixel : clair en haut à gauche, sombre en bas à droite
  g.fillStyle = "rgba(255,255,255,.35)";
  g.fillRect(x * CELL, y * CELL, CELL, 2);
  g.fillRect(x * CELL, y * CELL, 2, CELL);
  g.fillStyle = "rgba(0,0,0,.3)";
  g.fillRect(x * CELL, y * CELL + CELL - 2, CELL, 2);
  g.fillRect(x * CELL + CELL - 2, y * CELL, 2, CELL);
  g.globalAlpha = 1;
}

/**
 * Jeu de blocs tactile.
 * duration (s) : partie chronométrée ; sinon partie libre jusqu'au game over.
 * onLines(n) : à chaque pose qui efface des lignes. onEnd({score, lines, sec}) : fin de partie.
 */
export default function Blocs({ duration = null, onLines, onEnd, best = 0, autoStart = false }) {
  const canvas = useRef(null), nextCv = useRef(null), game = useRef(null);
  const cb = useRef({ onLines, onEnd });
  cb.current = { onLines, onEnd };
  const [running, setRunning] = useState(autoStart);
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1, left: duration });
  const [over, setOver] = useState(null);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    if (!running) return;
    const g = (game.current = createGame(Date.now()));
    const ctx = canvas.current.getContext("2d"), nctx = nextCv.current.getContext("2d");
    const t0 = performance.now();
    let last = t0, acc = 0, raf, done = false;

    const draw = () => {
      ctx.fillStyle = "#1a1c2c";
      ctx.fillRect(0, 0, W * CELL, H * CELL);
      ctx.fillStyle = "#262b44";
      for (let x = 1; x < W; x++) ctx.fillRect(x * CELL, 0, 1, H * CELL);
      for (let y = 1; y < H; y++) ctx.fillRect(0, y * CELL, W * CELL, 1);
      g.grid.forEach((row, y) => row.forEach((c, x) => c && drawCell(ctx, x, y, COLORS[c])));
      if (!g.over) {
        cellsOf(ghostOf(g)).forEach(([x, y]) => y >= 0 && drawCell(ctx, x, y, COLORS[g.piece.t], 0.22));
        cellsOf(g.piece).forEach(([x, y]) => y >= 0 && drawCell(ctx, x, y, COLORS[g.piece.t]));
      }
      nctx.fillStyle = "#1a1c2c";
      nctx.fillRect(0, 0, 4 * CELL, 4 * CELL);
      const cells = SHAPES[g.next][0];
      const off = g.next === "I" ? 0 : g.next === "O" ? 1 : 0.5;
      cells.forEach(([x, y]) => drawCell(nctx, x + off, y + 1, COLORS[g.next]));
    };

    const after = (res) => {
      if (res.cleared) {
        cb.current.onLines?.(res.cleared);
        setFlash((f) => f + 1);
        navigator.vibrate?.(res.cleared >= 4 ? [30, 40, 60] : 30);
      }
    };

    const finish = () => {
      if (done) return;
      done = true;
      const sec = Math.round((performance.now() - t0) / 1000);
      setOver({ score: g.score, lines: g.lines, sec, gameOver: g.over });
      setRunning(false);
      cb.current.onEnd?.({ score: g.score, lines: g.lines, sec });
    };

    const loop = (now) => {
      acc += now - last;
      last = now;
      while (acc >= gravityMs(g.level)) {
        acc -= gravityMs(g.level);
        after(tick(g));
      }
      draw();
      const left = duration ? Math.max(0, duration - (now - t0) / 1000) : null;
      setHud((h) => (h.score !== g.score || h.lines !== g.lines || h.level !== g.level || Math.ceil(h.left ?? 0) !== Math.ceil(left ?? 0) ? { score: g.score, lines: g.lines, level: g.level, left } : h));
      if (g.over || (duration && left <= 0)) { finish(); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // contrôles : boutons (data-act), glissements et touches
    const act = (a) => {
      if (done || g.over) return;
      if (a === "l") move(g, -1);
      if (a === "r") move(g, 1);
      if (a === "rot") rotate(g, 1);
      if (a === "down") { after(tick(g, true)); acc = 0; }
      if (a === "drop") after(hardDrop(g));
      draw();
    };
    game.current.act = act;
    const onKey = (e) => {
      const m = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "rot", ArrowDown: "down", " ": "drop" }[e.key];
      if (m) { e.preventDefault(); act(m); }
    };
    addEventListener("keydown", onKey);
    let sx = 0, sy = 0, st = 0, movedX = 0;
    const el = canvas.current;
    const ts = (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = performance.now(); movedX = 0; };
    const tm = (e) => {
      e.preventDefault();
      const t = e.touches[0], dx = t.clientX - sx - movedX * 28;
      if (Math.abs(dx) >= 28) { const d = Math.sign(dx); act(d < 0 ? "l" : "r"); movedX += d; }
    };
    const te = (e) => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy, dt = performance.now() - st;
      if (dy > 60 && Math.abs(dy) > Math.abs(dx)) act("drop");
      else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 300) act("rot");
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("keydown", onKey);
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
    };
  }, [running, duration]);

  const press = (a) => (e) => { e.preventDefault(); game.current?.act?.(a); };

  return (
    <div className="blocs">
      <div className="blocs-top">
        <div><span className="label">Score</span><b>{hud.score}</b></div>
        <div><span className="label">Lignes</span><b>{hud.lines}</b></div>
        {duration ? <div><span className="label">Temps</span><b>{Math.floor((hud.left ?? 0) / 60)}:{pad(Math.ceil(hud.left ?? 0) % 60)}</b></div> : <div><span className="label">Record</span><b>{Math.max(best, hud.score)}</b></div>}
        <div className="blocs-next"><span className="label">Suivante</span><canvas ref={nextCv} width={4 * CELL} height={4 * CELL} /></div>
      </div>
      <div className={`blocs-board${flash % 2 ? " flash-a" : flash ? " flash-b" : ""}`}>
        <canvas ref={canvas} width={W * CELL} height={H * CELL} aria-label="Plateau du jeu de blocs" />
        {!running && (
          <div className="blocs-overlay">
            {over ? (
              <>
                <p className="px-title">{over.gameOver ? "GAME OVER" : "TEMPS !"}</p>
                <p>{over.score} points · {over.lines} lignes</p>
                {!duration && over.score > best && best > 0 && <p className="px-gold">Nouveau record !</p>}
              </>
            ) : <p className="px-title">BLOCS</p>}
            {!duration && <button className="btn green" type="button" onClick={() => { setOver(null); setRunning(true); }}>{over ? "Rejouer" : "Jouer"}</button>}
            {duration && !over && <button className="btn green" type="button" onClick={() => setRunning(true)}>Jouer</button>}
          </div>
        )}
      </div>
      <div className="blocs-pad">
        <button type="button" aria-label="Gauche" onPointerDown={press("l")}>◀</button>
        <button type="button" aria-label="Tourner" onPointerDown={press("rot")}>⟳</button>
        <button type="button" aria-label="Droite" onPointerDown={press("r")}>▶</button>
        <button type="button" aria-label="Descendre" onPointerDown={press("down")}>▼</button>
        <button type="button" aria-label="Lâcher" onPointerDown={press("drop")}>⤓</button>
      </div>
      <p className="tip">Glisse sur le plateau pour déplacer, touche pour tourner, glisse vers le bas pour lâcher.</p>
    </div>
  );
}
