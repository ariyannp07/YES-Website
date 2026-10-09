import type { NextRequest } from "next/server";
import { calendarSnapshot } from "@/lib/calendar/snapshot";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return new Response(null, { status: 403, headers: PRIVATE_HEADERS });
  // Anonymous visitors do no upstream work. This response never contains data.
  await calendarSnapshot(request);
  return new Response(null, { status: 204, headers: PRIVATE_HEADERS });
}
