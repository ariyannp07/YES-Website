import type { NextRequest } from "next/server";
import { calendarAccess } from "@/lib/calendar/access";
import { calendarBackend } from "@/lib/calendar/backend";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";
import { projectNetwork } from "@/lib/opportunities/network";
import { networkBrowserKey } from "@/lib/opportunities/browser-session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const access = await calendarAccess(request);
  if (!access.allowed || access.role !== "member") return Response.json({ error: "access_required" }, {
    status: access.allowed ? 403 : access.status, headers: PRIVATE_HEADERS,
  });
  try {
    // Read publication status afresh; never fall back to a public/static roster.
    const data = projectNetwork(await calendarBackend("network", access.email));
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    let offset = 0;
    // Stream larger rosters without the hosting platform's buffered-response cap.
    // Authentication and publication checks finish before any bytes are emitted.
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= bytes.length) { controller.close(); return; }
        controller.enqueue(bytes.subarray(offset, offset + 65536));
        offset += 65536;
      },
    });
    return new Response(body, { headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "X-YES-Network-Key": networkBrowserKey(request),
    } });
  } catch {
    return Response.json({ error: "network_unavailable" }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
