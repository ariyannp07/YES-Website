import type { NextRequest } from "next/server";
import { calendarAccess } from "@/lib/calendar/access";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";
import { networkBrowserKey } from "@/lib/opportunities/browser-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await calendarAccess(request);
  if (!access.allowed || access.role !== "member") {
    // Public pages can probe quietly without downloading any member data.
    return new Response(null, {
      status: !access.allowed && access.status === 503 ? 503 : 204,
      headers: PRIVATE_HEADERS,
    });
  }
  return Response.json({ key: networkBrowserKey(request) }, { headers: PRIVATE_HEADERS });
}
