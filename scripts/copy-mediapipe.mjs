// Copie le runtime WebAssembly de MediaPipe dans public/, pour que l'app le serve elle-même.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const dst = join(root, "public/mediapipe");
if (!existsSync(src)) {
  console.error("MediaPipe introuvable : lance `npm install` d'abord.");
  process.exit(1);
}
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });
console.log("MediaPipe wasm → public/mediapipe");
