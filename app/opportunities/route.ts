import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { calendarSnapshot, bootstrapJSON } from "@/lib/calendar/snapshot";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";
import { opportunitiesReturnPath } from "@/lib/opportunities/routes";
import { networkBrowserKey } from "@/lib/opportunities/browser-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const started = performance.now();
  const { access, payload } = await calendarSnapshot(request);
  if (!access.allowed) {
    const target = new URL("/opportunities/sign-in", request.url);
    const returnTo = opportunitiesReturnPath(request.nextUrl.pathname + request.nextUrl.search);
    if (returnTo !== "/opportunities") target.searchParams.set("returnTo", returnTo);
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
  if (access.role !== "member" && request.nextUrl.searchParams.get("section") === "network") {
    const target = new URL("/opportunities", request.url);
    return new Response(null, { status: 303, headers: { ...PRIVATE_HEADERS, Location: target.href } });
  }
  const html = await readFile(
    path.join(process.cwd(), "content/calendar/index.html"),
    "utf8",
  );
  const initialData = `<script id="calendar-bootstrap" type="application/json">${bootstrapJSON(payload || { error: "calendar_unavailable" })}</script>`;
  const networkKey = access.role === "member" ? networkBrowserKey(request) : "";
  return new Response(html.replace("<!-- CALENDAR_BOOTSTRAP -->", initialData).replace('<html lang="en">', `<html lang="en" data-network-access="${access.role === "member"}" data-network-key="${networkKey}">`), {
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
