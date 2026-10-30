import type { NextRequest } from "next/server";
import { calendarAccess } from "@/lib/calendar/access";
import { calendarBackend } from "@/lib/calendar/backend";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";
import { projectNetwork } from "@/lib/opportunities/network";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const access = await calendarAccess(request);
  if (!access.allowed || access.role !== "member") return Response.json({ error: "access_required" }, {
    status: access.allowed ? 403 : access.status, headers: PRIVATE_HEADERS,
  });
  try {
    // Read publication status afresh; never fall back to a public/static roster.
    return Response.json(projectNetwork(await calendarBackend("network", access.email)), { headers: PRIVATE_HEADERS });
  } catch {
    return Response.json({ error: "network_unavailable" }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
