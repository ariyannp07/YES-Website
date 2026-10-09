import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { calendarAccess } from "@/lib/calendar/access";
import { calendarBackend, CalendarBackendError } from "@/lib/calendar/backend";
import { authConfig, PRIVATE_HEADERS } from "@/lib/calendar/config";
import { invitationToken } from "@/lib/calendar/invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const respond = (data: object, status = 200) => Response.json(data, { status, headers: PRIVATE_HEADERS });
  try {
    const config = authConfig();
    if (request.headers.get("origin") !== config.origin) return respond({ error: "forbidden" }, 403);
    const access = await calendarAccess(request);
    if (!access.allowed) return respond({ error: "access_required" }, access.status);
    if (access.role !== "member" || (process.env.CALENDAR_WHITELIST_PROVIDER || "sheet") !== "sheet")
      return respond({ error: "members_only" }, 403);
    if (Number(request.headers.get("content-length")) > 2048) return respond({ error: "invalid_event" }, 400);
    const raw = await request.text();
    if (raw.length > 2048) return respond({ error: "invalid_event" }, 400);
    let body;
    try { body = JSON.parse(raw); } catch { return respond({ error: "invalid_event" }, 400); }
    if (typeof body?.eventId !== "string" || !body.eventId.trim() || body.eventId.length > 200)
      return respond({ error: "invalid_event" }, 400);
    const result = await calendarBackend("invite_create", {
      email: access.email, eventId: body.eventId, id: randomBytes(16).toString("hex"),
    });
    const url = new URL("/calendar/invite", config.origin);
    url.searchParams.set("token", invitationToken(result.id));
    return respond({ url: url.href, claimed: result.claimed === true });
  } catch (error) {
    if (error instanceof CalendarBackendError && ["event_unavailable", "invite_disabled", "members_only"].includes(error.code))
      return respond({ error: error.code }, 409);
    return respond({ error: "invite_unavailable" }, 503);
  }
}
