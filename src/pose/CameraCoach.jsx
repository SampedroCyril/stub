import { useEffect, useRef, useState } from "react";
import { EX } from "../data/exercises.js";
import { createCounter, CONNECTIONS } from "./counters.js";

const PLACEMENT = {
  profil: "Pose le téléphone au sol à 2-3 m, de profil : la caméra doit voir tout ton corps.",
  face: "Pose le téléphone au sol à 2-3 m, face à toi : la caméra doit voir tout ton corps.",
};

function beep(ctxRef, freq = 880, ms = 90) {
  try {
    const ctx = (ctxRef.current ||= new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  } catch { /* son indisponible */ }
}

function cameraError(e) {
  if (!window.isSecureContext) return "La caméra demande une connexion HTTPS. Ouvre l'app depuis son adresse https://.";
  if (e?.name === "NotAllowedError") return "Accès à la caméra refusé. Autorise-le dans les réglages du navigateur pour ce site, puis réessaie.";
  if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") return "Aucune caméra disponible sur cet appareil.";
  if (e?.name === "NotReadableError") return "La caméra est déjà utilisée par une autre app. Ferme-la et réessaie.";
  return "Impossible de démarrer la caméra.";
}

/**
 * Coach caméra plein écran.
 * target : objectif en reps, ou en secondes pour les exos chronométrés (déjà multiplié par 2 si « par côté »).
 * onDone({count, sec}) : résultat mesuré.
 */
export default function CameraCoach({ exId, target, model = "lite", sound = true, onDone, onClose }) {
  const x = EX[exId];
  const timed = x.u === "s";
  const videoRef = useRef(null), canvasRef = useRef(null), audioRef = useRef(null);
  const [facing, setFacing] = useState("user");
  const [phase, setPhase] = useState("loading"); // loading | wait | countdown | run | error
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [sec, setSec] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [ready, setReady] = useState(false);
  const [cd, setCd] = useState(3);
  const live = useRef({ count: 0, sec: 0, goal: false });

  useEffect(() => {
    let stream, raf = 0, vfc = 0, stopped = false, wake = null;
    let landmarker, counter = null, countdownEnd = 0, lastUi = 0;
    const video = videoRef.current, canvas = canvasRef.current, g = canvas.getContext("2d");

    const draw = (lms, ok) => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      g.clearRect(0, 0, canvas.width, canvas.height);
      if (!lms) return;
      const W = canvas.width, H = canvas.height;
      g.lineWidth = Math.max(3, W / 160);
      g.lineCap = "round";
      g.strokeStyle = ok ? "rgba(60,201,135,.95)" : "rgba(255,255,255,.75)";
      CONNECTIONS.forEach(([a, b]) => {
        if ((lms[a].visibility ?? 1) < 0.4 || (lms[b].visibility ?? 1) < 0.4) return;
        g.beginPath();
        g.moveTo(lms[a].x * W, lms[a].y * H);
        g.lineTo(lms[b].x * W, lms[b].y * H);
        g.stroke();
      });
      g.fillStyle = "#fff";
      [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((i) => {
        if ((lms[i].visibility ?? 1) < 0.4) return;
        g.beginPath();
        g.arc(lms[i].x * W, lms[i].y * H, Math.max(4, W / 120), 0, Math.PI * 2);
        g.fill();
      });
    };

    const frame = () => {
      if (stopped) return;
      const now = performance.now();
      if (video.readyState >= 2 && video.videoWidth) {
        const res = landmarker.detectForVideo(video, now);
        const lms = res.landmarks?.[0] || null;
        const seen = !!lms && [11, 12, 23, 24].some((i) => (lms[i].visibility ?? 0) > 0.5);
        if (!counter) {
          // attente que la personne soit dans le cadre, puis compte à rebours de 3 s
          if (seen && !countdownEnd) { countdownEnd = now + 3000; setPhase("countdown"); }
          if (!seen && countdownEnd) { countdownEnd = 0; setPhase("wait"); }
          if (countdownEnd) {
            const left = Math.ceil((countdownEnd - now) / 1000);
            setCd(left);
            if (now >= countdownEnd) { counter = createCounter(exId); setPhase("run"); if (sound) beep(audioRef, 660, 140); }
          }
          draw(lms, false);
        } else {
          const s = counter.update(lms, now, video.videoWidth / video.videoHeight);
          draw(lms, s.ready && (s.active || !timed));
          if (s.count > live.current.count) {
            if (sound) beep(audioRef);
            navigator.vibrate?.(35);
          }
          live.current.count = s.count;
          live.current.sec = s.holdMs / 1000;
          const reached = timed ? live.current.sec >= target : s.count >= target;
          if (reached && !live.current.goal) {
            live.current.goal = true;
            if (sound) { beep(audioRef, 988, 120); setTimeout(() => beep(audioRef, 1319, 180), 140); }
          }
          if (now - lastUi > 100) {
            lastUi = now;
            setCount(s.count);
            setSec(Math.floor(s.holdMs / 1000));
            setFeedback(s.feedback);
            setReady(s.ready);
          }
        }
      }
      if (video.requestVideoFrameCallback) vfc = video.requestVideoFrameCallback(frame);
      else raf = requestAnimationFrame(frame);
    };

    (async () => {
      let st;
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no media"), { name: "NotFoundError" });
        st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch (e) {
        if (!stopped) { setError(cameraError(e)); setPhase("error"); }
        return;
      }
      if (stopped) { st.getTracks().forEach((t) => t.stop()); return; }
      stream = st;
      video.srcObject = st;
      try { await video.play(); } catch { /* lecture relancée au premier geste */ }
      try {
        landmarker = await import("./engine.js").then((m) => m.getLandmarker(model));
      } catch {
        if (!stopped) { setError("Impossible de charger le modèle de détection. Vérifie ta connexion et réessaie."); setPhase("error"); }
        return;
      }
      if (stopped) return;
      try { wake = await navigator.wakeLock?.request("screen"); } catch { /* optionnel */ }
      setPhase("wait");
      frame();
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      if (vfc && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(vfc);
      stream?.getTracks().forEach((t) => t.stop());
      wake?.release?.().catch(() => {});
    };
  }, [exId, facing, model, sound, target, timed]);

  const reached = timed ? sec >= target : count >= target;
  const value = timed ? sec : count;
  const unit = timed ? "s" : "";
  const finish = () => onDone({ count: live.current.count, sec: Math.round(live.current.sec) });

  return (
    <div className="coach" role="dialog" aria-modal="true" aria-label={`Coach caméra : ${x.n}`}>
      <div className={`coach-stage${facing === "user" ? " mirror" : ""}`}>
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
      </div>

      <header className="coach-top">
        <div>
          <span className="label">Coach caméra</span>
          <strong>{x.n}</strong>
        </div>
        <button className="coach-icon" type="button" onClick={() => { live.current = { count: 0, sec: 0, goal: false }; setCount(0); setSec(0); setPhase("loading"); setFacing((f) => (f === "user" ? "environment" : "user")); }} aria-label="Changer de caméra">⇄</button>
      </header>

      <div className="coach-center">
        {phase === "loading" && <p className="coach-msg">Chargement de la caméra et du modèle…<br /><small>Environ 5 Mo la première fois, ensuite c'est en cache.</small></p>}
        {phase === "wait" && <p className="coach-msg">{PLACEMENT[x.cam] || PLACEMENT.profil}</p>}
        {phase === "countdown" && <p className="coach-cd" aria-live="assertive">{cd}</p>}
        {phase === "error" && <p className="coach-msg err">{error}</p>}
      </div>

      {phase === "run" && (
        <div className="coach-hud">
          <div className={`coach-count${reached ? " goal" : ""}`}>
            <b>{value}</b><span>/ {target}{unit}</span>
          </div>
          <p className={`coach-fb${!ready ? " warn" : feedback ? " tip" : ""}`} aria-live="polite">
            {reached ? "Objectif atteint ! Tu peux valider ou continuer." : feedback || (timed ? (ready ? "Tiens la position" : "") : "C'est bon, continue")}
          </p>
          {timed && x.t === "cardio" && <p className="coach-sub">{count} mouvements · le chrono avance tant que tu bouges</p>}
        </div>
      )}

      <footer className="coach-foot">
        <button className="btn" type="button" onClick={onClose}>Annuler</button>
        <button className={`btn ${reached ? "green" : "blue"}`} type="button" onClick={finish} disabled={phase !== "run" || value === 0}>
          Valider {phase === "run" ? `(${value}${unit})` : ""}
        </button>
      </footer>
      <p className="coach-privacy">La vidéo reste sur ton téléphone : rien n'est envoyé nulle part.</p>
    </div>
  );
}
