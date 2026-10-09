import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { calendarAccess } from "@/lib/calendar/access";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await calendarAccess(request);
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
  return new Response(html, {
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
