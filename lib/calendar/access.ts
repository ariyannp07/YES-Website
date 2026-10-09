import "server-only";
import type { NextRequest } from "next/server";
import { authConfig, cookieName } from "./config";
import { normalizeEmail, readToken } from "./tokens";
import { isWhitelisted, guestEventIds } from "./backend";

export type AccessResult =
  | { allowed: true; email: string; role: "member" | "guest"; eventIds: string[] }
  | { allowed: false; status: 401 | 403 | 503 };

export async function calendarIdentity(
  request: NextRequest,
): Promise<{ allowed: true; email: string } | { allowed: false; status: 401 | 503 }> {
  const token = request.cookies.get(cookieName("session"))?.value;
  if (!token) return { allowed: false, status: 401 };
  try {
    const session = await readToken(token, authConfig().secret, "session");
    const email = normalizeEmail(session?.email);
    if (!session || !email || typeof session.sub !== "string" || !session.sub)
      return { allowed: false, status: 401 };
    return { allowed: true, email };
  } catch {
    return { allowed: false, status: 503 };
  }
}

export async function calendarAccessForEmail(email: string): Promise<AccessResult> {
  try {
    if (await isWhitelisted(email)) return { allowed: true, email, role: "member", eventIds: [] };
    const eventIds = await guestEventIds(email);
    return eventIds.length
      ? { allowed: true, email, role: "guest", eventIds }
      : { allowed: false, status: 403 };
  } catch {
    // Never log provider bodies, cookies, emails, or tokens.
    console.error("[YES calendar] Access verification unavailable.");
    return { allowed: false, status: 503 };
  }
}

export async function calendarAccess(request: NextRequest): Promise<AccessResult> {
  const identity = await calendarIdentity(request);
  return identity.allowed ? calendarAccessForEmail(identity.email) : identity;
}
