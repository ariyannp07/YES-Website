import "server-only";
import type { NextRequest } from "next/server";
import { calendarIdentity, calendarAccessForEmail } from "./access";
import { isJobPosting } from "./backend";
import { publishedEvents } from "./event-cache";

export async function calendarSnapshot(request: NextRequest) {
  const identity = await calendarIdentity(request);
  if (!identity.allowed) return { access: identity, payload: null };
  // Only a verified session can start upstream work. Data stays on the server
  // until a fresh whitelist/guest check succeeds, even on a warm cache hit.
  const [access, snapshot] = await Promise.all([
    calendarAccessForEmail(identity.email),
    Promise.resolve().then(publishedEvents).catch(() => null),
  ]);
  if (!access.allowed || !snapshot) return { access, payload: null };
  const events = access.role === "guest" ? snapshot.events.filter(event =>
    !isJobPosting(event) && access.eventIds.includes(String(event.id)) &&
    snapshot.events.filter(other => other.id === event.id).length === 1,
  ) : snapshot.events;
  return { access, payload: {
    timezone: snapshot.timezone, events,
    canInvite: access.role === "member" && (process.env.CALENDAR_WHITELIST_PROVIDER || "sheet") === "sheet",
  } };
}

export function bootstrapJSON(payload: unknown) {
  return JSON.stringify(payload).replace(/[<>&\u2028\u2029]/g,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
