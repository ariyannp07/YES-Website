import type { NextRequest } from "next/server";
import { calendarSnapshot } from "@/lib/calendar/snapshot";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { access, payload } = await calendarSnapshot(request);
  if (!access.allowed)
    return Response.json(
      { error: access.status === 503 ? "unavailable" : "access_required" },
      { status: access.status, headers: PRIVATE_HEADERS },
    );
  if (payload) {
    return Response.json(payload, {
      headers: PRIVATE_HEADERS,
    });
  } else {
    console.error("[YES calendar] Events unavailable.");
    return Response.json(
      { error: "calendar_unavailable" },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}
