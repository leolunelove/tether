declare const __TETHER_API_ORIGIN__: string;
declare const __TETHER_BASE__: string;
export const API_ORIGIN = typeof __TETHER_API_ORIGIN__ === "undefined" ? "" : __TETHER_API_ORIGIN__;
export const ASSET_BASE = typeof __TETHER_BASE__ === "undefined" ? "/" : __TETHER_BASE__;
const SESSION_KEY = "tether.participant-session.v1";
const OPERATION_KEY = "tether.onboarding.v1";
let memorySession = "";
export function clearSession() { memorySession = ""; try { localStorage.removeItem(SESSION_KEY); } catch {} }
export function saveSessionToken(value: string) {
  if (!API_ORIGIN || !/^[a-zA-Z0-9-]{60,80}$/.test(value)) return;
  memorySession = value;
  try { localStorage.setItem(SESSION_KEY, value); } catch { throw new Error("Browser storage is unavailable. Keep this tab open and save your recovery code in Space settings."); }
}
// Persist the credential BEFORE the server consumes an invitation. Retries reuse it.
export function onboardingCredential() {
  const saved = localStorage.getItem(OPERATION_KEY);
  if (saved && /^[a-zA-Z0-9-]{60,80}$/.test(saved)) return saved;
  const value = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem(OPERATION_KEY, value);
  if (localStorage.getItem(OPERATION_KEY) !== value) throw new Error("Enable browser storage before joining a space.");
  return value;
}
export function finishOnboarding() { localStorage.removeItem(OPERATION_KEY); }
export function pendingCredential() { try { return localStorage.getItem(OPERATION_KEY); } catch { return null; } }
export async function apiResponse(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (API_ORIGIN && !headers.has("Authorization")) {
    let session = memorySession;
    try { session = localStorage.getItem(SESSION_KEY) || session; } catch {}
    if (session) headers.set("Authorization", `Bearer ${session}`);
  }
  try {
    return await fetch(API_ORIGIN + path, { ...options, headers, signal: options.signal || AbortSignal.timeout(30000), credentials: API_ORIGIN ? "omit" : "same-origin" });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) throw new Error("The connection timed out. Your draft stays in this tab. Try again to check whether it went through.");
    throw error;
  }
}
