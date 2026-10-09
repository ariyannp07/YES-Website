import type { NextRequest } from "next/server";
import { calendarAccess } from "@/lib/calendar/access";
import { calendarBackend, projectEvents } from "@/lib/calendar/backend";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await calendarAccess(request);
  if (!access.allowed)
    return Response.json(
      { error: access.status === 503 ? "unavailable" : "access_required" },
      { status: access.status, headers: PRIVATE_HEADERS },
    );
  try {
    const payload = projectEvents(await calendarBackend("events"));
    if (access.role === "guest") payload.events = payload.events.filter(event =>
      access.eventIds.includes(String(event.id)) &&
      payload.events.filter(other => other.id === event.id).length === 1,
    );
    return Response.json({ ...payload, canInvite: access.role === "member" &&
      (process.env.CALENDAR_WHITELIST_PROVIDER || "sheet") === "sheet" }, {
      headers: PRIVATE_HEADERS,
    });
  } catch {
    console.error("[YES calendar] Events unavailable.");
    return Response.json(
      { error: "calendar_unavailable" },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}
