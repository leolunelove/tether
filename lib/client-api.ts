declare const __TETHER_API_ORIGIN__: string;
declare const __TETHER_BASE__: string;
export const API_ORIGIN = typeof __TETHER_API_ORIGIN__ === "undefined" ? "" : __TETHER_API_ORIGIN__;
export const ASSET_BASE = typeof __TETHER_BASE__ === "undefined" ? "/" : __TETHER_BASE__;
const SESSION_KEY = "tether.participant-session.v1";
let memorySession = "";
export function saveSessionToken(value: string) {
  if (!API_ORIGIN || !/^[a-zA-Z0-9-]{60,80}$/.test(value)) return;
  memorySession = value;
  try { localStorage.setItem(SESSION_KEY, value); } catch { /* This tab can still use its session. */ }
}
export function apiResponse(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (API_ORIGIN) {
    let session = memorySession;
    try { session = localStorage.getItem(SESSION_KEY) || session; } catch { /* Storage may be disabled. */ }
    if (session) headers.set("Authorization", `Bearer ${session}`);
  }
  return fetch(API_ORIGIN + path, { ...options, headers, credentials: API_ORIGIN ? "omit" : "same-origin" });
}
