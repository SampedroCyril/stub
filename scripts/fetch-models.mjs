// Télécharge les modèles de détection de posture dans public/models (optionnel).
// Sans eux, l'app les charge directement depuis les serveurs de Google au premier usage.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public/models");
const MODELS = {
  lite: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
};
mkdirSync(dir, { recursive: true });
for (const [name, url] of Object.entries(MODELS)) {
  const out = join(dir, `pose_landmarker_${name}.task`);
  if (existsSync(out)) { console.log(`✓ ${name} déjà présent`); continue; }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name} : HTTP ${res.status}`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${name} → public/models`);
}
