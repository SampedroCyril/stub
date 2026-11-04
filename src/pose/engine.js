/**
 * Chargement de MediaPipe Pose Landmarker (chargé à la demande, code séparé du reste de l'app).
 * - Le runtime WebAssembly est servi par l'app elle-même (public/mediapipe, copié depuis node_modules).
 * - Le modèle est cherché dans public/models (téléchargé au build par la CI), sinon chez Google.
 * Aucune image ne quitte l'appareil : la détection tourne dans le navigateur.
 */
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const REMOTE = {
  lite: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
};

const base = () => new URL(import.meta.env.BASE_URL, location.href).href;
const cache = {};

async function localModel(model) {
  const url = `${base()}models/pose_landmarker_${model}.task`;
  try {
    const r = await fetch(url, { method: "HEAD" });
    const type = r.headers.get("content-type") || "";
    return r.ok && !type.includes("text/html") ? url : null;
  } catch {
    return null;
  }
}

export function getLandmarker(model = "lite") {
  if (!cache[model]) {
    cache[model] = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(`${base()}mediapipe`);
      const path = (await localModel(model)) || REMOTE[model];
      const make = (delegate) =>
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: path, delegate },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      try {
        return await make("GPU");
      } catch {
        return await make("CPU");
      }
    })();
    cache[model].catch(() => delete cache[model]);
  }
  return cache[model];
}
