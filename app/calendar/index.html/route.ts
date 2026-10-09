import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { calendarSnapshot, bootstrapJSON } from "@/lib/calendar/snapshot";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const started = performance.now();
  const { access, payload } = await calendarSnapshot(request);
  if (!access.allowed) {
    const target = new URL("/calendar/sign-in", request.url);
    if (access.status !== 401)
      target.searchParams.set(
        "error",
        access.status === 403 ? "denied" : "unavailable",
      );
    const response = NextResponse.redirect(target, 303);
    Object.entries(PRIVATE_HEADERS).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    return response;
  }
  const html = await readFile(
    path.join(process.cwd(), "content/calendar/index.html"),
    "utf8",
  );
  const initialData = `<script id="calendar-bootstrap" type="application/json">${bootstrapJSON(payload || { error: "calendar_unavailable" })}</script>`;
  return new Response(html.replace("<!-- CALENDAR_BOOTSTRAP -->", initialData), {
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Server-Timing": `calendar;dur=${Math.round(performance.now() - started)}`,
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
