import { NextResponse, type NextRequest } from "next/server";
import {
  authConfig,
  backendConfig,
  PRIVATE_HEADERS,
} from "@/lib/calendar/config";
import { calendarAccess } from "@/lib/calendar/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await calendarAccess(request);
  if (access.allowed) {
    const response = NextResponse.redirect(
      new URL("/calendar/index.html", request.url),
      303,
    );
    Object.entries(PRIVATE_HEADERS).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    return response;
  }
  let ready = true;
  try {
    authConfig();
    backendConfig();
  } catch {
    ready = false;
  }
  const error = request.nextUrl.searchParams.get("error");
  const denied = ready && (error === "denied" || access.status === 403);
  const message = !ready
    ? "Sign-in is currently unavailable."
    : denied
      ? "This email isn’t authorized. Sign in with an approved Google account."
      : error === "unavailable" || access.status === 503
        ? "Unable to verify access. Try again shortly."
        : error === "signin"
          ? "Sign-in failed. Please try again."
          : "Sign in with your approved Google account.";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Member calendar — YES</title><link rel="stylesheet" href="/calendar/styles.css"></head><body><div class="calendar-shell"><header class="masthead"><a class="wordmark" aria-label="YES home" href="/" target="_top"><span class="yes-logo" aria-hidden="true"><span class="yes-logo-bars"></span><span class="yes-logo-center"></span></span></a><span class="masthead-note">Member calendar</span></header><main class="login-panel"><h1>Calendar</h1><p class="login-message${denied ? " login-error" : ""}" role="${denied ? "alert" : "status"}">${message}</p>${ready ? '<a class="rsvp-link" href="/api/calendar/auth/start" target="_top">Continue with Google <span aria-hidden="true">↗</span></a>' : ""}<p class="detail-audience">For access, contact the YES board.</p></main></div></body></html>`;
  return new Response(html, {
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
