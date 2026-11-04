/** Installation sur l'écran d'accueil (PWA). */

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** Chrome / Edge / Android : on garde l'événement pour proposer notre propre bouton « Installer ». */
export function captureInstallPrompt() {
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; notify(); });
  addEventListener("appinstalled", () => { deferred = null; notify(); });
}
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const canPrompt = () => !!deferred;

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome === "accepted";
}

export const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

export function platform() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-other" : "ios-safari";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}
