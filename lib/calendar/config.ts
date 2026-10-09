import "server-only";

export function authConfig() {
  const clientId = process.env.CALENDAR_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.CALENDAR_GOOGLE_CLIENT_SECRET;
  const secret = process.env.CALENDAR_SESSION_SECRET;
  const originValue =
    process.env.CALENDAR_ORIGIN ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  if (
    !clientId ||
    !clientSecret ||
    !secret ||
    secret.length < 32 ||
    !originValue
  ) {
    throw new Error("Calendar authentication is not configured.");
  }
  const url = new URL(originValue);
  const local =
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (
    (!local && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid calendar origin.");
  }
  return {
    clientId,
    clientSecret,
    secret,
    origin: url.origin,
    secure: url.protocol === "https:",
    callback: `${url.origin}/api/calendar/auth/callback`,
  };
}

export function backendConfig() {
  const url = process.env.CALENDAR_APPS_SCRIPT_URL;
  const secret = process.env.CALENDAR_BACKEND_SECRET;
  if (!url || !secret || secret.length < 32)
    throw new Error("Calendar backend is not configured.");
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "script.google.com" ||
    !/^\/macros\/s\/[^/]+\/exec$/.test(parsed.pathname) ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Invalid Apps Script deployment URL.");
  }
  return { url, secret };
}

export function cookieName(kind: "session" | "oauth") {
  return `${process.env.NODE_ENV === "production" ? "__Host-" : ""}yes_calendar_${kind}`;
}

export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
